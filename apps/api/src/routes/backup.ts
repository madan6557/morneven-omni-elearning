import { Router } from "express";
import multer from "multer";
import archiver from "archiver";
// @ts-ignore unzipper has no bundled types.
import unzipper from "unzipper";
import fs from "fs";
import path from "path";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

const r = Router();
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const dbPath = process.env.DATABASE_URL?.startsWith("file:") ? process.env.DATABASE_URL.slice(5) : null;
const zipUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } });

r.get("/download", requireAuth as any, requireRole("ADMIN") as any, async (_req, res) => {
  if (!dbPath || !fs.existsSync(dbPath)) return res.status(500).json({ message: "Backup file database tidak tersedia." });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=elearning-backup-${new Date().toISOString().slice(0, 10)}.zip`);
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (error) => { if (!res.headersSent) res.status(500).json({ message: error.message }); else res.end(); });
  archive.pipe(res);
  archive.file(dbPath, { name: "database.sqlite" });
  if (fs.existsSync(uploadRoot)) archive.directory(uploadRoot, "uploads");
  await archive.finalize();
});

r.post("/restore", requireAuth as any, requireRole("ADMIN") as any, zipUpload.single("file"), async (req: any, res) => {
  if (!dbPath) return res.status(400).json({ message: "Restore ZIP saat ini hanya mendukung database SQLite." });
  if (!req.file) return res.status(400).json({ message: "File ZIP backup wajib dipilih." });
  const tempRoot = path.join(path.dirname(dbPath), `.restore-${Date.now()}`);
  try {
    const entries = await unzipper.Open.buffer(req.file.buffer);
    const dbEntry = entries.files.find((entry: any) => entry.path === "database.sqlite" && !entry.path.includes(".."));
    if (!dbEntry) return res.status(400).json({ message: "ZIP bukan backup Omni yang valid." });
    await fs.promises.mkdir(tempRoot, { recursive: true });
    await fs.promises.writeFile(path.join(tempRoot, "database.sqlite"), await dbEntry.buffer());
    const backupPath = `${dbPath}.before-restore-${Date.now()}`;
    await fs.promises.copyFile(dbPath, backupPath);
    await fs.promises.copyFile(path.join(tempRoot, "database.sqlite"), dbPath);
    await fs.promises.rm(uploadRoot, { recursive: true, force: true });
    await fs.promises.mkdir(uploadRoot, { recursive: true });
    for (const entry of entries.files.filter((item: any) => item.path.startsWith("uploads/") && !item.path.includes("..") && !item.path.endsWith("/"))) {
      const target = path.resolve(uploadRoot, entry.path.slice("uploads/".length));
      if (!target.startsWith(`${uploadRoot}${path.sep}`)) throw new Error("Path backup tidak valid.");
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, await entry.buffer());
    }
    void audit(req.user.id, "RESTORE", "Backup", undefined, { filename: req.file.originalname });
    res.json({ message: "Restore berhasil. Server perlu di-restart agar koneksi database dimuat ulang." });
  } catch (error: any) {
    res.status(400).json({ message: `Restore gagal: ${error.message || "format ZIP tidak valid"}` });
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
});

export default r;
