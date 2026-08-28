import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { denyIfNoCourseAccess } from "../lib/courseAccess.js";
import { audit } from "../lib/audit.js";
import { notifyCourseStudents } from "../lib/notifications.js";
import { getContentAvailability, contentPreview } from "../lib/contentAvailability.js";
const r = Router();
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const removeLocalFileIfUnused = async (url: string | null | undefined, kind: "material" | "question" | "submission") => {
  if (!url?.startsWith("/uploads/")) return;
  const filePath = path.resolve(uploadRoot, url.slice("/uploads/".length));
  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) return;
  const count = kind === "material" ? await prisma.material.count({ where: { sourceUrl: url } }) : kind === "question" ? await prisma.question.count({ where: { imageUrl: url } }) : await prisma.assignmentSubmission.count({ where: { fileUrl: url } });
  if (!count && fs.existsSync(filePath)) await fs.promises.unlink(filePath);
};

function hideAnswerKeys(course: any) {
  return {
    ...course,
    assignments: course.assignments?.filter((item: any) => !item.archived).map((item: any) => ({ ...contentPreview(item, "ASSIGNMENT"), description: getContentAvailability(item) === "AVAILABLE" ? item.description : null, deadline: item.deadline || null })),
    modules: course.modules?.map((module: any) => ({
      ...module,
      materials: module.materials?.filter((item: any) => !item.archived).map((item: any) => ({ ...contentPreview(item, "MATERIAL"), type: item.type, sourceType: item.sourceType, duration: item.duration, totalPages: item.totalPages, requireCompletionForDownload: item.requireCompletionForDownload })),
      assignments: module.assignments?.filter((item: any) => !item.archived).map((item: any) => ({ ...contentPreview(item, "ASSIGNMENT"), description: getContentAvailability(item) === "AVAILABLE" ? item.description : null, deadline: item.deadline || null })),
      quizzes: module.quizzes?.filter((item: any) => !item.archived).map((quiz: any) => ({ ...contentPreview(quiz, "QUIZ"), kind: quiz.kind, passingScore: quiz.passingScore, deadline: quiz.deadline || null, attemptLimit: quiz.attemptLimit, resultReleaseMode: quiz.resultReleaseMode, questions: (quiz.questions || []).map((question: any) => ({ id: question.id, type: question.type })) }))
    }))
  };
}

// list courses — mahasiswa hanya yang enrolled, dosen/admin semua
r.get("/", requireAuth as any, async (req: any, res) => {
  const { role, id } = req.user;
  let courses;
  const where = role === "ADMIN" ? {} : role === "DOSEN" ? { instructors: { some: { userId: id } } } : { enrollments: { some: { userId: id } } };
  courses = await prisma.course.findMany({ where, select: { id: true, title: true, description: true, createdAt: true, modules: { orderBy: { order: "asc" }, select: { id: true, title: true, type: true, _count: { select: { materials: true, assignments: true, quizzes: true } } } }, _count: { select: { enrollments: true, instructors: true } } }, orderBy: { createdAt: "desc" } });
  res.json(courses.map((course: any) => ({ ...course, enrolledCount: course._count.enrollments, moduleCount: course.modules.length, materialCount: course.modules.reduce((sum: number, module: any) => sum + module._count.materials, 0), assignmentCount: course.modules.reduce((sum: number, module: any) => sum + module._count.assignments, 0), quizCount: course.modules.reduce((sum: number, module: any) => sum + module._count.quizzes, 0), _count: undefined })));
});

r.get("/:id", requireAuth as any, async (req: any, res) => {
  if (await denyIfNoCourseAccess(req.user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const c = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { assignments: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] }, modules: { orderBy: { order: "asc" }, include: { materials: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] }, quizzes: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { questions: { orderBy: { order: "asc" } } } }, assignments: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } }, instructors: { include: { user: { select: { id: true, nim: true, name: true } } } } } as any
  });
  if (!c) return res.status(404).json({ message: "Not found" });
  res.json(req.user.role === "MAHASISWA" ? hideAnswerKeys(c) : c);
});

r.post("/", requireAuth as any, requireRole("ADMIN") as any, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = req.body.description === undefined || req.body.description === null ? null : String(req.body.description);
  if (title.length < 2 || title.length > 200) return res.status(400).json({ message: "Judul mata kuliah harus 2 sampai 200 karakter." });
  if (description !== null && description.length > 20000) return res.status(400).json({ message: "Deskripsi mata kuliah maksimal 20.000 karakter." });
  const c = await prisma.course.create({ data: { title, description } });
  void audit((req as any).user.id, "CREATE", "Course", c.id);
  res.status(201).json(c);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  if (await denyIfNoCourseAccess((req as any).user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const title = req.body.title === undefined ? undefined : String(req.body.title).trim();
  const description = req.body.description === undefined || req.body.description === null ? req.body.description : String(req.body.description);
  if (title !== undefined && (title.length < 2 || title.length > 200)) return res.status(400).json({ message: "Judul mata kuliah harus 2 sampai 200 karakter." });
  if (description !== undefined && description !== null && description.length > 20000) return res.status(400).json({ message: "Deskripsi mata kuliah maksimal 20.000 karakter." });
  if (title === undefined && description === undefined) return res.status(400).json({ message: "Tidak ada data mata kuliah yang diubah." });
  const c = await prisma.course.update({ where: { id: req.params.id }, data: { ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}) } });
  void audit((req as any).user.id, "UPDATE", "Course", c.id);
  res.json(c);
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN") as any, async (req, res) => { const course = await prisma.course.findUnique({ where: { id: req.params.id }, include: { modules: { include: { materials: true, assignments: { include: { submissions: { select: { fileUrl: true } } } }, quizzes: { include: { questions: true } } } } } }); if (!course) return res.status(404).json({ message: "Mata kuliah tidak ditemukan." }); await prisma.course.delete({ where: { id: req.params.id } }); const files = course.modules.flatMap((module) => [...module.materials.map((item) => ({ url: item.sourceUrl, kind: "material" as const })), ...module.assignments.flatMap((assignment) => assignment.submissions.map((submission) => ({ url: submission.fileUrl, kind: "submission" as const }))), ...module.quizzes.flatMap((quiz) => quiz.questions.map((question) => ({ url: question.imageUrl, kind: "question" as const })))]); await Promise.all(files.map((file) => removeLocalFileIfUnused(file.url, file.kind))); res.json({ ok: true }); });

// modules
r.use("/modules/:id", requireAuth as any, async (req: any, res, next) => { const module = await prisma.module.findUnique({ where: { id: req.params.id }, select: { courseId: true } }); if (!module) return res.status(404).json({ message: "Modul tidak ditemukan." }); if (await denyIfNoCourseAccess(req.user, module.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." }); next(); });
r.post("/:courseId/modules", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  if (await denyIfNoCourseAccess((req as any).user, req.params.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const { title, order, type = "REGULAR" } = req.body;
  if (!title?.trim() || !["REGULAR", "UTS", "UAS"].includes(type)) return res.status(400).json({ message: "Judul dan tipe modul tidak valid." });
  if ((type === "UTS" || type === "UAS") && await prisma.module.findFirst({ where: { courseId: req.params.courseId, type }, select: { id: true } })) return res.status(409).json({ message: `Mata kuliah ini sudah memiliki modul ${type}. Gunakan modul tersebut atau buat modul susulan reguler.` });
  const last = await prisma.module.findFirst({ where: { courseId: req.params.courseId }, orderBy: [{ order: "desc" }, { createdAt: "desc" }], select: { order: true } });
  const m = await prisma.module.create({ data: { courseId: req.params.courseId, title: title.trim(), type, order: (last?.order ?? 0) + 1 } });
  res.status(201).json(m);
});

r.put("/modules/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const existing = await prisma.module.findUnique({ where: { id: req.params.id }, select: { courseId: true, type: true } });
  if (!existing) return res.status(404).json({ message: "Modul tidak ditemukan." });
  if (await denyIfNoCourseAccess((req as any).user, existing.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const title = req.body.title === undefined ? undefined : String(req.body.title).trim();
  const type = req.body.type === undefined ? undefined : String(req.body.type).toUpperCase();
  if (title !== undefined && (title.length < 2 || title.length > 200)) return res.status(400).json({ message: "Judul modul harus 2 sampai 200 karakter." });
  if (type !== undefined && !["REGULAR", "UTS", "UAS"].includes(type)) return res.status(400).json({ message: "Tipe modul tidak valid." });
  if (type && type !== "REGULAR" && await prisma.module.findFirst({ where: { courseId: existing.courseId, type, id: { not: req.params.id } }, select: { id: true } })) return res.status(409).json({ message: `Mata kuliah ini sudah memiliki modul ${type}.` });
  if (title === undefined && type === undefined) return res.status(400).json({ message: "Tidak ada data modul yang diubah." });
  const data = { ...(title !== undefined ? { title } : {}), ...(type !== undefined ? { type } : {}) };
  const m = await prisma.module.update({ where: { id: req.params.id }, data });
  res.json(m);
});

r.patch("/modules/:id/reorder", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const current = await prisma.module.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ message: "Modul tidak ditemukan." });
  if (await denyIfNoCourseAccess(req.user, current.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const items = await prisma.module.findMany({ where: { courseId: current.courseId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  const index = items.findIndex((item) => item.id === current.id); const target = index + (req.body.direction === "up" ? -1 : 1);
  if (target < 0 || target >= items.length) return res.json(current);
  await prisma.$transaction(async (tx) => { await tx.module.update({ where: { id: current.id }, data: { order: -1 } }); await tx.module.update({ where: { id: items[target].id }, data: { order: current.order } }); await tx.module.update({ where: { id: current.id }, data: { order: items[target].order } }); });
  res.json(await prisma.module.findUnique({ where: { id: current.id } }));
});

r.patch("/modules/:moduleId/content/reorder", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const { itemType, itemId, direction } = req.body;
  if (!["assignment", "material", "quiz"].includes(itemType) || !["up", "down"].includes(direction) || !itemId) return res.status(400).json({ message: "itemType, itemId, dan direction tidak valid." });
  const module = await prisma.module.findUnique({ where: { id: req.params.moduleId } });
  if (!module) return res.status(404).json({ message: "Modul tidak ditemukan." });
  if (await denyIfNoCourseAccess(req.user, module.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const [assignments, materials, quizzes] = await Promise.all([
    prisma.assignment.findMany({ where: { moduleId: module.id } }),
    prisma.material.findMany({ where: { moduleId: module.id } }),
    prisma.quiz.findMany({ where: { moduleId: module.id } })
  ]);
  const items = [
    ...assignments.map((item) => ({ ...item, itemType: "assignment" as const })),
    ...materials.map((item) => ({ ...item, itemType: "material" as const })),
    ...quizzes.map((item) => ({ ...item, itemType: "quiz" as const }))
  ].sort((a, b) => a.contentOrder - b.contentOrder || a.createdAt.getTime() - b.createdAt.getTime());
  const index = items.findIndex((item) => item.id === itemId && item.itemType === itemType);
  const targetIndex = index + (direction === "up" ? -1 : 1);
  if (index < 0) return res.status(404).json({ message: "Konten tidak ditemukan pada modul ini." });
  if (targetIndex < 0 || targetIndex >= items.length) return res.json({ ok: true });
  const current = items[index]; const target = items[targetIndex]; const temporary = items.length + 1;
  const update = (tx: any, type: string, id: string, contentOrder: number) => type === "assignment"
    ? tx.assignment.update({ where: { id }, data: { contentOrder } })
    : type === "material" ? tx.material.update({ where: { id }, data: { contentOrder } })
      : tx.quiz.update({ where: { id }, data: { contentOrder } });
  await prisma.$transaction(async (tx) => {
    await update(tx, current.itemType, current.id, temporary);
    await update(tx, target.itemType, target.id, current.contentOrder);
    await update(tx, current.itemType, current.id, target.contentOrder);
  });
  res.json({ ok: true });
});

r.delete("/modules/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => { const module = await prisma.module.findUnique({ where: { id: req.params.id }, include: { materials: true, assignments: { include: { submissions: { select: { fileUrl: true } } } }, quizzes: { include: { questions: true } } } }); if (!module) return res.status(404).json({ message: "Modul tidak ditemukan." }); await prisma.module.delete({ where: { id: req.params.id } }); const files = [...module.materials.map((item) => ({ url: item.sourceUrl, kind: "material" as const })), ...module.assignments.flatMap((assignment) => assignment.submissions.map((submission) => ({ url: submission.fileUrl, kind: "submission" as const }))), ...module.quizzes.flatMap((quiz) => quiz.questions.map((question) => ({ url: question.imageUrl, kind: "question" as const })))]; await Promise.all(files.map((file) => removeLocalFileIfUnused(file.url, file.kind))); res.json({ ok: true }); });

// course instructors — one course may have multiple dosen
r.get("/:id/instructors", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  if (await denyIfNoCourseAccess((req as any).user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const instructors = await prisma.courseInstructor.findMany({ where: { courseId: req.params.id }, include: { user: { select: { id: true, nim: true, name: true, role: true } } } });
  res.json(instructors.map((item: any) => item.user));
});

r.put("/:id/instructors", requireAuth as any, requireRole("ADMIN") as any, async (req, res) => {
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, role: "DOSEN" }, select: { id: true } });
  await prisma.$transaction([
    prisma.courseInstructor.deleteMany({ where: { courseId: req.params.id } }),
    ...users.map((user) => prisma.courseInstructor.create({ data: { courseId: req.params.id, userId: user.id } }))
  ]);
  void audit((req as any).user.id, "ASSIGN_INSTRUCTORS", "Course", req.params.id, { count: users.length });
  res.json({ ok: true, userIds: users.map((user) => user.id) });
});

// enrollment
r.post("/:id/enroll", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => {
  const { userId } = req.body;
  const uid = userId;
  if (!uid) return res.status(400).json({ message: "userId wajib diisi." });
  if (await denyIfNoCourseAccess(req.user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const student = await prisma.user.findFirst({ where: { id: uid, role: "MAHASISWA" }, select: { id: true } });
  if (!student) return res.status(400).json({ message: "userId harus merupakan akun mahasiswa." });
  const e = await prisma.enrollment.upsert({ where: { userId_courseId: { userId: uid, courseId: req.params.id } }, update: {}, create: { userId: uid, courseId: req.params.id } });
  void audit(req.user.id, "ENROLL", "Course", req.params.id, { userId: uid });
  res.json(e);
});

r.get("/:id/enrollments", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  if (await denyIfNoCourseAccess((req as any).user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const en = await prisma.enrollment.findMany({ where: { courseId: req.params.id }, include: { user: { select: { id: true, nim: true, name: true, role: true } } } });
  res.json(en);
});

r.put("/:id/enrollments", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  if (await denyIfNoCourseAccess((req as any).user, req.params.id)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const students = await prisma.user.findMany({ where: { id: { in: userIds }, role: "MAHASISWA" }, select: { id: true } });
  await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { courseId: req.params.id } }),
    ...students.map((student) => prisma.enrollment.create({ data: { courseId: req.params.id, userId: student.id } }))
  ]);
  void audit((req as any).user.id, "REPLACE_ENROLLMENTS", "Course", req.params.id, { count: students.length });
  res.json({ ok: true, userIds: students.map((student) => student.id) });
});

export default r;
