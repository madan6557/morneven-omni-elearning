import { ArrowLeft, ArrowUpRight, CircleCheck, Send, CirclePlay, FileText, ClipboardCheck, PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CourseDetail() {
  const { id } = useParams();
  const [c, setC] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/api/courses/${id}`).then((r) => setC(r.data)).catch(() => {});
    api.get(`/api/progress/course/${id}`).then((r) => setProgress(r.data)).catch(() => {});
  }, [id]);

  if (!c) return <div className="section-card text-sm text-zinc-500 dark:text-zinc-400">Memuat course...</div>;

  const vMap = new Map((progress?.videos || []).map((x: any) => [x.materialId, x.percent]));
  const sMap = new Map((progress?.slides || []).map((x: any) => [x.materialId, x.percent]));
  const dlSet = new Set((progress?.downloads || []).map((x: any) => x.materialId));
  const quizDone = new Set((progress?.attempts || []).map((x: any) => x.quizId));
  const totalItems = (c.assignments?.filter((item: any) => !item.archived).length || 0) + (c.modules?.reduce((sum: number, module: any) => sum + (module.materials?.filter((item: any) => !item.archived).length || 0) + (module.quizzes?.filter((item: any) => !item.archived).length || 0), 0) || 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-7 text-white shadow-[0_24px_60px_rgba(46,31,73,0.18)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-600/35 blur-3xl" />
        <div className="relative">
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white"><ArrowLeft size={16} /> Kembali ke matkul</Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">Course overview</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">{c.description || "Ikuti rangkaian materi dan evaluasi untuk menyelesaikan course ini."}</p>
          {c.instructors?.length > 0 && <p className="mt-4 text-sm text-zinc-300"><span className="font-semibold text-violet-200">Dosen pengampu:</span> {c.instructors.map((item: any) => item.user?.name || item.name).join(", ")}</p>}
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300"><span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{c.modules?.length || 0} modul</span><span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{totalItems} aktivitas</span></div>
        </div>
      </section>

      <div className="space-y-5">
        {c.assignments?.filter((item: any) => !item.archived).length > 0 && <section className="section-card overflow-hidden p-0"><div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/50"><h2 className="font-semibold">Tugas</h2></div><div className="divide-y divide-zinc-100 dark:divide-zinc-800">{c.assignments.filter((item: any) => !item.archived).map((item: any) => <Link to={`/assignment/${item.id}`} key={item.id} className="block px-5 py-4 transition hover:bg-violet-50/50 sm:px-6"><p className="text-sm font-semibold">{item.title}</p>{item.description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.description}</p>}<p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{item.deadline ? `Deadline: ${new Date(item.deadline).toLocaleString()}` : "Tanpa deadline"}</p></Link>)}</div></section>}
        {c.modules?.map((m: any, moduleIndex: number) => (
          <section key={m.id} className="section-card overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">{String(moduleIndex + 1).padStart(2, "0")}</span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Module</p><h2 className="mt-0.5 font-semibold">{m.title}</h2></div></div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{m.materials.length} materi · {m.quizzes.length} quiz</span>
            </div>
            <ModuleContent module={m} vMap={vMap} sMap={sMap} dlSet={dlSet} quizDone={quizDone} />
          </section>
        ))}
      </div>

      {user?.role !== "MAHASISWA" && <div className="flex flex-col gap-3 sm:flex-row"><Link to={`/manage?courseId=${encodeURIComponent(c.id)}`} className="primary-button"><ArrowUpRight size={17} /> Kelola mata kuliah</Link><Link to="/rekap" className="secondary-button">Lihat rekap progress</Link></div>}
    </div>
  );
}

function ModuleContent({ module, vMap, sMap, dlSet, quizDone }: any) { const items = [...(module.assignments || []).filter((item: any) => !item.archived).map((item: any) => ({ ...item, itemType: "assignment" })), ...(module.materials || []).filter((item: any) => !item.archived).map((item: any) => ({ ...item, itemType: "material" })), ...(module.quizzes || []).filter((item: any) => !item.archived).map((item: any) => ({ ...item, itemType: "quiz" }))].sort((a: any, b: any) => (a.contentOrder ?? 0) - (b.contentOrder ?? 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); return <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{items.map((item: any) => { if (item.itemType === "quiz") return <QuizRow key={item.id} q={item} done={quizDone.has(item.id)} />; if (item.itemType === "assignment") return <Link to={`/assignment/${item.id}`} key={item.id} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-violet-50/50 sm:px-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"><Send size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p>{item.description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.description}</p>}<p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{item.deadline ? `Deadline: ${new Date(item.deadline).toLocaleString()}` : "Tanpa deadline"}</p></div><span className="shrink-0 text-xs font-semibold text-violet-700">Serahkan tugas →</span></Link>; const isVideo = item.type === "VIDEO"; const isSlide = item.type === "PDF" || item.type === "PPT"; const pct = Number(isVideo ? (vMap.get(item.id) as number || 0) : isSlide ? (sMap.get(item.id) as number || (dlSet.has(item.id) ? 5 : 0)) : dlSet.has(item.id) ? 100 : 0); return <MaterialRow key={item.id} mat={item} pct={pct} downloaded={dlSet.has(item.id)} isVideo={isVideo} />; })}</div>; }

function QuizRow({ q, done }: { q: any; done: boolean }) {
  return <Link to={`/quiz/${q.id}`} className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-violet-50/50 sm:px-6 dark:hover:bg-violet-950/20"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"><ClipboardCheck size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{q.title}</p><p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{q.kind === "PRETEST" ? "Pretest" : q.kind === "POSTTEST" ? "Posttest" : q.kind === "UTS" ? "UTS" : q.kind === "UAS" ? "UAS" : "Quiz"} · {q.questions.length} soal{q.passingScore ? ` · Lulus ${q.passingScore}%` : ""}{q.deadline ? ` · Deadline ${new Date(q.deadline).toLocaleString()}` : ""}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>{done ? "Selesai" : "Kerjakan"}</span></Link>;
}

function MaterialRow({ mat, pct, downloaded, isVideo }: { mat: any; pct: number; downloaded: boolean; isVideo: boolean }) {
  const Icon = isVideo ? CirclePlay : mat.type === "PDF" ? FileText : PackageOpen;
  return <Link to={`/material/${mat.id}`} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-violet-50/50 sm:px-6 dark:hover:bg-violet-950/20"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><Icon size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{mat.title}</p><p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{mat.sourceType} · {mat.type} {mat.duration ? `· ${Math.floor(mat.duration / 60)}:${String(mat.duration % 60).padStart(2, "0")}` : ""} {mat.totalPages ? `· ${mat.totalPages} hal` : ""}</p><div className="mt-3 flex max-w-sm items-center gap-3"><div className="progress flex-1"><div style={{ width: `${pct}%` }} /></div><span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{Math.round(pct)}%</span></div></div>{downloaded && <CircleCheck size={17} className="shrink-0 text-emerald-500" />}</Link>;
}
