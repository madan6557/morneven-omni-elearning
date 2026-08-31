import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { denyIfNoCourseAccess } from "../lib/courseAccess.js";
import { notifyCourseStudents, notifyUsers } from "../lib/notifications.js";
import { CreateAssignmentSchema } from "@repo/shared";
import { contentPreview, getContentAvailability, unavailableContent } from "../lib/contentAvailability.js";

const r = Router();
const validateReorder = (req: any, res: any, next: any) => ["up", "down"].includes(req.body.direction) ? next() : res.status(400).json({ message: "direction harus bernilai up atau down." });
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const uploadRoot = path.resolve(uploadDir);
const allowedSubmissionTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"], ".doc": ["application/msword"], ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"], ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"], ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"], ".csv": ["text/csv", "application/csv"],
  ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"], ".gif": ["image/gif"], ".webp": ["image/webp"],
  ".mp4": ["video/mp4"], ".mov": ["video/quicktime"], ".webm": ["video/webm"], ".mp3": ["audio/mpeg"], ".wav": ["audio/wav", "audio/x-wav"]
};
const upload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`) }), limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const ext = path.extname(file.originalname).toLowerCase(); cb(null, Boolean(allowedSubmissionTypes[ext]?.includes(file.mimetype))); } });
const safeUpload = (req: any, res: any, next: any) => upload.single("file")(req, res, (error: any) => error ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Ukuran file maksimal 25 MB." : "Format file tidak diizinkan. Gunakan PDF, Office, TXT/CSV, gambar, audio, atau video." }) : next());
const localFile = (url?: string | null) => url?.startsWith("/uploads/") ? path.resolve(uploadRoot, url.slice("/uploads/".length)) : null;
const removeSubmissionFile = async (url?: string | null) => { const file = localFile(url); if (!file || !file.startsWith(`${uploadRoot}${path.sep}`) || !fs.existsSync(file)) return; const references = await prisma.assignmentSubmission.count({ where: { fileUrl: url } }); if (references <= 1) await fs.promises.unlink(file); };
const submissionOut = (item: any) => ({ ...item, fileUrl: item.fileUrl ? `/api/assignments/submissions/${item.id}/file` : null });
const orderItems = (moduleId: string) => prisma.assignment.findMany({ where: { moduleId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
r.use("/:id", requireAuth as any, async (req: any, res, next) => { const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id }, select: { courseId: true } }); if (assignment && await denyIfNoCourseAccess(req.user, assignment.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." }); next(); });

r.get("/course/:courseId", requireAuth as any, async (req: any, res) => {
  if (await denyIfNoCourseAccess(req.user, req.params.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const items = await prisma.assignment.findMany({ where: { courseId: req.params.courseId, ...(req.user.role === "MAHASISWA" ? { archived: false } : {}) }, include: { module: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  res.json(req.user.role === "MAHASISWA" ? items.map((item) => getContentAvailability(item) === "AVAILABLE" ? item : { ...contentPreview(item, "ASSIGNMENT"), deadline: item.deadline || null }) : items);
});

r.get("/:id", requireAuth as any, async (req: any, res) => { const item = await prisma.assignment.findUnique({ where: { id: req.params.id }, include: { module: true } }); if (!item || (item.archived && req.user.role === "MAHASISWA")) return res.status(404).json({ message: "Tugas tidak tersedia." }); if (req.user.role === "MAHASISWA" && getContentAvailability(item) !== "AVAILABLE") return unavailableContent(res, item, "ASSIGNMENT"); res.json(item); });

r.post("/", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const parsed = CreateAssignmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { courseId, moduleId, title, description, isOpen, availableFrom, availableUntil, deadline } = parsed.data;
  if (await denyIfNoCourseAccess(req.user, courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const module = await prisma.module.findFirst({ where: { id: moduleId, courseId } });
  if (!module) return res.status(400).json({ message: "Modul tidak berada pada matkul ini." });
  if (module.type === "UTS" || module.type === "UAS") return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." });
  const [last, assignmentContent, materialContent, quizContent] = await Promise.all([prisma.assignment.findFirst({ where: { moduleId }, orderBy: { order: "desc" } }), prisma.assignment.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.material.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.quiz.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } })]);
  const contentOrder = Math.max(assignmentContent?.contentOrder ?? 0, materialContent?.contentOrder ?? 0, quizContent?.contentOrder ?? 0) + 1;
  const item = await prisma.assignment.create({ data: { courseId, moduleId, order: (last?.order ?? 0) + 1, contentOrder, title: title.trim(), description: description || null, isOpen, availableFrom: availableFrom ? new Date(availableFrom) : null, availableUntil: availableUntil ? new Date(availableUntil) : null, deadline: deadline ? new Date(deadline) : null } });
  void notifyCourseStudents(courseId, "ASSIGNMENT_CREATED", "Tugas baru", `Tugas ${item.title} tersedia.`, `assignment:${item.id}:created`, `/assignment/${item.id}`);
  res.status(201).json(item);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  const moduleId = req.body.moduleId ?? existing.moduleId;
  const title = req.body.title === undefined ? existing.title : String(req.body.title).trim();
  const description = req.body.description === undefined || req.body.description === null ? req.body.description === null ? null : existing.description : String(req.body.description);
  if (title.length < 2 || title.length > 200 || (description !== null && description !== undefined && description.length > 20000)) return res.status(400).json({ message: "Judul tugas harus 2 sampai 200 karakter dan deskripsi maksimal 20.000 karakter." });
  const availableFrom = req.body.availableFrom === undefined ? existing.availableFrom : req.body.availableFrom;
  const availableUntil = req.body.availableUntil === undefined ? existing.availableUntil : req.body.availableUntil;
  const deadline = req.body.deadline === undefined ? existing.deadline : req.body.deadline;
  const module = moduleId ? await prisma.module.findFirst({ where: { id: moduleId, courseId: existing.courseId } }) : null;
  if (!module) return res.status(400).json({ message: "Tugas wajib berada di dalam modul yang sesuai." });
  if (module.type === "UTS" || module.type === "UAS") return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." });
  const start = availableFrom ? new Date(availableFrom) : null;
  const end = availableUntil ? new Date(availableUntil) : null;
  const due = deadline ? new Date(deadline) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (due && Number.isNaN(due.getTime())) || (start && end && end < start) || (start && due && due < start) || (end && due && due > end)) return res.status(400).json({ message: "Urutan tanggal tugas tidak valid. Pastikan jadwal mulai ≤ jadwal akses berakhir ≤ deadline." });
  res.json(await prisma.assignment.update({ where: { id: req.params.id }, data: { moduleId, title, description: description || null, availableFrom: start, availableUntil: end, deadline: due, ...(typeof req.body.isOpen === "boolean" ? { isOpen: req.body.isOpen } : {}), ...(typeof req.body.archived === "boolean" ? { archived: req.body.archived } : {}) } }));
});

r.post("/:id/submit", requireAuth as any, safeUpload, async (req: any, res) => {
  if (req.user.role !== "MAHASISWA") return res.status(403).json({ message: "Hanya mahasiswa yang dapat mengumpulkan tugas." });
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!assignment || assignment.archived) { if (req.file) await removeSubmissionFile(`/uploads/${req.file.filename}`); return res.status(404).json({ message: "Tugas tidak tersedia." }); }
  if (getContentAvailability(assignment) !== "AVAILABLE") { if (req.file) await removeSubmissionFile(`/uploads/${req.file.filename}`); return unavailableContent(res, assignment, "ASSIGNMENT"); }
  if (assignment.deadline && assignment.deadline < new Date()) { if (req.file) await removeSubmissionFile(`/uploads/${req.file.filename}`); return res.status(403).json({ message: "Deadline tugas telah lewat." }); }
  const externalUrl = String(req.body.externalUrl || "").trim() || null;
  if (externalUrl) { try { const url = new URL(externalUrl); if (url.protocol !== "https:") throw new Error(); } catch { if (req.file) await removeSubmissionFile(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Link submission harus berupa URL HTTPS yang valid." }); } }
  if (!req.file && !externalUrl) return res.status(400).json({ message: "Upload file atau isi link submission." });
  const previous = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: req.user.id } } });
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : externalUrl ? null : previous?.fileUrl || null;
  const submission = await prisma.assignmentSubmission.upsert({ where: { assignmentId_userId: { assignmentId: assignment.id, userId: req.user.id } }, update: { note: req.body.note || null, fileUrl, fileName: req.file?.originalname || previous?.fileName || null, externalUrl, submittedAt: new Date(), score: null, feedback: null, gradedAt: null }, create: { assignmentId: assignment.id, userId: req.user.id, note: req.body.note || null, fileUrl, fileName: req.file?.originalname || null, externalUrl } });
  if (req.file && previous?.fileUrl && previous.fileUrl !== fileUrl) await removeSubmissionFile(previous.fileUrl);
  res.status(201).json(submissionOut(submission));
});

r.get("/:id/submission", requireAuth as any, async (req: any, res) => {
  if (req.user.role !== "MAHASISWA") return res.status(403).json({ message: "Hanya mahasiswa yang dapat melihat submission sendiri." });
  const item = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId: req.params.id, userId: req.user.id } } });
  res.json(item ? submissionOut(item) : null);
});

r.get("/submissions/:submissionId/file", requireAuth as any, async (req: any, res) => {
  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId }, include: { assignment: { select: { courseId: true } } } });
  if (!submission) return res.status(404).json({ message: "Pengumpulan tidak ditemukan." });
  if (req.user.role === "MAHASISWA" && submission.userId !== req.user.id) return res.status(403).json({ message: "Anda tidak memiliki akses ke file ini." });
  if (await denyIfNoCourseAccess(req.user, submission.assignment.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const file = localFile(submission.fileUrl);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ message: "File submission tidak tersedia." });
  res.sendFile(file, { headers: { "Content-Disposition": `inline; filename="${path.basename(file)}"` } });
});

r.get("/:id/submissions", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id }, select: { courseId: true } });
  if (!assignment) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  if (await denyIfNoCourseAccess(req.user, assignment.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const items = await prisma.assignmentSubmission.findMany({ where: { assignmentId: req.params.id }, include: { user: { select: { id: true, nim: true, name: true } } }, orderBy: { submittedAt: "desc" } });
  res.json(items.map(submissionOut));
});

r.patch("/submissions/:submissionId", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId }, include: { assignment: { select: { courseId: true, title: true } } } });
  if (!submission) return res.status(404).json({ message: "Pengumpulan tidak ditemukan." });
  if (await denyIfNoCourseAccess((req as any).user, submission.assignment.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const score = req.body.score === "" || req.body.score === null || req.body.score === undefined ? null : Number(req.body.score);
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return res.status(400).json({ message: "Nilai harus 0 sampai 100." });
  const item = await prisma.assignmentSubmission.update({ where: { id: req.params.submissionId }, data: { score, feedback: req.body.feedback || null, gradedAt: score === null ? null : new Date() } });
  if (score !== null) void notifyUsers([submission.userId], "ASSIGNMENT_GRADED", "Tugas telah dinilai", `Tugas ${submission.assignment?.title || "Anda"} telah dinilai.`, `submission:${submission.id}:graded`, `/assignment/${submission.assignmentId}`);
  res.json(item);
});

r.delete("/submissions/:submissionId", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const item = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId } });
  if (!item) return res.status(404).json({ message: "Pengumpulan tidak ditemukan." });
  const assignment = await prisma.assignment.findUnique({ where: { id: item.assignmentId }, select: { courseId: true } });
  if (assignment && await denyIfNoCourseAccess((req as any).user, assignment.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  await prisma.assignmentSubmission.delete({ where: { id: item.id } });
  await removeSubmissionFile(item.fileUrl);
  res.json({ ok: true });
});

r.patch("/:id/reorder", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, validateReorder, async (req: any, res) => {
  const current = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!current?.moduleId) return res.status(400).json({ message: "Tugas harus memiliki modul." });
  const items = await orderItems(current.moduleId); const index = items.findIndex((item) => item.id === current.id); const target = index + (req.body.direction === "up" ? -1 : 1);
  if (target < 0 || target >= items.length) return res.json(current);
  await prisma.$transaction(async (tx) => { await tx.assignment.update({ where: { id: current.id }, data: { order: -1 } }); await tx.assignment.update({ where: { id: items[target].id }, data: { order: current.order } }); await tx.assignment.update({ where: { id: current.id }, data: { order: items[target].order } }); });
  res.json(await prisma.assignment.findUnique({ where: { id: current.id } }));
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req, res) => {
  const item = await prisma.assignment.findUnique({ where: { id: req.params.id }, include: { submissions: { select: { fileUrl: true } } } });
  if (!item) return res.status(404).json({ message: "Tugas tidak ditemukan." });
  await prisma.assignment.delete({ where: { id: req.params.id } }); await Promise.all(item.submissions.map((submission) => removeSubmissionFile(submission.fileUrl)));
  if (item?.moduleId) { const rest = await orderItems(item.moduleId); await prisma.$transaction(rest.map((row, index) => prisma.assignment.update({ where: { id: row.id }, data: { order: index + 1 } }))); }
  res.json({ ok: true });
});

export default r;
