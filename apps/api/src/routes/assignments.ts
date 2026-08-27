import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const uploadRoot = path.resolve(uploadDir);
const upload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`) }), limits: { fileSize: 25 * 1024 * 1024 } });
const localFile = (url?: string | null) => url?.startsWith("/uploads/") ? path.resolve(uploadRoot, url.slice("/uploads/".length)) : null;
const removeSubmissionFile = async (url?: string | null) => { const file = localFile(url); if (file && file.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(file)) await fs.promises.unlink(file); };
const orderItems = (moduleId: string) => prisma.assignment.findMany({ where: { moduleId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });

r.get("/course/:courseId", requireAuth as any, async (req: any, res) => {
  res.json(await prisma.assignment.findMany({ where: { courseId: req.params.courseId, ...(req.user.role === "MAHASISWA" ? { archived: false } : {}) }, include: { module: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }));
});

r.post("/", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const { courseId, moduleId, title, description, deadline } = req.body;
  if (!courseId || !moduleId || !title?.trim()) return res.status(400).json({ message: "courseId, moduleId, dan title wajib diisi." });
  const module = await prisma.module.findFirst({ where: { id: moduleId, courseId } });
  if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  const [last, assignmentContent, materialContent, quizContent] = await Promise.all([prisma.assignment.findFirst({ where: { moduleId }, orderBy: { order: "desc" } }), prisma.assignment.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.material.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.quiz.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } })]);
  const contentOrder = Math.max(assignmentContent?.contentOrder ?? 0, materialContent?.contentOrder ?? 0, quizContent?.contentOrder ?? 0) + 1;
  const item = await prisma.assignment.create({ data: { courseId, moduleId, order: (last?.order ?? 0) + 1, contentOrder, title: title.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null } });
  res.status(201).json(item);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  const { moduleId, title, description, deadline, archived } = req.body;
  if (!moduleId) return res.status(400).json({ message: "Tugas wajib berada di dalam modul." });
  const module = await prisma.module.findFirst({ where: { id: moduleId, courseId: existing.courseId } }); if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  res.json(await prisma.assignment.update({ where: { id: req.params.id }, data: { moduleId, title: title?.trim(), description: description || null, deadline: deadline ? new Date(deadline) : null, ...(typeof archived === "boolean" ? { archived } : {}) } }));
});

r.post("/:id/submit", requireAuth as any, upload.single("file"), async (req: any, res) => {
  if (req.user.role !== "MAHASISWA") return res.status(403).json({ message: "Hanya mahasiswa yang dapat mengumpulkan tugas." });
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!assignment || assignment.archived) return res.status(404).json({ message: "Tugas tidak tersedia." });
  if (assignment.deadline && assignment.deadline < new Date()) { if (req.file) await removeSubmissionFile(`/uploads/${req.file.filename}`); return res.status(403).json({ message: "Deadline tugas telah lewat." }); }
  const previous = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: req.user.id } } });
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : previous?.fileUrl || null;
  const submission = await prisma.assignmentSubmission.upsert({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: req.user.id } }, update: { note: req.body.note || null, fileUrl, fileName: req.file?.originalname || previous?.fileName || null, submittedAt: new Date(), score: null, feedback: null, gradedAt: null }, create: { assignmentId: assignment.id, userId: req.user.id, note: req.body.note || null, fileUrl, fileName: req.file?.originalname || null } });
  if (req.file && previous?.fileUrl && previous.fileUrl !== fileUrl) await removeSubmissionFile(previous.fileUrl);
  res.status(201).json(submission);
});

r.get("/:id/submissions", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  res.json(await prisma.assignmentSubmission.findMany({ where: { assignmentId: req.params.id }, include: { user: { select: { id: true, nim: true, name: true } } }, orderBy: { submittedAt: "desc" } }));
});

r.patch("/submissions/:submissionId", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const score = req.body.score === "" || req.body.score === null || req.body.score === undefined ? null : Number(req.body.score);
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return res.status(400).json({ message: "Nilai harus 0 sampai 100." });
  const item = await prisma.assignmentSubmission.update({ where: { id: req.params.submissionId }, data: { score, feedback: req.body.feedback || null, gradedAt: score === null ? null : new Date() } });
  res.json(item);
});

r.delete("/submissions/:submissionId", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const item = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId } });
  if (!item) return res.status(404).json({ message: "Pengumpulan tidak ditemukan." });
  await prisma.assignmentSubmission.delete({ where: { id: item.id } });
  await removeSubmissionFile(item.fileUrl);
  res.json({ ok: true });
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
