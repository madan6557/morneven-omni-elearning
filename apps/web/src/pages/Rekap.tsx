import { useEffect, useState } from "react";
import api from "../lib/api";
export default function Rekap(){
  const [courses,setCourses]=useState<any[]>([]);
  const [sel,setSel]=useState<string>("");
  const [data,setData]=useState<any>(null);
  useEffect(()=>{ api.get("/api/courses").then(r=>{ setCourses(r.data); if(r.data[0]) setSel(r.data[0].id); }).catch(()=>{}); },[]);
  useEffect(()=>{ if(sel) api.get(`/api/progress/rekap/${sel}`).then(r=>setData(r.data)).catch(()=>{}); },[sel]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Rekap Progress Mahasiswa</h1>
      <div className="flex gap-2">
        <select value={sel} onChange={e=>setSel(e.target.value)} className="border dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800">
          {courses.map(c=> <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        {data && <button onClick={()=>{
          const rows = data.rekap.map((r:any)=>`${r.user.nim},${r.user.name},${r.overall}%,${r.downloads.length},${r.videos.length},${r.slides.length}`).join("\n");
          const blob=new Blob(["NIM,Nama,Overall,Downloads,Video,Slide\n"+rows],{type:"text/csv"});
          const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`rekap-${sel}.csv`; a.click();
        }} className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">Export CSV</button>}
      </div>
      {data && (
        <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800"><tr><th className="p-3 text-left">NIM</th><th className="p-3 text-left">Nama</th><th className="p-3">Overall</th><th className="p-3">Download</th><th className="p-3">Video</th><th className="p-3">Slide</th><th className="p-3">Quiz</th></tr></thead>
            <tbody>
              {data.rekap.map((r:any)=>(
                <tr key={r.user.id} className="border-t dark:border-zinc-700">
                  <td className="p-3">{r.user.nim}</td><td className="p-3">{r.user.name}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center gap-2 justify-center"><div className="w-24 progress"><div style={{width:`${r.overall}%`}}/></div><span className="text-xs">{r.overall}%</span></div>
                  </td>
                  <td className="p-3 text-center">{r.downloads.length}</td>
                  <td className="p-3 text-center">{r.videos.length} <span className="text-xs text-zinc-500 dark:text-zinc-400">({r.videos.map((v:any)=>Math.round(v.percent)+"%").join(", ")})</span></td>
                  <td className="p-3 text-center">{r.slides.length}</td>
                  <td className="p-3 text-center">{r.attempts.filter((a:any)=>a.passed).length}/{r.attempts.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
