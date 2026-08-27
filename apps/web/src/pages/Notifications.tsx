import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import api from "../lib/api";
import { Link } from "react-router-dom";

export default function Notifications() {
  const [data, setData] = useState<any>({ items: [], unread: 0 });
  const load = () => api.get("/api/notifications?limit=50").then((response) => setData(response.data)).catch(() => {});
  useEffect(() => { void load(); }, []);
  const read = async (id: string) => { await api.patch(`/api/notifications/${id}/read`).catch(() => {}); load(); };
  const readAll = async () => { await api.patch("/api/notifications/read-all").catch(() => {}); load(); };
  return <div className="mx-auto max-w-4xl space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Workspace</p><h1 className="mt-2 text-3xl font-bold">Notifikasi</h1><p className="mt-2 text-sm text-zinc-500">Informasi jadwal, tugas, penilaian, dan hasil ujian Anda.</p></div>{data.unread > 0 && <button onClick={readAll} className="secondary-button"><CheckCheck size={16} /> Tandai semua dibaca</button>}</div><section className="section-card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">{data.items.map((item: any) => <div key={item.id} className={`flex gap-4 p-5 ${!item.readAt ? "bg-violet-50/50 dark:bg-violet-950/20" : ""}`}><Bell className="mt-1 shrink-0 text-violet-600" size={18} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{item.title}</p><time className="text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.message}</p><div className="mt-3 flex gap-3 text-xs font-semibold"><button onClick={() => read(item.id)} className="text-violet-700 dark:text-violet-300">{item.readAt ? "Sudah dibaca" : "Tandai dibaca"}</button>{item.link && <Link to={item.link} onClick={() => read(item.id)} className="text-violet-700 underline dark:text-violet-300">Buka</Link>}</div></div></div>)}{data.items.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">Belum ada notifikasi.</div>}</section></div>;
}
