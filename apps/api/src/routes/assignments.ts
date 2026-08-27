import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

r.get("/course/:courseId", requireAuth as any, async (req: any, res) => {
  res.json(await prisma.assignment.findMany({ where: { courseId: req.params.courseId, ...(req.user.role === "MAHASISWA" ? { archived: false } : {}) }, include: { module: true }, orderBy: { deadline: "asc" } }));
});

r.post("/", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const { courseId, moduleId, title, description, deadline } = req.body;
  if (!courseId || !title?.trim()) return res.status(400).json({ message: "courseId dan title wajib diisi." });
  if (moduleId) {
    const module = await prisma.module.findFirst({ where: { id: moduleId, courseId } });
    if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  }
  const item = await prisma.assignment.create({ data: { courseId, moduleId: moduleId || null, title: title.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null } });
  res.status(201).json(item);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  const { moduleId, title, description, deadline, archived } = req.body;
  if (moduleId) {
    const module = await prisma.module.findFirst({ where: { id: moduleId, courseId: existing.courseId } });
    if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  }
  res.json(await prisma.assignment.update({ where: { id: req.params.id }, data: { moduleId: moduleId || null, title: title?.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null, ...(typeof archived === "boolean" ? { archived } : {}) } }));
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => { await prisma.assignment.delete({ where: { id: req.params.id } }); res.json({ ok: true }); });

export default r;
