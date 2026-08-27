import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, CircleCheck, CirclePlay, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [rekap, setRekap] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    api.get("/api/courses").then(async (r) => {
      setCourses(r.data || []);
      if (user.role !== "MAHASISWA") return;
      const progress = await Promise.all((r.data || []).map((course: any) => api.get(`/api/progress/course/${course.id}`).then((response) => ({ courseId: course.id, data: response.data })).catch(() => null)));
      setRekap({ videos: progress.flatMap((item: any) => item?.data?.videos || []), attempts: progress.flatMap((item: any) => item?.data?.attempts || []) });
      setCourseProgress(Object.fromEntries(progress.filter(Boolean).map((item: any) => [item.courseId, item.data.courseProgress?.overall || 0])));
    }).catch(() => {});
  }, [user]);

  if (!user) return null;

  const stats = [
    { label: "Matkul diikuti", value: courses.length, icon: BookOpen, tone: "violet" },
    { label: "Video ditonton", value: rekap?.videos?.length || 0, icon: CirclePlay, tone: "orange" },
    { label: "Quiz selesai", value: rekap?.attempts?.length || 0, icon: CircleCheck, tone: "emerald" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-8 text-white shadow-[0_24px_60px_rgba(46,31,73,0.18)] sm:px-8 sm:py-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100"><Sparkles size={14} /> Ruang belajar personal</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Halo, {user.name}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300">Temukan materi yang relevan, lanjutkan progresmu, dan capai target belajar dengan lebih terarah.</p>
          <Link to="/courses" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-violet-50">Lihat semua matkul <ArrowUpRight size={17} /></Link>
        </div>
      </section>

      {user.role === "MAHASISWA" && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="section-card flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === "violet" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200" : tone === "orange" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"}`}><Icon size={20} /></div>
              <div><p className="text-2xl font-bold tracking-tight">{value}</p><p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p></div>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="eyebrow">Learning library</p><h2 className="mt-1 text-xl font-bold tracking-tight">Mata kuliah pilihan</h2></div>
          <Link to="/courses" className="text-sm font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200">Lihat semua</Link>
        </div>
        {courses.length === 0 && <div className="section-card text-sm text-zinc-500 dark:text-zinc-400">Belum ada mata kuliah. {user.role === "ADMIN" && "Buat mata kuliah melalui Kelola Materi."}{user.role === "DOSEN" && "Menunggu assignment dosen dari admin."}{user.role === "MAHASISWA" && "Menunggu enrollment dari admin atau dosen."}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="group section-card relative overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(46,31,73,0.12)]">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/70 blur-2xl transition group-hover:bg-orange-100/80 dark:bg-violet-950/30 dark:group-hover:bg-orange-950/40" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><BookOpen size={18} /></span><ArrowUpRight size={18} className="text-zinc-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-600" /></div>
                <h3 className="mt-5 font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{c.description || "Materi pembelajaran terstruktur untuk mendukung progres akademikmu."}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400"><span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{c.moduleCount || 0} modul</span><span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{c.materialCount || 0} materi</span><span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{c.enrolledCount || 0} mahasiswa</span></div>
                <div className="mt-5 flex items-center gap-3"><div className="progress flex-1"><div style={{ width: `${courseProgress[c.id] || 0}%` }} /></div><span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{user.role === "MAHASISWA" ? `${courseProgress[c.id] || 0}% selesai` : "Kelola"}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
