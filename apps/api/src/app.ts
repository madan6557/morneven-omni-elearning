import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { auth, requireApiKey } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import materialRoutes from "./routes/materials.js";
import progressRoutes from "./routes/progress.js";
import quizRoutes from "./routes/quizzes.js";
import assignmentRoutes from "./routes/assignments.js";
import backupRoutes from "./routes/backup.js";
import notificationRoutes from "./routes/notifications.js";
import calendarRoutes from "./routes/calendar.js";
import reportRoutes from "./routes/reports.js";
import { prisma } from "./lib/prisma.js";

export function createApp() {
  const app = express();
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  const origins = raw.replace(/"/g, "").split(",").map(s=>s.trim()).filter(Boolean);
  // ponytail: handle Railway ENV with quotes, allow omni.morneven.com + localhost for dev
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(auth as any);

  // Uploads are served through authenticated resource routes, never as a public directory.
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";

  app.get("/api/health", async (_req, res) => { const checks: any = { api: true, database: false, storage: false }; try { await prisma.$queryRaw`SELECT 1`; checks.database = true; } catch {} try { checks.storage = fs.existsSync(path.resolve(uploadDir)); } catch {} const ok = checks.database && checks.storage; res.status(ok ? 200 : 503).json({ ok, checks, time: new Date().toISOString() }); });

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/backup", backupRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/reports", reportRoutes);
  // integration sso stub — ponytail: verify JWT shared secret
  app.post("/api/integration/auth/sso", requireApiKey as any, async (req,res)=>{
    const { token } = req.body;
    if(!token) return res.status(400).json({message:"token required"});
    try{
      const { verifyToken } = await import("./lib/jwt.js");
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, nim: true, name: true, role: true, isActive: true, tokenVersion: true } });
      if (!user || !user.isActive) return res.status(401).json({ message: "User SSO tidak aktif atau tidak ditemukan." });
      const { signToken } = await import("./lib/jwt.js");
      const newTok = signToken({ id: user.id, nim: user.nim, role: user.role, tokenVersion: user.tokenVersion });
      res.json({ token: newTok, user: { id: user.id, nim: user.nim, name: user.name, role: user.role } });
    } catch(e:any){ res.status(401).json({message:"invalid token"}); }
  });

  // 404
  app.use((_req,res)=>res.status(404).json({message:"Not found"}));
  // error
  app.use((err:any,_req:any,res:any,_next:any)=>{
    console.error(JSON.stringify({ name: err?.name, message: err?.message, stack: process.env.NODE_ENV === "production" ? undefined : err?.stack }));
    res.status(500).json({message: process.env.NODE_ENV === "production" ? "Terjadi kesalahan internal." : err?.message || "Internal error"});
  });
  return app;
}
