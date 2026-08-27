import { useEffect, useState } from "react";
import { ChevronDown, Download, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Rekap() {
  const [courses, setCourses] = useState<any[]>([]);
  const [sel, setSel] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => { api.get("/api/courses").then((r) => { setCourses(r.data); if (r.data[0]) setSel(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { if (sel) api.get(`/api/progress/rekap/${sel}`).then((r) => setData(r.data)).catch(() => {}); }, [sel]);

  const exportCsv = () => {
    if (!data) return;
    const rows = data.rekap.map((r: any) => `${r.user.nim},${r.user.name},${r.overall}%,${r.downloads.length},${r.videos.length},${r.slides.length}`).join("\n");
    const blob = new Blob(["NIM,Nama,Overall,Downloads,Video,Slide\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-${sel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Academic insights</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Rekap progress mahasiswa</h1><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Pantau keterlibatan dan pencapaian belajar dalam satu ringkasan.</p></div>
        <div className="flex h-11 w-fit items-center gap-2 rounded-xl bg-violet-100 px-3.5 text-sm font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><Users size={17} /> {data?.rekap?.length || 0} mahasiswa</div>
      </div>
      <div className="section-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="select-shell min-w-0 flex-1 sm:max-w-md"><select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Pilih mata kuliah untuk rekap" className="field select-field"><option value="" disabled>Pilih mata kuliah</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><ChevronDown className="select-chevron" size={17} /></div>
        {data && <button onClick={exportCsv} className="primary-button"><Download size={16} /> Export CSV</button>}
      </div>
      {data && <div className="table-shell overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr><th>NIM</th><th>Nama</th><th className="text-center">Overall</th><th className="text-center">Download</th><th className="text-center">Video</th><th className="text-center">Slide</th><th className="text-center">Quiz</th><th className="text-center">Aksi</th></tr></thead><tbody>{data.rekap.map((r: any) => <tr key={r.user.id} tabIndex={0} onClick={() => navigate(`/rekap/${sel}/student/${r.user.id}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`/rekap/${sel}/student/${r.user.id}`); }} className="cursor-pointer transition hover:bg-violet-50/70 focus:bg-violet-50/70 dark:hover:bg-violet-950/20"><td className="font-medium">{r.user.nim}</td><td className="font-semibold">{r.user.name}</td><td><div className="flex items-center justify-center gap-3"><div className="progress w-24 shrink-0"><div style={{ width: `${r.overall}%` }} /></div><span className="w-10 text-left text-xs font-semibold">{r.overall}%</span></div></td><td className="text-center">{r.downloads.length}</td><td className="text-center">{r.videos.length}<span className="ml-1 text-xs text-zinc-400">({r.videos.map((v: any) => Math.round(v.percent) + "%").join(", ")})</span></td><td className="text-center">{r.slides.length}</td><td className="text-center">{r.attempts.filter((a: any) => a.passed).length}/{r.attempts.length}</td><td className="text-center"><button onClick={(event) => { event.stopPropagation(); navigate(`/rekap/${sel}/student/${r.user.id}`); }} className="secondary-button px-3 py-1.5 text-xs">Lihat detail</button></td></tr>)}</tbody></table></div>}
    </div>
  );
}
