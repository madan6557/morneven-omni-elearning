import { Router } from "express";
import multer from "multer";
import archiver from "archiver";
// @ts-ignore unzipper has no bundled types.
import unzipper from "unzipper";
import fs from "fs";
import path from "path";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";

const r = Router();
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const dbPath = process.env.DATABASE_URL?.startsWith("file:") ? process.env.DATABASE_URL.slice(5) : null;
const zipUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } });
const BACKUP_FORMAT = "omni-logical-backup";
const BACKUP_VERSION = 1;
const MAX_EXTRACTED_BYTES = 2 * 1024 * 1024 * 1024;
const modelNames = ["user", "course", "notification", "auditLog", "courseInstructor", "module", "material", "enrollment", "materialDownload", "videoProgress", "slideProgress", "quiz", "assignment", "assignmentSubmission", "question", "quizAttempt", "quizAnswerGrade"] as const;
const dateFields = new Set(["createdAt", "updatedAt", "lastSeenAt", "readAt", "enrolledAt", "downloadedAt", "availableFrom", "availableUntil", "deadline", "resultReleaseAt", "resultPublishedAt", "submittedAt", "gradedAt", "startedAt", "expiresAt"]);

function databaseProvider() {
  return process.env.DATABASE_URL?.startsWith("file:") ? "sqlite" : "postgresql";
}

function restoreDates(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (!dateFields.has(key) || value === null || value === undefined || value instanceof Date) return [key, value];
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) throw new Error(`Nilai tanggal ${key} tidak valid.`);
    return [key, parsed];
  }));
}

function entryByPath(entries: any[], entryPath: string) {
  return entries.find((entry: any) => entry.path === entryPath);
}

function safeUploadTarget(relativePath: string, root: string) {
  if (!relativePath || relativePath.includes("\0") || relativePath.startsWith("/") || relativePath.split("/").includes("..")) throw new Error("Path backup tidak valid.");
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path backup tidak valid.");
  return target;
}

async function readLogicalData(entries: any[]) {
  const manifestEntry = entryByPath(entries, "manifest.json");
  if (!manifestEntry) return null;
  let manifest: any;
  try {
    manifest = JSON.parse((await manifestEntry.buffer()).toString("utf8"));
  } catch {
    throw new Error("Manifest backup tidak valid.");
  }
  if (manifest?.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION) throw new Error("Versi ZIP backup tidak didukung.");
  const data: Record<string, any[]> = {};
  for (const model of modelNames) {
    const entry = entryByPath(entries, `data/${model}.json`);
    if (!entry) throw new Error(`Data backup ${model} tidak ditemukan.`);
    let rows: unknown;
    try {
      rows = JSON.parse((await entry.buffer()).toString("utf8"));
    } catch {
      throw new Error(`Data backup ${model} tidak valid.`);
    }
    if (!Array.isArray(rows)) throw new Error(`Data backup ${model} harus berupa daftar.`);
    data[model] = rows as any[];
  }
  return { manifest, data };
}

async function restoreLogicalData(data: Record<string, any[]>) {
  await prisma.$transaction(async (tx: any) => {
    for (const model of [...modelNames].reverse()) await tx[model].deleteMany({});
    for (const model of modelNames) {
      const rows = data[model] || [];
      if (rows.length) await tx[model].createMany({ data: rows.map((row) => restoreDates(row)) });
    }
  }, { maxWait: 10000, timeout: 120000 });
}

async function stageUploads(entries: any[], tempRoot: string) {
  const stagedRoot = path.join(tempRoot, "uploads");
  await fs.promises.mkdir(stagedRoot, { recursive: true });
  let extractedBytes = 0;
  for (const entry of entries.filter((item: any) => item.path.startsWith("uploads/") && !item.path.endsWith("/"))) {
    const relativePath = entry.path.slice("uploads/".length);
    extractedBytes += Number(entry.uncompressedSize || 0);
    if (extractedBytes > MAX_EXTRACTED_BYTES) throw new Error("Ukuran isi ZIP terlalu besar.");
    const target = safeUploadTarget(relativePath, stagedRoot);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, await entry.buffer());
  }
  return stagedRoot;
}

async function replaceUploads(stagedRoot: string) {
  const previousRoot = `${uploadRoot}.before-restore-${Date.now()}`;
  let movedPrevious = false;
  try {
    if (fs.existsSync(uploadRoot)) {
      await fs.promises.rename(uploadRoot, previousRoot);
      movedPrevious = true;
    }
    await fs.promises.rename(stagedRoot, uploadRoot);
  } catch (error) {
    if (movedPrevious && !fs.existsSync(uploadRoot)) await fs.promises.rename(previousRoot, uploadRoot).catch(() => undefined);
    throw error;
  }
}

r.get("/download", requireAuth as any, requireRole("ADMIN") as any, async (_req, res) => {
  try {
    const data: Record<string, any[]> = {};
    const counts: Record<string, number> = {};
    for (const model of modelNames) {
      const rows = await (prisma as any)[model].findMany();
      data[model] = rows;
      counts[model] = rows.length;
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=omni-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`);
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (error) => { if (!res.headersSent) res.status(500).json({ message: "Backup gagal dibuat.", detail: error.message }); else res.end(); });
    archive.pipe(res);
    archive.append(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(), database: databaseProvider(), models: counts }), { name: "manifest.json" });
    for (const model of modelNames) archive.append(JSON.stringify(data[model]), { name: `data/${model}.json` });
    if (fs.existsSync(uploadRoot)) archive.directory(uploadRoot, "uploads");
    await archive.finalize();
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ message: "Backup gagal dibuat.", detail: error?.message });
  }
});

r.post("/restore", requireAuth as any, requireRole("ADMIN") as any, zipUpload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ code: "BACKUP_FILE_REQUIRED", message: "File ZIP backup wajib dipilih." });
  if (!String(req.file.originalname || "").toLowerCase().endsWith(".zip")) return res.status(400).json({ code: "BACKUP_ZIP_REQUIRED", message: "File restore harus berformat ZIP." });
  const tempRoot = path.join(path.dirname(dbPath || uploadRoot), `.restore-${Date.now()}`);
  try {
    const entries = await unzipper.Open.buffer(req.file.buffer);
    const logical = await readLogicalData(entries.files);
    if (logical) {
      await fs.promises.mkdir(tempRoot, { recursive: true });
      const stagedRoot = await stageUploads(entries.files, tempRoot);
      await restoreLogicalData(logical.data);
      await replaceUploads(stagedRoot);
      void audit(req.user.id, "RESTORE", "Backup", undefined, { filename: req.file.originalname, format: BACKUP_FORMAT, version: BACKUP_VERSION }).catch(() => undefined);
      return res.json({ message: "Restore berhasil. Data database dan upload sudah dipulihkan.", format: BACKUP_FORMAT, database: databaseProvider() });
    }

    const dbEntry = entryByPath(entries.files, "database.sqlite");
    if (!dbPath || !dbEntry) return res.status(400).json({ code: "BACKUP_FORMAT_UNSUPPORTED", message: "ZIP bukan backup OMNI yang valid atau format lama hanya mendukung SQLite." });
    await fs.promises.mkdir(tempRoot, { recursive: true });
    const restoredDbPath = path.join(tempRoot, "database.sqlite");
    await fs.promises.writeFile(restoredDbPath, await dbEntry.buffer());
    const backupPath = `${dbPath}.before-restore-${Date.now()}`;
    await fs.promises.copyFile(dbPath, backupPath);
    const stagedRoot = await stageUploads(entries.files, tempRoot);
    await fs.promises.copyFile(restoredDbPath, dbPath);
    await replaceUploads(stagedRoot);
    void audit(req.user.id, "RESTORE", "Backup", undefined, { filename: req.file.originalname, format: "legacy-sqlite" }).catch(() => undefined);
    return res.json({ message: "Restore berhasil. Server perlu di-restart agar koneksi database SQLite dimuat ulang.", format: "legacy-sqlite" });
  } catch (error: any) {
    return res.status(400).json({ code: "BACKUP_RESTORE_FAILED", message: `Restore gagal: ${error?.message || "format ZIP tidak valid"}` });
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
});

export default r;
