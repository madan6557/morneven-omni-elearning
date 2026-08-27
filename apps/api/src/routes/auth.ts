import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { ChangePasswordSchema, LoginSchema, RegisterSchema, UpdateUserSchema } from "@repo/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
const r = Router();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const clientKey = (req: any) => String(req.ip || req.headers["x-forwarded-for"] || "unknown");
const cookieSuffix = process.env.NODE_ENV === "production" ? "SameSite=None; Secure" : "SameSite=Lax";
const setSessionCookie = (res: any, token: string) => res.setHeader("Set-Cookie", `omni_session=${token}; HttpOnly; Path=/; Max-Age=604800; ${cookieSuffix}`);
const clearSessionCookie = (res: any) => res.setHeader("Set-Cookie", `omni_session=; HttpOnly; Path=/; Max-Age=0; ${cookieSuffix}`);

r.post("/login", async (req, res) => {
  const key = clientKey(req); const now = Date.now(); const state = loginAttempts.get(key); if (state && state.resetAt > now && state.count >= 10) return res.status(429).json({ message: "Terlalu banyak percobaan login. Coba lagi beberapa menit." }); if (!state || state.resetAt <= now) loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { nim, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { nim } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) { const current = loginAttempts.get(key)!; current.count += 1; return res.status(401).json({ message: "NIM atau password salah" }); }
  loginAttempts.delete(key);
  const token = signToken({ id: user.id, nim: user.nim, role: user.role, tokenVersion: user.tokenVersion });
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  void audit(user.id, "LOGIN", "User", user.id);
  setSessionCookie(res, token);
  res.json({ token, user: { id: user.id, nim: user.nim, name: user.name, role: user.role } });
});

r.post("/register", async (req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PUBLIC_REGISTER !== "true") return res.status(403).json({ message: "Pendaftaran akun dilakukan oleh admin." });
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { nim, name, password, role } = parsed.data;
  if (await prisma.user.findUnique({ where: { nim } })) return res.status(409).json({ message: "NIM sudah terdaftar" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { nim, name, password: hash, role } });
  res.status(201).json({ id: user.id, nim: user.nim, name: user.name, role: user.role });
});

// admin create user
r.post("/users", requireAuth as any, requireRole("ADMIN") as any, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { nim, name, password, role } = parsed.data;
  if (await prisma.user.findUnique({ where: { nim } })) return res.status(409).json({ message: "NIM sudah terdaftar" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { nim, name, password: hash, role } });
  void audit((req as any).user?.id, "CREATE", "User", user.id, { role });
  res.status(201).json(user);
});

r.post("/logout", requireAuth as any, (_req, res) => { clearSessionCookie(res); res.json({ ok: true }); });

r.get("/me", requireAuth as any, async (req: any, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, nim: true, name: true, role: true } });
  res.json(u);
});

r.get("/users", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req: any, res) => {
  const role = ["DOSEN", "MAHASISWA"].includes(req.query.role) ? req.query.role : undefined;
  const search = String(req.query.search || "").trim();
  const parsedLimit = Number(req.query.limit);
  const parsedPage = Number(req.query.page);
  const paginated = req.query.page !== undefined || req.query.limit !== undefined || Boolean(search || role);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 100) : 25;
  const skip = (page - 1) * take;
  const where: any = { ...(role ? { role } : {}) };
  if (search) where.OR = [{ name: { contains: search } }, { nim: { contains: search } }];
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, ...(paginated ? { skip, take } : {}), select: { id: true, nim: true, name: true, role: true, createdAt: true, lastSeenAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where }),
  ]);
  const withPresence = users.map((user) => ({ ...user, online: Boolean(user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < 5 * 60 * 1000) }));
  res.json(paginated ? { items: withPresence, page, limit: take, total, totalPages: Math.ceil(total / take) } : withPresence);
});

r.patch("/users/:id/password", requireAuth as any, requireRole("ADMIN") as any, async (req: any, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Password baru minimal 8 karakter dan maksimal 128 karakter." });
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data.password, 10), tokenVersion: { increment: 1 } } });
  void audit(req.user.id, "RESET_PASSWORD", "User", user.id);
  res.json({ ok: true, message: "Password user berhasil diubah." });
});

r.patch("/me/password", requireAuth as any, async (req: any, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Password baru minimal 8 karakter dan maksimal 128 karakter." });
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { password: await bcrypt.hash(parsed.data.password, 10), tokenVersion: { increment: 1 } }, select: { id: true, nim: true, role: true, tokenVersion: true } });
  setSessionCookie(res, signToken({ id: user.id, nim: user.nim, role: user.role, tokenVersion: user.tokenVersion }));
  void audit(req.user.id, "CHANGE_PASSWORD", "User", req.user.id);
  res.json({ ok: true, message: "Password Anda berhasil diubah." });
});

r.put("/users/:id", requireAuth as any, requireRole("ADMIN") as any, async (req: any, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "NIM/NIDN, nama, role, atau status akun tidak valid.", issues: parsed.error.issues });
  const { nim, name, role, isActive } = parsed.data;
  if (req.params.id === req.user.id && isActive === false) return res.status(400).json({ message: "Akun yang sedang digunakan tidak dapat dinonaktifkan." });
  const existing = await prisma.user.findFirst({ where: { nim, NOT: { id: req.params.id } }, select: { id: true } });
  if (existing) return res.status(409).json({ message: "NIM/identifier sudah digunakan." });
  try { const user = await prisma.user.update({ where: { id: req.params.id }, data: { nim, name, role, ...(isActive !== undefined ? { isActive } : {}) }, select: { id: true, nim: true, name: true, role: true, isActive: true, lastSeenAt: true } }); void audit(req.user.id, "UPDATE", "User", user.id, { role, isActive }); res.json(user); } catch { res.status(404).json({ message: "User tidak ditemukan." }); }
});

r.delete("/users/:id", requireAuth as any, requireRole("ADMIN") as any, async (req: any, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "Akun yang sedang digunakan tidak dapat dihapus." });
  try { await prisma.user.delete({ where: { id: req.params.id } }); void audit(req.user.id, "DELETE", "User", req.params.id); res.json({ ok: true }); } catch { res.status(404).json({ message: "User tidak ditemukan." }); }
});

export default r;
