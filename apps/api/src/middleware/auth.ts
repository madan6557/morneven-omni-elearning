import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
export interface AuthUser { id: string; nim: string; role: string; }
export function auth(req: Request & { user?: AuthUser }, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return next();
  try {
    const token = h.slice(7);
    req.user = verifyToken(token);
    void prisma.user.update({ where: { id: req.user.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
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
  if (key !== (process.env.API_KEY || "dev-api-key-change-me")) return res.status(401).json({ message: "Invalid API key" });
  next();
}
