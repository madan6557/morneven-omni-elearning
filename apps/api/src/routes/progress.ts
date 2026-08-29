import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireApiKey, requireRole } from "../middleware/auth.js";
import { VideoProgressSchema, SlideProgressSchema } from "@repo/shared";
import { denyIfNoCourseAccess } from "../lib/courseAccess.js";
import { getContentAvailability, unavailableContent } from "../lib/contentAvailability.js";
const r = Router();
const finitePercent = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0; };
const finiteScore = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : null; };
const safeVideo = (item: any) => ({ ...item, percent: finitePercent(item.percent) });
const safeSlide = (item: any) => ({ ...item, percent: finitePercent(item.percent) });
const safeAttempt = (item: any) => ({ ...item, score: finiteScore(item.score) });
// Progress belajar hanya boleh dibuat oleh akun mahasiswa pemilik progress.
r.use("/video", requireAuth as any, requireRole("MAHASISWA") as any);
r.use("/slide", requireAuth as any, requireRole("MAHASISWA") as any);

// video progress — ponytail: upsert, max watch, percent = lastPos/duration
r.post("/video", requireAuth as any, async (req:any,res)=>{
  const parsed = VideoProgressSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const { materialId, pos, duration } = parsed.data;
  const mat = await prisma.material.findUnique({ where:{id:materialId}, include: { module: { select: { courseId: true } } } });
  if(!mat) return res.status(404).json({message:"material not found"});
  if (await denyIfNoCourseAccess(req.user, mat.module.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  if (getContentAvailability(mat) !== "AVAILABLE") return unavailableContent(res, mat, "MATERIAL");
  // Prefer the catalogued duration. Legacy URL materials may not have one yet,
  // so use the validated player duration until an instructor saves metadata.
  const effectiveDuration = mat.duration && mat.duration > 0 ? mat.duration : duration;
  const safePos = Math.min(pos, effectiveDuration);
  const existing = await prisma.videoProgress.findUnique({ where:{ userId_materialId:{ userId:req.user.id, materialId }}});
  const watchedSec = Math.max(existing?.watchedSec ?? 0, Math.floor(safePos));
  const currentPercent = effectiveDuration ? Math.min(100, (safePos/effectiveDuration)*100) : 0;
  const percent = Math.max(finitePercent(existing?.percent), finitePercent(currentPercent));
  const up = await prisma.videoProgress.upsert({
    where:{ userId_materialId:{ userId:req.user.id, materialId }},
    update:{ watchedSec, lastPosition: Math.floor(safePos), percent },
    create:{ userId:req.user.id, materialId, watchedSec: Math.floor(safePos), lastPosition: Math.floor(safePos), percent }
  });
  res.json(up);
});

// slide progress — viewedPages as JSON array
r.post("/slide", requireAuth as any, async (req:any,res)=>{
  const parsed = SlideProgressSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const { materialId, page } = parsed.data;
  const mat = await prisma.material.findUnique({ where:{id:materialId}, include: { module: { select: { courseId: true } } } });
  if(!mat) return res.status(404).json({message:"material not found"});
  if (await denyIfNoCourseAccess(req.user, mat.module.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  if (getContentAvailability(mat) !== "AVAILABLE") return unavailableContent(res, mat, "MATERIAL");
  const total = mat.totalPages || 10;
  if (page > total) return res.status(400).json({ message: `Halaman harus berada di antara 1 dan ${total}.` });
  const existing = await prisma.slideProgress.findUnique({ where:{ userId_materialId:{ userId:req.user.id, materialId }}});
  let viewed: number[] = [];
  if(existing?.viewedPages) {
    try{ const parsedViewed = typeof existing.viewedPages==="string" ? JSON.parse(existing.viewedPages) : existing.viewedPages; viewed = Array.isArray(parsedViewed) ? parsedViewed.map(Number).filter((item) => Number.isInteger(item) && item >= 1) : []; } catch{ viewed=[]; }
  }
  if(!viewed.includes(page)) viewed.push(page);
  viewed = [...new Set(viewed.filter((item) => Number.isInteger(item) && item >= 1 && item <= total))].sort((a,b)=>a-b);
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
  if (await denyIfNoCourseAccess(req.user, req.params.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const course = await prisma.course.findUnique({ where:{id:req.params.courseId}, include:{ modules:{ include:{ materials:true, quizzes:true, assignments:true }}} as any});
  if(!course) return res.status(404).json({message:"course not found"});
  const materials = course.modules.flatMap((m:any)=>m.materials).filter((item:any) => !item.archived);
  const quizzes = course.modules.flatMap((m:any)=>m.quizzes).filter((item:any) => !item.archived);
  const assignments = course.modules.flatMap((m:any)=>m.assignments || []).filter((item:any) => !item.archived);
  const materialIds = materials.map((item:any)=>item.id);
  const quizIds = quizzes.map((item:any)=>item.id);
  const assignmentIds = assignments.map((item:any)=>item.id);
  const [videos, slides, downloads, attempts, submissions] = await Promise.all([
    prisma.videoProgress.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.slideProgress.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.materialDownload.findMany({ where:{ userId:req.user.id, materialId:{ "in": materialIds }}}),
    prisma.quizAttempt.findMany({ where:{ userId:req.user.id, quizId:{ "in": quizIds }}}),
    prisma.assignmentSubmission.findMany({ where:{ userId:req.user.id, assignmentId:{ in: assignmentIds }}, select:{ assignmentId:true }})
  ]);
  const videoMap = new Map(videos.map((item:any) => [item.materialId, item.percent]));
  const slideMap = new Map(slides.map((item:any) => [item.materialId, item.percent]));
  const completeMaterials = materials.filter((item:any) => finitePercent(item.type === "VIDEO" ? videoMap.get(item.id) : slideMap.get(item.id)) >= 100).length;
  const completeQuizIds = new Set(attempts.filter((item:any) => item.submittedAt).map((item:any) => item.quizId));
  const submittedIds = new Set(submissions.map((item:any) => item.assignmentId));
  const totalActivities = materials.length + quizzes.length + assignments.length;
  const completedActivities = completeMaterials + completeQuizIds.size + submittedIds.size;
  const overall = totalActivities ? Math.round((completedActivities / totalActivities) * 1000) / 10 : 0;
  res.json({ videos: videos.map(safeVideo), slides: slides.map(safeSlide), downloads, attempts: attempts.map(safeAttempt), submissions, courseProgress: { overall, materials: { completed: completeMaterials, total: materials.length }, quizzes: { completed: completeQuizIds.size, total: quizzes.length }, assignments: { completed: submittedIds.size, total: assignments.length } } });
});

// rekap dosen per course — dashboard dosen
r.get("/rekap/:courseId", requireAuth as any, async (req:any,res)=>{
  if(!["ADMIN","DOSEN"].includes(req.user.role)) return res.status(403).json({message:"Forbidden"});
  if (await denyIfNoCourseAccess(req.user, req.params.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
  const course = await prisma.course.findUnique({ where:{id:req.params.courseId}, include:{ modules:{ include:{ materials:true, quizzes:true, assignments:true }}} as any});
  if(!course) return res.status(404).json({message:"course not found"});
  const enrolls = await prisma.enrollment.findMany({ where:{ courseId: course.id }, include:{ user:{ select:{ id:true, nim:true, name:true, role:true }}}});
  const materialIds = course.modules.flatMap((m:any)=>m.materials.map((x:any)=>x.id));
  const quizIds = course.modules.flatMap((m:any)=>m.quizzes.map((q:any)=>q.id));
  const assignmentIds = course.modules.flatMap((m:any)=>m.assignments?.map((a:any)=>a.id) || []);
  const rekap = await Promise.all(enrolls.map(async (e:any)=>{
    const [videos, slides, downloads, attempts, submissions] = await Promise.all([
      prisma.videoProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.slideProgress.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.materialDownload.findMany({ where:{ userId:e.userId, materialId:{ "in": materialIds }}}),
      prisma.quizAttempt.findMany({ where:{ userId:e.userId, quizId:{ "in": quizIds }}}),
      prisma.assignmentSubmission.findMany({ where:{ userId:e.userId, assignmentId:{ in: assignmentIds }}})
    ]);
    const videoMap = new Map(videos.map((v:any)=>[v.materialId, v.percent] as const));
    const slideMap = new Map(slides.map((s:any)=>[s.materialId, s.percent] as const));
    // overall percent = avg of each material's best percent (video/slide/download) — PPT full per-slide tracking
    let sum=0;
    for(const mid of materialIds){
      const mat = course.modules.flatMap((m:any)=>m.materials).find((x:any)=>x.id===mid);
      if(!mat) continue;
      let p=0;
      if(mat.type==="VIDEO") p = finitePercent(videoMap.get(mid));
      else if(mat.type==="PDF" || mat.type==="PPT") p = finitePercent(slideMap.get(mid));
      sum+=p;
    }
    const completedQuizIds = new Set(attempts.filter((a:any) => a.submittedAt).map((a:any) => a.quizId));
    const totalActivities = materialIds.length + quizIds.length + assignmentIds.length;
    const overall = totalActivities ? (sum + completedQuizIds.size * 100 + submissions.length * 100) / totalActivities : 0;
    return { user:e.user, videos: videos.map(safeVideo), slides: slides.map(safeSlide), downloads, attempts: attempts.map(safeAttempt), submissions, overall: Math.round(Math.min(100, overall)*10)/10 };
  }));
  res.json({ course, rekap });
});

// Detailed student report for assessment — instructor/admin only.
r.get("/rekap/:courseId/student/:studentId", requireAuth as any, async (req: any, res) => {
  if (!["ADMIN", "DOSEN"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  if (await denyIfNoCourseAccess(req.user, req.params.courseId)) return res.status(403).json({ message: "Anda tidak memiliki akses ke mata kuliah ini." });
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
  const modules = course.modules.map((module: any) => ({ ...module, quizzes: module.quizzes.map((quiz: any) => ({ ...quiz, questions: quiz.questions.map((question: any) => { let options: any[] = []; try { const parsed = JSON.parse(question.options || "[]"); options = Array.isArray(parsed) ? parsed : []; } catch {} return { ...question, options }; }) })) }));
  res.json({ course: { id: course.id, title: course.title }, student: enrollment.user, modules, progress: { videos: videos.map(safeVideo), slides: slides.map(safeSlide), downloads }, attempts: attempts.map(safeAttempt), assignmentSubmissions });
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
