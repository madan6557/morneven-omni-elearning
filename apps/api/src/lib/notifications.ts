import { prisma } from "./prisma.js";

export function notifyUsers(userIds: string[], type: string, title: string, message: string, eventKey: string, link?: string) {
  if (!userIds.length) return Promise.resolve();
  return Promise.all(userIds.map((userId) => prisma.notification.upsert({ where: { userId_eventKey: { userId, eventKey } }, update: {}, create: { userId, type, title, message, eventKey, link: link || null } }))).then(() => undefined);
}

export async function notifyCourseStudents(courseId: string, type: string, title: string, message: string, eventKey: string, link?: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { courseId }, select: { userId: true } });
  return notifyUsers(enrollments.map((item) => item.userId), type, title, message, eventKey, link);
}
