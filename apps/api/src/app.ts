import express from "express";
import cors from "cors";
import path from "path";
import { auth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import materialRoutes from "./routes/materials.js";
import progressRoutes from "./routes/progress.js";
import quizRoutes from "./routes/quizzes.js";
import assignmentRoutes from "./routes/assignments.js";
import backupRoutes from "./routes/backup.js";

export function createApp() {
  const app = express();
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  const origins = raw.replace(/"/g, "").split(",").map(s=>s.trim()).filter(Boolean);
  // ponytail: handle Railway ENV with quotes, allow omni.morneven.com + localhost for dev
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(auth as any);

  // serve uploads
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  app.use("/uploads", express.static(path.resolve(uploadDir)));

  app.get("/api/health", (_req,res)=>res.json({ ok:true, time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/backup", backupRoutes);
  // integration sso stub — ponytail: verify JWT shared secret
  app.post("/api/integration/auth/sso", async (req,res)=>{
    const { token } = req.body;
    if(!token) return res.status(400).json({message:"token required"});
    try{
      const { verifyToken } = await import("./lib/jwt.js");
      const payload = verifyToken(token);
      const { signToken } = await import("./lib/jwt.js");
      const newTok = signToken(payload as any);
      res.json({ token: newTok, user: payload });
    } catch(e:any){ res.status(401).json({message:"invalid token"}); }
  });

  // 404
  app.use((_req,res)=>res.status(404).json({message:"Not found"}));
  // error
  app.use((err:any,_req:any,res:any,_next:any)=>{
    console.error(err);
    res.status(500).json({message: err.message||"Internal error"});
  });
  return app;
}
