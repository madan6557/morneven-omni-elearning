import { prisma } from "./prisma.js";

export type AccessUser = { id: string; role: string };

export async function canAccessCourse(user: AccessUser, courseId: string) {
  if (user.role === "ADMIN") return true;
  if (user.role === "DOSEN") return Boolean(await prisma.courseInstructor.findUnique({ where: { courseId_userId: { courseId, userId: user.id } }, select: { courseId: true } }));
  if (user.role === "MAHASISWA") return Boolean(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } }, select: { courseId: true } }));
  return false;
}

export async function denyIfNoCourseAccess(user: AccessUser, courseId: string) {
  return !(await canAccessCourse(user, courseId));
}
