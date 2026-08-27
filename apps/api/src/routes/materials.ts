import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CreateMaterialSchema } from "@repo/shared";
const r = Router();
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,uploadDir),
  filename: (_req,file,cb)=>cb(null, Date.now()+"-"+file.originalname.replace(/\s+/g,"_"))
});
const upload = multer({ storage, limits:{ fileSize: 500*1024*1024 } });

// create material
r.post("/", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const parsed = CreateMaterialSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const last = await prisma.material.findFirst({ where: { moduleId: parsed.data.moduleId }, orderBy: { order: "desc" } });
  const m = await prisma.material.create({ data: { ...parsed.data, order: (last?.order ?? 0) + 1 } });
  res.status(201).json(m);
});

// upload file then create material
r.post("/upload", requireAuth as any, requireRole("ADMIN","DOSEN") as any, upload.single("file"), async (req:any,res)=>{
  if(!req.file) return res.status(400).json({message:"file required"});
  const { moduleId, title, type } = req.body;
  if(!moduleId || !title || !type) return res.status(400).json({message:"moduleId, title, type required"});
  const sourceUrl = `/uploads/${req.file.filename}`;
  const totalPages = (type==="PDF" || type==="PPT") ? Number(req.body.totalPages|| (type==="PPT"?10:12)) : undefined;
  const last = await prisma.material.findFirst({ where: { moduleId }, orderBy: { order: "desc" } });
  const m = await prisma.material.create({ data:{ moduleId, title, type, sourceType:"upload", sourceUrl, order: (last?.order ?? 0) + 1, totalPages, duration: type==="VIDEO"? Number(req.body.duration||0): undefined } });
  res.status(201).json(m);
});

r.get("/:id", requireAuth as any, async (req,res)=>{
  const m = await prisma.material.findUnique({ where:{id:req.params.id}, include:{ module:true }});
  if(!m || (m.archived && (req as any).user.role === "MAHASISWA")) return res.status(404).json({message:"Not found"});
  res.json(m);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const m = await prisma.material.update({ where:{id:req.params.id}, data:req.body });
  res.json(m);
});

r.patch("/:id/reorder", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req:any,res)=>{
  const current = await prisma.material.findUnique({ where:{id:req.params.id} }); if (!current) return res.status(404).json({message:"Materi tidak ditemukan."});
  const items = await prisma.material.findMany({ where:{moduleId:current.moduleId}, orderBy:[{order:"asc"},{createdAt:"asc"}] }); const index=items.findIndex((item)=>item.id===current.id); const target=index+(req.body.direction==="up"?-1:1); if(target<0||target>=items.length) return res.json(current);
  await prisma.$transaction(async(tx)=>{ await tx.material.update({where:{id:current.id},data:{order:-1}}); await tx.material.update({where:{id:items[target].id},data:{order:current.order}}); await tx.material.update({where:{id:current.id},data:{order:items[target].order}}); }); res.json(await prisma.material.findUnique({where:{id:current.id}}));
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const item=await prisma.material.findUnique({where:{id:req.params.id}}); await prisma.material.delete({ where:{id:req.params.id}});
  if(item){const rest=await prisma.material.findMany({where:{moduleId:item.moduleId},orderBy:[{order:"asc"},{createdAt:"asc"}]}); await prisma.$transaction(rest.map((row,index)=>prisma.material.update({where:{id:row.id},data:{order:index+1}})));}
  res.json({ok:true});
});

// download tracking — ponytail: single endpoint logs then streams/redirects
r.get("/:id/download", requireAuth as any, async (req:any,res)=>{
  const m = await prisma.material.findUnique({ where:{id:req.params.id}});
  if(!m) return res.status(404).json({message:"Not found"});
  await prisma.materialDownload.create({ data:{ userId:req.user.id, materialId:m.id }});
  // if upload file, stream it; if youtube/drive, redirect
  if(m.sourceType==="upload" && m.sourceUrl.startsWith("/uploads/")){
    const fp = path.join(process.cwd(), m.sourceUrl.replace(/^\//,""));
    if(fs.existsSync(fp)) return res.download(fp, path.basename(fp));
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
