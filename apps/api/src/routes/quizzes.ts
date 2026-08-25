import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CreateQuizSchema, SubmitQuizSchema } from "@repo/shared";
const r = Router();

r.get("/", requireAuth as any, async (req,res)=>{
  const { courseId, moduleId } = req.query as any;
  const where:any={};
  if(courseId) where.courseId=courseId;
  if(moduleId) where.moduleId=moduleId;
  const qs = await prisma.quiz.findMany({ where, include:{ questions:{ orderBy:{ order:"asc"}}, _count:{ select:{ questions:true } }}, orderBy:{ createdAt:"desc"}});
  const parsed = qs.map((q:any)=>({ ...q, questions: q.questions.map((qq:any)=>({ ...qq, options: typeof qq.options==="string" ? JSON.parse(qq.options) : qq.options }))}));
  res.json(parsed);
});

r.get("/:id", requireAuth as any, async (req,res)=>{
  const q = await prisma.quiz.findUnique({ where:{id:req.params.id}, include:{ questions:{ orderBy:{ order:"asc"}}, module:true, course:true }});
  if(!q) return res.status(404).json({message:"Not found"});
  const out = { ...q, questions: (q.questions as any[]).map((qq:any)=>({ ...qq, options: typeof qq.options==="string" ? JSON.parse(qq.options) : qq.options })) };
  res.json(out);
});

r.post("/", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const parsed = CreateQuizSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const { title, kind, courseId, moduleId, passingScore, timeLimit, attemptLimit, questions } = parsed.data;
  const quiz = await prisma.quiz.create({ data:{ title, kind: kind as any, courseId: courseId||null, moduleId: moduleId||null, passingScore, timeLimit: timeLimit ?? null, attemptLimit }});
  for(let i=0;i<questions.length;i++){
    const qq = questions[i];
    await prisma.question.create({ data:{ quizId: quiz.id, order: qq.order ?? i+1, text: qq.text, options: JSON.stringify(qq.options), correctIndex: qq.correctIndex, points: qq.points }});
  }
  const full = await prisma.quiz.findUnique({ where:{id:quiz.id}, include:{ questions:true }}) as any;
  if(full) (full as any).questions = full.questions.map((qq:any)=>({ ...qq, options: typeof qq.options==="string" ? JSON.parse(qq.options) : qq.options }));
  res.status(201).json(full);
});

r.put("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  const q = await prisma.quiz.update({ where:{id:req.params.id}, data: req.body });
  res.json(q);
});

r.delete("/:id", requireAuth as any, requireRole("ADMIN","DOSEN") as any, async (req,res)=>{
  await prisma.quiz.delete({ where:{id:req.params.id}});
  res.json({ok:true});
});

// start attempt
r.post("/:id/start", requireAuth as any, async (req:any,res)=>{
  const quiz = await prisma.quiz.findUnique({ where:{id:req.params.id}});
  if(!quiz) return res.status(404).json({message:"Not found"});
  const count = await prisma.quizAttempt.count({ where:{ userId:req.user.id, quizId:quiz.id }});
  if(count >= quiz.attemptLimit) return res.status(400).json({message:`Batas percobaan ${quiz.attemptLimit} tercapai`});
  const att = await prisma.quizAttempt.create({ data:{ userId:req.user.id, quizId:quiz.id }});
  res.status(201).json(att);
});

// submit
r.post("/:id/submit", requireAuth as any, async (req:any,res)=>{
  const parsed = SubmitQuizSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json(parsed.error);
  const quiz = await prisma.quiz.findUnique({ where:{id:req.params.id}, include:{ questions:true }});
  if(!quiz) return res.status(404).json({message:"Not found"});
  const qmap = new Map(quiz.questions.map(q=>[q.id,q]));
  let score=0, max=0;
  for(const qq of quiz.questions) max+=qq.points;
  for(const a of parsed.data.answers){
    const q = qmap.get(a.questionId);
    if(q && a.chosen===q.correctIndex) score+=q.points;
  }
  const percent = max? (score/max)*100 : 0;
  const passed = percent >= quiz.passingScore;
  // find latest unfinished attempt
  const last = await prisma.quizAttempt.findFirst({ where:{ userId:req.user.id, quizId:quiz.id, submittedAt:null }, orderBy:{ startedAt:"desc"}});
  let att;
  if(last){
    att = await prisma.quizAttempt.update({ where:{id:last.id}, data:{ answers: JSON.stringify(parsed.data.answers), score: percent, passed, submittedAt: new Date() }});
  } else {
    att = await prisma.quizAttempt.create({ data:{ userId:req.user.id, quizId:quiz.id, answers: JSON.stringify(parsed.data.answers), score: percent, passed, submittedAt: new Date() }});
  }
  res.json({ ...att, maxScore:max, rawScore:score });
});

r.get("/:id/attempts", requireAuth as any, async (req:any,res)=>{
  const where:any={ quizId:req.params.id };
  if(req.user.role==="MAHASISWA") where.userId=req.user.id;
  const atts = await prisma.quizAttempt.findMany({ where, include:{ user:{ select:{ nim:true, name:true }}}, orderBy:{ startedAt:"desc"}});
  res.json(atts);
});

export default r;
