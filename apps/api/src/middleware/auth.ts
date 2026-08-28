import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
export interface AuthUser { id: string; nim: string; role: string; tokenVersion?: number; }
const cookieToken = (header?: string) => header?.split(";").map((part) => part.trim()).find((part) => part.startsWith("omni_session="))?.slice("omni_session=".length);
export async function auth(req: Request & { user?: AuthUser }, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : cookieToken(req.headers.cookie);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, nim: true, role: true, isActive: true, tokenVersion: true, lastSeenAt: true } });
    if (!user || !user.isActive || (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion)) return next();
    req.user = { id: user.id, nim: user.nim, role: user.role, tokenVersion: user.tokenVersion };
    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 60_000) void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  } catch {}
  next();
}
export function requireAuth(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
}
export function requireRole(...roles: string[]) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"] as string;
  const expected = process.env.API_KEY || (process.env.NODE_ENV === "production" ? "" : "dev-api-key-change-me");
  if (!expected || key !== expected) return res.status(401).json({ message: "Invalid API key" });
  next();
}
