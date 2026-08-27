import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from "@repo/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
const r = Router();

r.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { nim, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { nim } });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "NIM atau password salah" });
  const token = signToken({ id: user.id, nim: user.nim, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  res.json({ token, user: { id: user.id, nim: user.nim, name: user.name, role: user.role } });
});

r.post("/register", async (req, res) => {
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
  res.status(201).json(user);
});

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
  if (!parsed.success) return res.status(400).json({ message: "Password minimal 6 karakter." });
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data.password, 10) } });
  res.json({ ok: true, message: "Password user berhasil diubah." });
});

r.patch("/me/password", requireAuth as any, async (req: any, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Password minimal 6 karakter." });
  await prisma.user.update({ where: { id: req.user.id }, data: { password: await bcrypt.hash(parsed.data.password, 10) } });
  res.json({ ok: true, message: "Password Anda berhasil diubah." });
});

r.put("/users/:id", requireAuth as any, requireRole("ADMIN") as any, async (req: any, res) => {
  const nim = String(req.body.nim || "").trim();
  const name = String(req.body.name || "").trim();
  const role = String(req.body.role || "");
  if (nim.length < 3 || name.length < 2 || !["ADMIN", "DOSEN", "MAHASISWA"].includes(role)) return res.status(400).json({ message: "Data user tidak valid." });
  const existing = await prisma.user.findFirst({ where: { nim, NOT: { id: req.params.id } }, select: { id: true } });
  if (existing) return res.status(409).json({ message: "NIM/identifier sudah digunakan." });
  try { const user = await prisma.user.update({ where: { id: req.params.id }, data: { nim, name, role }, select: { id: true, nim: true, name: true, role: true, lastSeenAt: true } }); res.json(user); } catch { res.status(404).json({ message: "User tidak ditemukan." }); }
});

r.delete("/users/:id", requireAuth as any, requireRole("ADMIN") as any, async (req: any, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "Akun yang sedang digunakan tidak dapat dihapus." });
  try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ ok: true }); } catch { res.status(404).json({ message: "User tidak ditemukan." }); }
});

export default r;
