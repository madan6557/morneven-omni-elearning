import { Router } from "express";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { denyIfNoCourseAccess } from "../lib/courseAccess.js";

const r = Router();
const date = (value: unknown) => { if (!value) return undefined; const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? undefined : parsed; };
const csvSafe = (value: unknown) => String(value ?? "").replace(/[\r\n,]/g, " ");
const finiteScore = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : null; };

async function buildReport(req: any) {
  const courseId = req.params.courseId;
  if (await denyIfNoCourseAccess(req.user, courseId)) throw Object.assign(new Error("Anda tidak memiliki akses ke mata kuliah ini."), { status: 403 });
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { modules: { orderBy: { order: "asc" }, include: { materials: { orderBy: { order: "asc" } }, assignments: { orderBy: { order: "asc" } }, quizzes: { orderBy: { order: "asc" }, include: { questions: true } } } } } });
  if (!course) throw Object.assign(new Error("Mata kuliah tidak ditemukan."), { status: 404 });
  const moduleId = String(req.query.moduleId || ""); const kind = String(req.query.kind || ""); const from = date(req.query.from); const to = date(req.query.to);
  const modules = course.modules.filter((item) => !moduleId || item.id === moduleId);
  const materials = modules.flatMap((item) => item.materials).filter((item) => !item.archived);
  const assignments = modules.flatMap((item) => item.assignments).filter((item) => !item.archived);
  const quizzes = modules.flatMap((item) => item.quizzes).filter((item) => !item.archived && (!kind || (modules.find((mod) => mod.id === item.moduleId)?.type === kind || item.kind === kind)));
  const materialIds = materials.map((item) => item.id), assignmentIds = assignments.map((item) => item.id), quizIds = quizzes.map((item) => item.id);
  const enrollments = await prisma.enrollment.findMany({ where: { courseId, user: { role: "MAHASISWA" } }, include: { user: { select: { id: true, nim: true, name: true, role: true } } }, orderBy: { enrolledAt: "asc" } });
  const summary: any[] = [], materialProgress: any[] = [], attemptsOut: any[] = [], submissionsOut: any[] = [], downloadsOut: any[] = [];
  const userIds = enrollments.map((item) => item.userId);
  const [allVideos, allSlides, allDownloads, allAttempts, allSubmissions] = await Promise.all([
    prisma.videoProgress.findMany({ where: { userId: { in: userIds }, materialId: { in: materialIds } } }),
    prisma.slideProgress.findMany({ where: { userId: { in: userIds }, materialId: { in: materialIds } } }),
    prisma.materialDownload.findMany({ where: { userId: { in: userIds }, materialId: { in: materialIds } } }),
    prisma.quizAttempt.findMany({ where: { userId: { in: userIds }, quizId: { in: quizIds }, ...(from || to ? { startedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { quiz: { select: { id: true, title: true, kind: true, module: { select: { title: true, type: true } } } }, answerGrades: { include: { question: { select: { text: true, type: true, points: true } }, grader: { select: { nim: true, name: true } } } } }, orderBy: { startedAt: "asc" } }),
    prisma.assignmentSubmission.findMany({ where: { userId: { in: userIds }, assignmentId: { in: assignmentIds }, ...(from || to ? { submittedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { assignment: { select: { id: true, title: true, deadline: true, module: { select: { title: true } } } } }, orderBy: { submittedAt: "asc" } }),
  ]);
  const grouped = <T extends { userId: string }>(items: T[]) => items.reduce((map, item) => map.set(item.userId, [...(map.get(item.userId) || []), item]), new Map<string, T[]>());
  const videosByUser = grouped(allVideos), slidesByUser = grouped(allSlides), downloadsByUser = grouped(allDownloads), attemptsByUser = grouped(allAttempts), submissionsByUser = grouped(allSubmissions);
  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const videos = videosByUser.get(userId) || [], slides = slidesByUser.get(userId) || [], downloads = downloadsByUser.get(userId) || [], attempts = attemptsByUser.get(userId) || [], submissions = submissionsByUser.get(userId) || [];
    const videoMap = new Map(videos.map((item) => [item.materialId, item.percent])), slideMap = new Map(slides.map((item) => [item.materialId, item.percent]));
    const materialRows = materials.map((item) => { const progress = finiteScore(item.type === "VIDEO" ? videoMap.get(item.id) : slideMap.get(item.id)) ?? 0; return { nim: enrollment.user.nim, name: enrollment.user.name, module: modules.find((mod) => mod.id === item.moduleId)?.title || "", material: item.title, type: item.type, progress: Math.round(Math.max(0, Math.min(100, progress))), downloaded: downloads.some((download) => download.materialId === item.id) }; });
    materialProgress.push(...materialRows); downloadsOut.push(...downloads.map((item) => ({ nim: enrollment.user.nim, name: enrollment.user.name, materialId: item.materialId, downloadedAt: item.downloadedAt.toISOString() })));
    attemptsOut.push(...attempts.map((item) => ({ nim: enrollment.user.nim, name: enrollment.user.name, quiz: item.quiz.title, kind: item.quiz.module?.type || item.quiz.kind, module: item.quiz.module?.title || "", attemptId: item.id, startedAt: item.startedAt.toISOString(), submittedAt: item.submittedAt?.toISOString() || "", score: finiteScore(item.score), passed: item.passed, essayStatus: item.answerGrades.length ? `${item.answerGrades.length} essay dinilai` : "Tidak ada penilaian essay" })));
    submissionsOut.push(...submissions.map((item) => { const score = finiteScore(item.score); return { nim: enrollment.user.nim, name: enrollment.user.name, module: item.assignment.module?.title || "", assignment: item.assignment.title, deadline: item.assignment.deadline?.toISOString() || "", submittedAt: item.submittedAt.toISOString(), score: score ?? "", gradingStatus: score === null ? "Belum dinilai" : "Sudah dinilai", feedback: item.feedback || "", file: item.fileName || item.fileUrl || "", link: item.externalUrl || "" }; }));
    const activeMaterials = materialRows.length, completedMaterials = materialRows.filter((item) => item.progress >= 100).length, submittedQuizzes = new Set(attempts.filter((item) => item.submittedAt).map((item) => item.quizId)).size, submittedAssignments = submissions.length, total = activeMaterials + quizzes.length + assignments.length, overall = total ? Math.round(((completedMaterials + submittedQuizzes + submittedAssignments) / total) * 1000) / 10 : 0;
    const scores = attempts.map((item) => finiteScore(item.score)).filter((item): item is number => item !== null);
    summary.push({ nim: enrollment.user.nim, name: enrollment.user.name, enrolledAt: enrollment.enrolledAt.toISOString(), overall: Math.min(100, overall), materialsCompleted: `${completedMaterials}/${activeMaterials}`, quizCompleted: `${submittedQuizzes}/${quizzes.length}`, assignmentsSubmitted: `${submittedAssignments}/${assignments.length}`, bestQuizScore: scores.length ? Math.max(...scores) : "", assignmentsGraded: submissions.filter((item) => item.score !== null).length });
  }
  return { course, summary, materialProgress, attempts: attemptsOut, submissions: submissionsOut, downloads: downloadsOut, generatedAt: new Date().toISOString(), generatedBy: req.user.id };
}

const rows = (items: any[]) => items.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, typeof value === "boolean" ? (value ? "Ya" : "Tidak") : value])));
r.get("/courses/:courseId", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => { try { const report = await buildReport(req); res.json(report); } catch (error: any) { res.status(error.status || 500).json({ message: error.message || "Laporan gagal dibuat." }); } });
r.get("/courses/:courseId/export.xlsx", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => { try { const report = await buildReport(req); const book = XLSX.utils.book_new(); for (const [name, data] of [["Ringkasan", report.summary], ["Progress Materi", report.materialProgress], ["Attempt Quiz", report.attempts], ["Submission Tugas", report.submissions], ["Riwayat Download", report.downloads]] as [string, any[]][]) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows(data)), name.slice(0, 31)); res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=laporan-${report.course.id}.xlsx`); res.send(XLSX.write(book, { type: "buffer", bookType: "xlsx" })); } catch (error: any) { res.status(error.status || 500).json({ message: error.message || "Export gagal." }); } });
r.get("/courses/:courseId/export.csv", requireAuth as any, requireRole("ADMIN", "DOSEN") as any, async (req: any, res) => { try { const report = await buildReport(req); const header = Object.keys(report.summary[0] || { nim: "", name: "", overall: "" }); const body = report.summary.map((item) => header.map((key) => csvSafe(item[key])).join(",")); res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename=laporan-${report.course.id}.csv`); res.send(`\ufeff${header.join(",")}\n${body.join("\n")}`); } catch (error: any) { res.status(error.status || 500).json({ message: error.message || "Export gagal." }); } });
export default r;
