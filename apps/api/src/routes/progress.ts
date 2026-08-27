import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireApiKey } from "../middleware/auth.js";
import { VideoProgressSchema, SlideProgressSchema } from "@repo/shared";
const r = Router();

// video progress — ponytail: upsert, max watch, percent = lastPos/duration
r.post("/video", requireAuth as any, async (req:any,res)=>{
  const parsed = VideoProgressSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const { materialId, pos, duration } = parsed.data;
  const mat = await prisma.material.findUnique({ where:{id:materialId}});
  if(!mat) return res.status(404).json({message:"material not found"});
  const existing = await prisma.videoProgress.findUnique({ where:{ userId_materialId:{ userId:req.user.id, materialId }}});
  const watchedSec = Math.max(existing?.watchedSec ?? 0, Math.floor(pos));
  const percent = duration ? Math.min(100, (pos/duration)*100) : 0;
  const up = await prisma.videoProgress.upsert({
    where:{ userId_materialId:{ userId:req.user.id, materialId }},
    update:{ watchedSec, lastPosition: Math.floor(pos), percent },
    create:{ userId:req.user.id, materialId, watchedSec: Math.floor(pos), lastPosition: Math.floor(pos), percent }
  });
  res.json(up);
});

// slide progress — viewedPages as JSON array
r.post("/slide", requireAuth as any, async (req:any,res)=>{
  const parsed = SlideProgressSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const { materialId, page } = parsed.data;
  const mat = await prisma.material.findUnique({ where:{id:materialId}});
  if(!mat) return res.status(404).json({message:"material not found"});
  const total = mat.totalPages || 10;
  const existing = await prisma.slideProgress.findUnique({ where:{ userId_materialId:{ userId:req.user.id, materialId }}});
  let viewed: number[] = [];
  if(existing?.viewedPages) {
    try{ viewed = typeof existing.viewedPages==="string" ? JSON.parse(existing.viewedPages) : existing.viewedPages as number[]; } catch{ viewed=[]; }
  }
  if(!viewed.includes(page)) viewed.push(page);
  viewed = [...new Set(viewed)].sort((a,b)=>a-b);
  const percent = Math.min(100, (viewed.length/total)*100);
  const up = await prisma.slideProgress.upsert({
    where:{ userId_materialId:{ userId:req.user.id, materialId }},
    update:{ viewedPages: JSON.stringify(viewed), currentPage: page, percent },
    create:{ userId:req.user.id, materialId, viewedPages: JSON.stringify(viewed), currentPage: page, percent }
  });
  res.json(up);
});

// get my progress per course
r.get("/course/:courseId", requireAuth as any, async (req:any,res)=>{
  const course = await prisma.course.findUnique({ where:{id:req.params.courseId}, include:{ modules:{ include:{ materials:true, quizzes:true }}} as any});
  if(!course) return res.status(404).json({message:"course not found"});
  const materialIds = course.modules.flatMap((m:any)=>m.materials.map((x:any)=>x.id));
  const [videos, slides, downloads, attempts] = await Promise.all([
    prisma.videoProgress.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.slideProgress.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.materialDownload.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.quizAttempt.findMany({ where:{ userId:req.user.id, quizId:{ "in": course.modules.flatMap((m:any)=>m.quizzes.map((q:any)=>q.id)) }}})
  ]);
  res.json({ videos, slides, downloads, attempts });
});

// rekap dosen per course — dashboard dosen
r.get("/rekap/:courseId", requireAuth as any, async (req:any,res)=>{
  if(!["ADMIN","DOSEN"].includes(req.user.role)) return res.status(403).json({message:"Forbidden"});
  const course = await prisma.course.findUnique({ where:{id:req.params.courseId}, include:{ modules:{ include:{ materials:true, quizzes:true }}} as any});
  if(!course) return res.status(404).json({message:"course not found"});
  const enrolls = await prisma.enrollment.findMany({ where:{ courseId: course.id }, include:{ user:{ select:{ id:true, nim:true, name:true, role:true }}}});
  const materialIds = course.modules.flatMap((m:any)=>m.materials.map((x:any)=>x.id));
  const quizIds = course.modules.flatMap((m:any)=>m.quizzes.map((q:any)=>q.id));
  const rekap = await Promise.all(enrolls.map(async (e:any)=>{
    const [videos, slides, downloads, attempts] = await Promise.all([
      prisma.videoProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.slideProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.materialDownload.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.quizAttempt.findMany({ where:{ userId:e.userId, quizId:{ "in": quizIds }}})
    ]);
    const totalMats = materialIds.length || 1;
    const videoMap = new Map(videos.map((v:any)=>[v.materialId, v.percent] as const));
    const slideMap = new Map(slides.map((s:any)=>[s.materialId, s.percent] as const));
    const downloadedSet = new Set(downloads.map((d:any)=>d.materialId));
    // overall percent = avg of each material's best percent (video/slide/download) — PPT full per-slide tracking
    let sum=0;
    for(const mid of materialIds){
      const mat = course.modules.flatMap((m:any)=>m.materials).find((x:any)=>x.id===mid);
      if(!mat) continue;
      let p=0;
      if(mat.type==="VIDEO") p = (videoMap.get(mid) as number) ?? 0;
      else if(mat.type==="PDF" || mat.type==="PPT") {
        const sp = (slideMap.get(mid) as number) ?? 0;
        p = sp > 0 ? sp : (downloadedSet.has(mid) ? 5 : 0);
      }
      sum+=p;
    }
    const overall = sum/totalMats;
    return { user:e.user, videos, slides, downloads, attempts, overall: Math.round(overall*10)/10 };
  }));
  res.json({ course, rekap });
});

// Detailed student report for assessment — instructor/admin only.
r.get("/rekap/:courseId/student/:studentId", requireAuth as any, async (req: any, res) => {
  if (!["ADMIN", "DOSEN"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.params.studentId, courseId: req.params.courseId } }, include: { user: { select: { id: true, nim: true, name: true, role: true } } } });
  if (!enrollment) return res.status(404).json({ message: "Mahasiswa tidak terdaftar pada matkul ini." });
  const course = await prisma.course.findUnique({
    where: { id: req.params.courseId },
    include: { modules: { orderBy: { order: "asc" }, include: { materials: { orderBy: { order: "asc" } }, assignments: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] }, quizzes: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { questions: { orderBy: { order: "asc" }, select: { id: true, type: true, text: true, options: true, correctIndex: true, points: true, imageUrl: true } } } } } } } as any,
  });
  if (!course) return res.status(404).json({ message: "course not found" });
  const materialIds = course.modules.flatMap((m: any) => m.materials.map((item: any) => item.id));
  const quizIds = course.modules.flatMap((m: any) => m.quizzes.map((item: any) => item.id));
  const assignmentIds = course.modules.flatMap((m: any) => m.assignments.map((item: any) => item.id));
  const [videos, slides, downloads, attempts, assignmentSubmissions] = await Promise.all([
    prisma.videoProgress.findMany({ where: { userId: req.params.studentId, materialId: { in: materialIds } } }),
    prisma.slideProgress.findMany({ where: { userId: req.params.studentId, materialId: { in: materialIds } } }),
    prisma.materialDownload.findMany({ where: { userId: req.params.studentId, materialId: { in: materialIds } } }),
    prisma.quizAttempt.findMany({ where: { userId: req.params.studentId, quizId: { in: quizIds } }, include: { answerGrades: true }, orderBy: { startedAt: "desc" } }),
    prisma.assignmentSubmission.findMany({ where: { userId: req.params.studentId, assignmentId: { in: assignmentIds } } }),
  ]);
  const modules = course.modules.map((module: any) => ({ ...module, quizzes: module.quizzes.map((quiz: any) => ({ ...quiz, questions: quiz.questions.map((question: any) => ({ ...question, options: JSON.parse(question.options || "[]") })) })) }));
  res.json({ course: { id: course.id, title: course.title }, student: enrollment.user, modules, progress: { videos, slides, downloads }, attempts, assignmentSubmissions });
});

// integration export (API_KEY)
r.get("/integration/export/:courseId", requireApiKey as any, async (req,res)=>{
  const courseId = req.params.courseId;
  const enrolls = await prisma.enrollment.findMany({ where:{ courseId }, include:{ user:true }});
  const course = await prisma.course.findUnique({ where:{id:courseId}, include:{ modules:{ include:{ materials:true, quizzes:true }}} as any});
  if(!course) return res.status(404).json({message:"course not found"});
  const materialIds = course.modules.flatMap((m:any)=>m.materials.map((x:any)=>x.id));
  const out = await Promise.all(enrolls.map(async (e:any)=>{
    const videos = await prisma.videoProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}});
    const slides = await prisma.slideProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}});
    const downloads = await prisma.materialDownload.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}});
    return { nim:e.user.nim, name:e.user.name, videos, slides, downloads };
  }));
  res.json({ course, data: out });
});

export default r;
