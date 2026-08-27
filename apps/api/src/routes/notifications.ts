import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();
r.get("/", requireAuth as any, async (req: any, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const unreadOnly = req.query.unread === "true";
  const items = await prisma.notification.findMany({ where: { userId: req.user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
  res.json({ items, unread: await prisma.notification.count({ where: { userId: req.user.id, readAt: null } }) });
});
r.patch("/:id/read", requireAuth as any, async (req: any, res) => {
  const item = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!item.count) return res.status(404).json({ message: "Notifikasi tidak ditemukan." });
  res.json({ ok: true });
});
r.patch("/read-all", requireAuth as any, async (req: any, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});
export default r;
