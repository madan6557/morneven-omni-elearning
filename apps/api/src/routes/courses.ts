import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
const r = Router();

// list courses — mahasiswa hanya yang enrolled, dosen/admin semua
r.get("/", requireAuth as any, async (req: any, res) => {
  const { role, id } = req.user;
  let courses;
  if (role === "MAHASISWA") {
    const enrolls = await prisma.enrollment.findMany({ where: { userId: id }, select: { courseId: true } });
    const ids = enrolls.map((e:any) => e.courseId);
    courses = await prisma.course.findMany({ where: { id: { "in": ids } }, include: { modules: { include: { materials: true, quizzes: true } } } as any, orderBy: { createdAt: "desc" } });
  } else {
    courses = await prisma.course.findMany({ include: { modules: { include: { materials: true, quizzes: true } } } as any, orderBy: { createdAt: "desc" } });
  }
  // add enrollment count
  const withCount = await Promise.all(courses.map(async c => {
    const count = await prisma.enrollment.count({ where: { courseId: c.id } });
    return { ...c, enrolledCount: count };
  }));
  res.json(withCount);
});

r.get("/:id", requireAuth as any, async (req: any, res) => {
  const c = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { modules: { orderBy: { order: "asc" }, include: { materials: { orderBy: { order: "asc" } }, quizzes: { include: { questions: { orderBy: { order: "asc" } } } } } } } as any
  });
  if (!c) return res.status(404).json({ message: "Not found" });
  res.json(c);
});

r.post("/", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: "title required" });
  const c = await prisma.course.create({ data: { title, description } });
  res.status(201).json(c);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const c = await prisma.course.update({ where: { id: req.params.id }, data: req.body });
  res.json(c);
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN") as any, async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// modules
r.post("/:courseId/modules", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const { title, order } = req.body;
  const m = await prisma.module.create({ data: { courseId: req.params.courseId, title, order: order ?? 0 } });
  res.status(201).json(m);
});

r.put("/modules/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const m = await prisma.module.update({ where: { id: req.params.id }, data: req.body });
  res.json(m);
});

r.delete("/modules/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  await prisma.module.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// enrollment
r.post("/:id/enroll", requireAuth as any, async (req: any, res) => {
  const { userId } = req.body;
  const uid = userId || req.user.id;
  // only admin/dosen can enroll others
  if (uid !== req.user.id && !["ADMIN","DOSEN"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  const e = await prisma.enrollment.upsert({ where: { userId_courseId: { userId: uid, courseId: req.params.id } }, update: {}, create: { userId: uid, courseId: req.params.id } });
  res.json(e);
});

r.get("/:id/enrollments", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req, res) => {
  const en = await prisma.enrollment.findMany({ where: { courseId: req.params.id }, include: { user: { select: { id: true, nim: true, name: true, role: true } } } });
  res.json(en);
});

export default r;
