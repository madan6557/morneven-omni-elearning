import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CourseDetail(){
  const {id}=useParams();
  const [c,setC]=useState<any>(null);
  const [progress,setProgress]=useState<any>(null);
  const {user}=useAuth();
  useEffect(()=>{
    api.get(`/api/courses/${id}`).then(r=>setC(r.data)).catch(()=>{});
    api.get(`/api/progress/course/${id}`).then(r=>setProgress(r.data)).catch(()=>{});
  },[id]);
  if(!c) return <div>Loading...</div>;
  const vMap=new Map((progress?.videos||[]).map((x:any)=>[x.materialId, x.percent]));
  const sMap=new Map((progress?.slides||[]).map((x:any)=>[x.materialId, x.percent]));
  const dlSet=new Set((progress?.downloads||[]).map((x:any)=>x.materialId));
  const quizDone=new Set((progress?.attempts||[]).map((x:any)=>x.quizId));
  return (
    <div className="space-y-6">
      <div>
        <Link to="/courses" className="text-sm text-zinc-500 dark:text-zinc-400">← Kembali</Link>
        <h1 className="text-2xl font-bold mt-1">{c.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{c.description}</p>
      </div>

      <div className="space-y-6">
        {c.modules?.map((m:any)=>(
          <div key={m.id} className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-between">
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{m.materials.length} materi • {m.quizzes.length} quiz</div>
            </div>
            <div className="divide-y dark:divide-zinc-700">
              {/* quizzes pre */}
              {m.quizzes?.filter((q:any)=>q.kind==="PRETEST").map((q:any)=>(
                <Link key={q.id} to={`/quiz/${q.id}`} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:bg-zinc-800">
                  <div className="flex gap-3 items-center">
                    <span className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">📝</span>
                    <div><div className="font-medium text-sm">{q.title}</div><div className="text-xs text-zinc-500 dark:text-zinc-400">Pretest • {q.questions.length} soal • Lulus {q.passingScore}%</div></div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${quizDone.has(q.id)?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300":"bg-zinc-100 dark:bg-zinc-800"}`}>{quizDone.has(q.id)?"Selesai":"Kerjakan"}</div>
                </Link>
              ))}

              {m.materials?.map((mat:any)=>{
                const isVideo=mat.type==="VIDEO", isSlide=mat.type==="PDF" || mat.type==="PPT";
                const pct = Number(isVideo ? (vMap.get(mat.id) as number ||0) : isSlide ? (sMap.get(mat.id) as number || (dlSet.has(mat.id)?5:0)) : dlSet.has(mat.id)?100:0);
                const icon = isVideo?"▶": mat.type==="PDF"?"📄":"📦";
                return (
                  <Link key={mat.id} to={`/material/${mat.id}`} className="flex items-center gap-3 p-4 hover:bg-zinc-50 dark:bg-zinc-800">
                    <span className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{mat.title}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{mat.sourceType} • {mat.type} {mat.duration?`• ${Math.floor(mat.duration/60)}:${String(mat.duration%60).padStart(2,"0")}`:""} {mat.totalPages?`• ${mat.totalPages} hal`:""}</div>
                      <div className="mt-2 progress max-w-xs"><div style={{width:`${pct}%`}}/></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{Math.round(pct)}%</div>
                      {dlSet.has(mat.id) && <div className="text-[11px] text-green-600 dark:text-green-400">downloaded</div>}
                    </div>
                  </Link>
                )
              })}

              {m.quizzes?.filter((q:any)=>q.kind==="POSTTEST"||q.kind==="QUIZ").map((q:any)=>(
                <Link key={q.id} to={`/quiz/${q.id}`} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:bg-zinc-800">
                  <div className="flex gap-3 items-center">
                    <span className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">✅</span>
                    <div><div className="font-medium text-sm">{q.title}</div><div className="text-xs text-zinc-500 dark:text-zinc-400">{q.kind} • {q.questions.length} soal</div></div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${quizDone.has(q.id)?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300":"bg-zinc-100 dark:bg-zinc-800"}`}>{quizDone.has(q.id)?"Selesai":"Kerjakan"}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {user?.role!=="MAHASISWA" && <Link to="/manage" className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">Kelola Materi & Quiz</Link>}
        {user?.role!=="MAHASISWA" && <Link to="/rekap" className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-sm">Lihat Rekap Progress</Link>}
      </div>
    </div>
  )
}
