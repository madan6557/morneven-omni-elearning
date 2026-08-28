import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.get("/", requireAuth as any, async (req: any, res) => {
  const where = req.user.role === "ADMIN" ? {} : req.user.role === "DOSEN" ? { instructors: { some: { userId: req.user.id } } } : { enrollments: { some: { userId: req.user.id } } };
  const courses = await prisma.course.findMany({ where, select: { id: true, title: true, modules: { orderBy: { order: "asc" }, select: { id: true, title: true, assignments: { where: { archived: false }, select: { id: true, title: true, isOpen: true, availableFrom: true, availableUntil: true, deadline: true } }, materials: { where: { archived: false }, select: { id: true, title: true, isOpen: true, availableFrom: true, availableUntil: true } }, quizzes: { where: { archived: false }, select: { id: true, title: true, isOpen: true, availableFrom: true, availableUntil: true, deadline: true, resultReleaseAt: true } } } } } });
  const events = courses.flatMap((course) => course.modules.flatMap((module) => [
    ...module.assignments.filter((item) => item.isOpen).flatMap((item) => [ ...(item.availableFrom ? [{ id: `${item.id}:open`, type: "ASSIGNMENT_OPEN", title: item.title, at: item.availableFrom }] : []), ...(item.availableUntil ? [{ id: `${item.id}:access-end`, type: "ASSIGNMENT_ACCESS_END", title: item.title, at: item.availableUntil }] : []), ...(item.deadline ? [{ id: `${item.id}:deadline`, type: "ASSIGNMENT_DEADLINE", title: item.title, at: item.deadline }] : []) ]),
    ...module.materials.filter((item) => item.isOpen).flatMap((item) => [ ...(item.availableFrom ? [{ id: `${item.id}:open`, type: "MATERIAL_OPEN", title: item.title, at: item.availableFrom }] : []), ...(item.availableUntil ? [{ id: `${item.id}:access-end`, type: "MATERIAL_ACCESS_END", title: item.title, at: item.availableUntil }] : []) ]),
    ...module.quizzes.filter((item) => item.isOpen).flatMap((item) => [ ...(item.availableFrom ? [{ id: `${item.id}:open`, type: "QUIZ_OPEN", title: item.title, at: item.availableFrom }] : []), ...(item.availableUntil ? [{ id: `${item.id}:access-end`, type: "QUIZ_ACCESS_END", title: item.title, at: item.availableUntil }] : []), ...(item.deadline ? [{ id: `${item.id}:deadline`, type: "QUIZ_DEADLINE", title: item.title, at: item.deadline }] : []), ...(item.resultReleaseAt ? [{ id: `${item.id}:result`, type: "RESULT_RELEASE", title: item.title, at: item.resultReleaseAt }] : []) ]),
  ].filter((event) => event.at !== null).map((event) => ({ ...event, courseId: course.id, courseTitle: course.title, moduleTitle: module.title })))).sort((a, b) => new Date(a.at as Date).getTime() - new Date(b.at as Date).getTime());
  res.json({ items: events });
});

export default r;
