import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { LoginSchema, RegisterSchema } from "@repo/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
const r = Router();

r.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { nim, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { nim } });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "NIM atau password salah" });
  const token = signToken({ id: user.id, nim: user.nim, role: user.role });
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
  const take = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : (search || role ? 50 : undefined);
  const where: any = { ...(role ? { role } : {}) };
  if (search) where.OR = [{ name: { contains: search } }, { nim: { contains: search } }];
  const users = await prisma.user.findMany({ where, take, select: { id: true, nim: true, name: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  res.json(users);
});

export default r;
