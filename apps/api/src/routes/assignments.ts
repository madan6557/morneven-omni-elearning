import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();
const orderItems = (moduleId: string) => prisma.assignment.findMany({ where: { moduleId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });

r.get("/course/:courseId", requireAuth as any, async (req: any, res) => {
  res.json(await prisma.assignment.findMany({ where: { courseId: req.params.courseId, ...(req.user.role === "MAHASISWA" ? { archived: false } : {}) }, include: { module: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }));
});

r.post("/", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const { courseId, moduleId, title, description, deadline } = req.body;
  if (!courseId || !moduleId || !title?.trim()) return res.status(400).json({ message: "courseId, moduleId, dan title wajib diisi." });
  const module = await prisma.module.findFirst({ where: { id: moduleId, courseId } });
  if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  const last = await prisma.assignment.findFirst({ where: { moduleId }, orderBy: { order: "desc" } });
  const item = await prisma.assignment.create({ data: { courseId, moduleId, order: (last?.order ?? 0) + 1, title: title.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null } });
  res.status(201).json(item);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  const { moduleId, title, description, deadline, archived } = req.body;
  if (moduleId) { const module = await prisma.module.findFirst({ where: { id: moduleId, courseId: existing.courseId } }); if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." }); }
  res.json(await prisma.assignment.update({ where: { id: req.params.id }, data: { moduleId: moduleId || null, title: title?.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null, ...(typeof archived === "boolean" ? { archived } : {}) } }));
});

r.patch("/:id/reorder", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const current = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!current?.moduleId) return res.status(400).json({ message: "Tugas harus memiliki modul." });
  const items = await orderItems(current.moduleId); const index = items.findIndex((item) => item.id === current.id); const target = index + (req.body.direction === "up" ? -1 : 1);
  if (target < 0 || target >= items.length) return res.json(current);
  await prisma.$transaction(async (tx) => { await tx.assignment.update({ where: { id: current.id }, data: { order: -1 } }); await tx.assignment.update({ where: { id: items[target].id }, data: { order: current.order } }); await tx.assignment.update({ where: { id: current.id }, data: { order: items[target].order } }); });
  res.json(await prisma.assignment.findUnique({ where: { id: current.id } }));
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const item = await prisma.assignment.findUnique({ where: { id: req.params.id } }); await prisma.assignment.delete({ where: { id: req.params.id } });
  if (item?.moduleId) { const rest = await orderItems(item.moduleId); await prisma.$transaction(rest.map((row, index) => prisma.assignment.update({ where: { id: row.id }, data: { order: index + 1 } }))); }
  res.json({ ok: true });
});

export default r;
