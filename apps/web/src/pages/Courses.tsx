import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Courses() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.get("/api/courses").then((r) => setList(r.data)).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="eyebrow">Learning library</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mata kuliah</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">Jelajahi materi yang sudah disusun untuk membantu perjalanan akademikmu.</p>
      </div>
      {list.length === 0 && <div className="section-card text-sm text-zinc-500 dark:text-zinc-400">Belum ada mata kuliah yang tersedia.</div>}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Link key={c.id} to={`/courses/${c.id}`} className="group section-card relative overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(46,31,73,0.12)]">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-100/80 blur-2xl transition group-hover:bg-orange-100 dark:bg-violet-950/30 dark:group-hover:bg-orange-950/40" />
            <div className="relative">
              <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><BookOpen size={19} /></span><ArrowUpRight size={19} className="text-zinc-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-600" /></div>
              <h2 className="mt-6 font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{c.description || "Materi pembelajaran terstruktur untuk mendukung progres akademikmu."}</p>
              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-semibold text-violet-700 dark:border-zinc-800 dark:text-violet-300"><span>Pelajari course</span><span>→</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
