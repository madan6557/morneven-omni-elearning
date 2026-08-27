import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import api from "../lib/api";

export default function Calendar() {
  const [items, setItems] = useState<any[]>([]); const [course, setCourse] = useState("");
  useEffect(() => { api.get("/api/calendar").then((response) => setItems(response.data.items || [])).catch(() => {}); }, []);
  const courses = useMemo(() => [...new Map(items.map((item) => [item.courseId, item.courseTitle])).entries()], [items]);
  const visible = items.filter((item) => !course || item.courseId === course);
  return <div className="mx-auto max-w-5xl space-y-6"><div><p className="eyebrow">Academic planner</p><h1 className="mt-2 text-3xl font-bold">Kalender aktivitas</h1><p className="mt-2 text-sm text-zinc-500">Jadwal buka, deadline, dan publikasi hasil dari mata kuliah yang dapat Anda akses.</p></div><section className="section-card"><select className="field max-w-md" value={course} onChange={(event) => setCourse(event.target.value)}><option value="">Semua mata kuliah</option>{courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></section><section className="section-card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">{visible.map((item) => <div key={item.id} className="flex gap-4 p-5"><CalendarDays className="mt-1 shrink-0 text-violet-600" size={18} /><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-zinc-500">{item.courseTitle} · {item.moduleTitle} · {item.type}</p><p className="mt-2 text-sm font-medium text-amber-700">{new Date(item.at).toLocaleString()}</p></div></div>)}{visible.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">Belum ada aktivitas terjadwal.</div>}</section></div>;
}
