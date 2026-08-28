import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CreateMaterialSchema } from "@repo/shared";
import { denyIfNoCourseAccess } from "../lib/courseAccess.js";
import { notifyCourseStudents } from "../lib/notifications.js";
import { getContentAvailability, unavailableContent } from "../lib/contentAvailability.js";
const r = Router();
const validateReorder = (req: any, res: any, next: any) => ["up", "down"].includes(req.body.direction) ? next() : res.status(400).json({ message: "direction harus bernilai up atau down." });
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const uploadRoot = path.resolve(uploadDir);
const localUploadPath = (url?: string | null) => {
  if (!url?.startsWith("/uploads/")) return null;
  const filePath = path.resolve(uploadRoot, url.slice("/uploads/".length));
  return filePath.startsWith(`${uploadRoot}${path.sep}`) ? filePath : null;
};
const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "ya"].includes(normalized)) return true;
  if (["false", "0", "no", "tidak"].includes(normalized)) return false;
  return null;
};
const validSource = (sourceType: string, sourceUrl: string) => {
  if (sourceType === "upload") return sourceUrl.startsWith("/uploads/");
  return sourceUrl.startsWith("/uploads/") || /^https?:\/\//i.test(sourceUrl) || /^[A-Za-z0-9_-]{3,200}$/.test(sourceUrl);
};
const removeMaterialFileIfUnused = async (url?: string | null) => {
  if (!url) return;
  const filePath = localUploadPath(url);
  if (!filePath) return;
  const stillUsed = await prisma.material.count({ where: { sourceUrl: url } });
  if (!stillUsed && fs.existsSync(filePath)) await fs.promises.unlink(filePath);
};
const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,uploadDir),
  filename: (_req,file,cb)=>cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`)
});
const materialMimeTypes: Record<string, string[]> = { ".pdf": ["application/pdf"], ".ppt": ["application/vnd.ms-powerpoint"], ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], ".mp4": ["video/mp4"], ".webm": ["video/webm"], ".mov": ["video/quicktime"] };
const upload = multer({ storage, limits:{ fileSize: 500*1024*1024 }, fileFilter: (_req, file, cb) => { const ext = path.extname(file.originalname).toLowerCase(); cb(null, Boolean(materialMimeTypes[ext]?.includes(file.mimetype))); } });
const safeMaterialUpload = (req: any, res: any, next: any) => upload.single("file")(req, res, (error: any) => error ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Ukuran materi maksimal 500 MB." : "Format materi tidak diizinkan. Gunakan PDF, PPT, MP4, WEBM, atau MOV." }) : next());
r.use("/:id", requireAuth as any, async (req: any, res, next) => { const material = await prisma.material.findUnique({ where: { id: req.params.id }, select: { module: { select: { courseId: true } } } }); if (material?.module && await denyIfNoCourseAccess(req.user, material.module.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." }); next(); });

// create material
r.post("/", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const moduleAccess = await prisma.module.findUnique({ where: { id: req.body.moduleId }, select: { courseId: true } });
  if (!moduleAccess || await denyIfNoCourseAccess((req as any).user, moduleAccess.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const moduleCheck = await prisma.module.findUnique({ where: { id: req.body.moduleId }, select: { type: true } });
  if (moduleCheck?.type === "UTS" || moduleCheck?.type === "UAS") return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." });
  const parsed = CreateMaterialSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  if (!validSource(parsed.data.sourceType, parsed.data.sourceUrl)) return res.status(400).json({ message: "Sumber materi tidak sesuai dengan tipe sumber." });
  const last = await prisma.material.findFirst({ where: { moduleId: parsed.data.moduleId }, orderBy: { order: "desc" } });
  const [assignmentContent, materialContent, quizContent] = await Promise.all([prisma.assignment.findFirst({ where: { moduleId: parsed.data.moduleId }, orderBy: { contentOrder: "desc" } }), prisma.material.findFirst({ where: { moduleId: parsed.data.moduleId }, orderBy: { contentOrder: "desc" } }), prisma.quiz.findFirst({ where: { moduleId: parsed.data.moduleId }, orderBy: { contentOrder: "desc" } })]);
  const m = await prisma.material.create({ data: { ...parsed.data, isOpen: parsed.data.isOpen !== false, availableFrom: parsed.data.availableFrom ? new Date(parsed.data.availableFrom) : null, availableUntil: parsed.data.availableUntil ? new Date(parsed.data.availableUntil) : null, order: (last?.order ?? 0) + 1, contentOrder: Math.max(assignmentContent?.contentOrder ?? 0, materialContent?.contentOrder ?? 0, quizContent?.contentOrder ?? 0) + 1 } });
  void notifyCourseStudents(moduleAccess.courseId, "MATERIAL_CREATED", "Materi baru", `Materi ${m.title} tersedia.`, `material:${m.id}:created`, `/material/${m.id}`);
  res.status(201).json(m);
});

// upload file then create material
r.post("/upload", requireAuth as any, requireRole("ADMIN","DOSEN") as any, safeMaterialUpload, async (req:any,res)=>{
  if(!req.file) return res.status(400).json({message:"file required"});
  const { moduleId, title, type } = req.body;
  if(!moduleId || !title || !type) return res.status(400).json({message:"moduleId, title, type required"});
  const moduleAccess = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!moduleAccess || await denyIfNoCourseAccess(req.user, moduleAccess.courseId)) { await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." }); }
  const moduleCheck = await prisma.module.findUnique({ where: { id: moduleId }, select: { type: true } });
  if (moduleCheck?.type === "UTS" || moduleCheck?.type === "UAS") { await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." }); }
  if (!['VIDEO', 'PDF', 'PPT'].includes(type)) { await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Tipe materi tidak valid." }); }
  const sourceUrl = `/uploads/${req.file.filename}`;
  const isOpen = parseBoolean(req.body.isOpen, true);
  const requireCompletionForDownload = parseBoolean(req.body.requireCompletionForDownload, false);
  const duration = req.body.duration === "" || req.body.duration === undefined ? 0 : Number(req.body.duration);
  const totalPages = (type==="PDF" || type==="PPT") ? Number(req.body.totalPages || (type==="PPT"?10:12)) : undefined;
  if (isOpen === null || requireCompletionForDownload === null || !Number.isFinite(duration) || duration < 0 || (totalPages !== undefined && (!Number.isInteger(totalPages) || totalPages <= 0))) { await removeMaterialFileIfUnused(sourceUrl); return res.status(400).json({ message: "Pengaturan materi, durasi, atau jumlah halaman tidak valid." }); }
  const last = await prisma.material.findFirst({ where: { moduleId }, orderBy: { order: "desc" } });
  const [assignmentContent, materialContent, quizContent] = await Promise.all([prisma.assignment.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.material.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } }), prisma.quiz.findFirst({ where: { moduleId }, orderBy: { contentOrder: "desc" } })]);
  try {
    const availableFrom = req.body.availableFrom ? new Date(req.body.availableFrom) : null;
    const availableUntil = req.body.availableUntil ? new Date(req.body.availableUntil) : null;
    if ((availableFrom && Number.isNaN(availableFrom.getTime())) || (availableUntil && Number.isNaN(availableUntil.getTime())) || (availableFrom && availableUntil && availableUntil < availableFrom)) throw new Error("Jadwal materi tidak valid.");
    if (String(title).trim().length < 2 || String(title).trim().length > 200) throw new Error("Judul materi harus 2 sampai 200 karakter.");
    const m = await prisma.material.create({ data:{ moduleId, title: String(title).trim(), type, sourceType:"upload", sourceUrl, isOpen, requireCompletionForDownload, availableFrom, availableUntil, order: (last?.order ?? 0) + 1, contentOrder: Math.max(assignmentContent?.contentOrder ?? 0, materialContent?.contentOrder ?? 0, quizContent?.contentOrder ?? 0) + 1, totalPages, duration: type==="VIDEO" ? duration : undefined } });
    void notifyCourseStudents(moduleAccess.courseId, "MATERIAL_CREATED", "Materi baru", `Materi ${m.title} tersedia.`, `material:${m.id}:created`, `/material/${m.id}`);
    res.status(201).json(m);
  } catch (error) {
    await removeMaterialFileIfUnused(sourceUrl);
    throw error;
  }
});

r.get("/:id", requireAuth as any, async (req,res)=>{
  const m = await prisma.material.findUnique({ where:{id:req.params.id}, include:{ module:true }});
  if(!m || (m.archived && (req as any).user.role === "MAHASISWA")) return res.status(404).json({message:"Not found"});
  if ((req as any).user.role === "MAHASISWA" && getContentAvailability(m) !== "AVAILABLE") return unavailableContent(res, m, "MATERIAL");
  res.json((req as any).user.role === "MAHASISWA" && m.sourceType === "upload" ? { ...m, sourceUrl: `/api/materials/${m.id}/file` } : m);
});

r.get("/:id/file", requireAuth as any, async (req: any, res) => {
  const material = await prisma.material.findUnique({ where: { id: req.params.id } });
  if (!material || material.sourceType !== "upload") return res.status(404).json({ message: "File materi tidak ditemukan." });
  if (req.user.role === "MAHASISWA" && getContentAvailability(material) !== "AVAILABLE") return unavailableContent(res, material, "MATERIAL");
  const filePath = localUploadPath(material.sourceUrl);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ message: "File materi tidak tersedia di storage." });
  res.sendFile(filePath, { headers: { "Content-Disposition": `inline; filename="${path.basename(filePath)}"` } });
});

r.put("/:id/upload", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, safeMaterialUpload, async (req: any, res) => {
  const existing = await prisma.material.findUnique({ where: { id: req.params.id }, include: { module: { select: { courseId: true, type: true } } } });
  if (!existing) { if (req.file) await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(404).json({ message: "Materi tidak ditemukan." }); }
  if (await denyIfNoCourseAccess(req.user, existing.module.courseId)) { if (req.file) await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." }); }
  if (existing.module.type === "UTS" || existing.module.type === "UAS") { if (req.file) await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." }); }
  if (!req.file) return res.status(400).json({ message: "File bahan ajar wajib dipilih." });
  const type = String(req.body.type || existing.type).toUpperCase();
  if (!["VIDEO", "PDF", "PPT"].includes(type)) { await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Tipe materi tidak valid." }); }
  const availableFrom = req.body.availableFrom ? new Date(req.body.availableFrom) : existing.availableFrom;
  const availableUntil = req.body.availableUntil ? new Date(req.body.availableUntil) : existing.availableUntil;
  if ((availableFrom && Number.isNaN(availableFrom.getTime())) || (availableUntil && Number.isNaN(availableUntil.getTime())) || (availableFrom && availableUntil && availableUntil < availableFrom)) { await removeMaterialFileIfUnused(`/uploads/${req.file.filename}`); return res.status(400).json({ message: "Jadwal materi tidak valid." }); }
  const sourceUrl = `/uploads/${req.file.filename}`;
  try {
    const title = req.body.title === undefined ? existing.title : String(req.body.title).trim();
    const isOpen = parseBoolean(req.body.isOpen, existing.isOpen);
    const requireCompletionForDownload = parseBoolean(req.body.requireCompletionForDownload, existing.requireCompletionForDownload);
    const duration = req.body.duration === "" ? null : req.body.duration === undefined ? existing.duration : Number(req.body.duration);
    const totalPages = req.body.totalPages === "" ? null : req.body.totalPages === undefined ? existing.totalPages : Number(req.body.totalPages);
    if (title.length < 2 || title.length > 200 || isOpen === null || requireCompletionForDownload === null || (duration !== null && (!Number.isFinite(duration) || duration < 0)) || (totalPages !== null && (!Number.isInteger(totalPages) || totalPages <= 0))) throw new Error("Data materi tidak valid.");
    const item = await prisma.material.update({ where: { id: existing.id }, data: { title, type, sourceType: "upload", sourceUrl, duration, totalPages, isOpen, availableFrom, availableUntil, requireCompletionForDownload } });
    await removeMaterialFileIfUnused(existing.sourceUrl);
    res.json(item);
  } catch (error) {
    await removeMaterialFileIfUnused(sourceUrl);
    throw error;
  }
});

r.put("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const existing = await prisma.material.findUnique({ where:{id:req.params.id}, include: { module: { select: { courseId: true } } } });
  if (!existing) return res.status(404).json({message:"Materi tidak ditemukan."});
  const moduleId = req.body.moduleId ?? existing.moduleId;
  const targetModule = await prisma.module.findUnique({ where: { id: moduleId }, select: { type: true, courseId: true } });
  if (!targetModule) return res.status(400).json({ message: "Modul materi tidak ditemukan." });
  if (targetModule.courseId !== existing.module.courseId) return res.status(400).json({ message: "Materi tidak dapat dipindahkan ke mata kuliah lain." });
  if (targetModule?.type === "UTS" || targetModule?.type === "UAS") return res.status(400).json({ message: "Modul UTS/UAS hanya dapat berisi quiz dan bank soal." });
  const { title, type, sourceType, sourceUrl, duration, totalPages, archived, isOpen, requireCompletionForDownload } = req.body;
  const nextTitle = title === undefined ? existing.title : String(title).trim();
  const nextType = type === undefined ? existing.type : String(type).toUpperCase();
  const nextSourceType = sourceType === undefined ? existing.sourceType : String(sourceType).toLowerCase();
  const nextSourceUrl = sourceUrl === undefined ? existing.sourceUrl : String(sourceUrl).trim();
  if (nextTitle.length < 2 || nextTitle.length > 200 || !["VIDEO", "PDF", "PPT"].includes(nextType) || !["youtube", "drive", "upload"].includes(nextSourceType) || !validSource(nextSourceType, nextSourceUrl)) return res.status(400).json({ message: "Data sumber atau materi tidak valid." });
  const availableFrom = req.body.availableFrom === undefined ? existing.availableFrom : req.body.availableFrom;
  const availableUntil = req.body.availableUntil === undefined ? existing.availableUntil : req.body.availableUntil;
  const start = availableFrom ? new Date(availableFrom) : null;
  const end = availableUntil ? new Date(availableUntil) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (start && end && end < start)) return res.status(400).json({ message: "Jadwal materi tidak valid." });
  const nextDuration = duration === undefined ? existing.duration : duration === "" || duration === null ? null : Number(duration);
  const nextTotalPages = totalPages === undefined ? existing.totalPages : totalPages === "" || totalPages === null ? null : Number(totalPages);
  if ((nextDuration !== null && (!Number.isFinite(nextDuration) || nextDuration < 0)) || (nextTotalPages !== null && (!Number.isInteger(nextTotalPages) || nextTotalPages <= 0))) return res.status(400).json({ message: "Durasi atau jumlah halaman tidak valid." });
  const m = await prisma.material.update({ where:{id:req.params.id}, data: { moduleId, title: nextTitle, type: nextType, sourceType: nextSourceType, sourceUrl: nextSourceUrl, availableFrom: start, availableUntil: end, duration: nextDuration, totalPages: nextTotalPages, ...(typeof archived === "boolean" ? { archived } : {}), ...(typeof isOpen === "boolean" ? { isOpen } : {}), ...(typeof requireCompletionForDownload === "boolean" ? { requireCompletionForDownload } : {}) } });
  if (req.body.sourceUrl && req.body.sourceUrl !== existing.sourceUrl) await removeMaterialFileIfUnused(existing.sourceUrl);
  res.json(m);
});

r.patch("/:id/reorder", requireAuth as any, requireRole("ADMIN","DOSEN") as any, validateReorder, async (req:any,res)=>{
  const current = await prisma.material.findUnique({ where:{id:req.params.id} }); if (!current) return res.status(404).json({message:"Materi tidak ditemukan."});
  const items = await prisma.material.findMany({ where:{moduleId:current.moduleId}, orderBy:[{order:"asc"},{createdAt:"asc"}] }); const index=items.findIndex((item)=>item.id===current.id); const target=index+(req.body.direction==="up"?-1:1); if(target<0||target>=items.length) return res.json(current);
  await prisma.$transaction(async(tx)=>{ await tx.material.update({where:{id:current.id},data:{order:-1}}); await tx.material.update({where:{id:items[target].id},data:{order:current.order}}); await tx.material.update({where:{id:current.id},data:{order:items[target].order}}); }); res.json(await prisma.material.findUnique({where:{id:current.id}}));
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const item=await prisma.material.findUnique({where:{id:req.params.id}}); if (!item) return res.status(404).json({message:"Materi tidak ditemukan."}); await prisma.material.delete({ where:{id:req.params.id}});
  await removeMaterialFileIfUnused(item?.sourceUrl);
  const rest=await prisma.material.findMany({where:{moduleId:item.moduleId},orderBy:[{order:"asc"},{createdAt:"asc"}]}); await prisma.$transaction(rest.map((row,index)=>prisma.material.update({where:{id:row.id},data:{order:index+1}})));
  res.json({ok:true});
});

// download tracking — ponytail: single endpoint logs then streams/redirects
r.get("/:id/download", requireAuth as any, async (req:any,res)=>{
  const m = await prisma.material.findUnique({ where:{id:req.params.id}});
  if(!m) return res.status(404).json({message:"Not found"});
  if (req.user.role === "MAHASISWA" && getContentAvailability(m) !== "AVAILABLE") return unavailableContent(res, m, "MATERIAL");
  if (req.user.role === "MAHASISWA" && m.requireCompletionForDownload) { const progress = m.type === "VIDEO" ? await prisma.videoProgress.findUnique({ where: { userId_materialId: { userId: req.user.id, materialId: m.id } } }) : await prisma.slideProgress.findUnique({ where: { userId_materialId: { userId: req.user.id, materialId: m.id } } }); if (!progress || progress.percent < 100) return res.status(403).json({ message: "Selesaikan membaca materi hingga 100% sebelum download." }); }
  await prisma.materialDownload.create({ data:{ userId:req.user.id, materialId:m.id }});
  // if upload file, stream it; if youtube/drive, redirect
  if(m.sourceType==="upload" && m.sourceUrl.startsWith("/uploads/")){
    const fp = localUploadPath(m.sourceUrl);
    if(fp && fs.existsSync(fp)) return res.download(fp, path.basename(fp));
  }
  // external
  if(m.sourceUrl.startsWith("http")) return res.redirect(m.sourceUrl);
  res.json({ message:"download logged", sourceUrl:m.sourceUrl });
});

r.get("/:id/downloads", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const logs = await prisma.materialDownload.findMany({ where:{materialId:req.params.id}, include:{ user:{ select:{ nim:true, name:true }}}, orderBy:{ downloadedAt:"desc"}});
  res.json(logs);
});

export default r;
