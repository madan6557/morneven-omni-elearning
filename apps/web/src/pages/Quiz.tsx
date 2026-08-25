import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

export default function Quiz(){
  const {id}=useParams();
  const [q,setQ]=useState<any>(null);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [result,setResult]=useState<any>(null);
  const [attempts,setAttempts]=useState<any[]>([]);
  useEffect(()=>{
    api.get(`/api/quizzes/${id}`).then(r=>setQ(r.data)).catch(()=>{});
    api.get(`/api/quizzes/${id}/attempts`).then(r=>setAttempts(r.data)).catch(()=>{});
  },[id]);
  if(!q) return <div>Loading...</div>;
  const submit=async()=>{
    const payload = { answers: q.questions.map((qq:any)=>({ questionId: qq.id, chosen: answers[qq.id] ?? -1 })) };
    // start if needed
    try{ await api.post(`/api/quizzes/${id}/start`); }catch{}
    const r=await api.post(`/api/quizzes/${id}/submit`, payload);
    setResult(r.data);
    const at=await api.get(`/api/quizzes/${id}/attempts`); setAttempts(at.data);
  };
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to={q.moduleId ? `/courses/${q.module?.courseId||""}` : `/courses/${q.courseId}`} className="text-sm text-zinc-500">← Kembali</Link>
      <div className="bg-white border rounded-2xl p-6">
        <h1 className="text-xl font-bold">{q.title}</h1>
        <div className="text-sm text-zinc-500">{q.kind} • {q.questions.length} soal • Lulus {q.passingScore}% • Batas {q.attemptLimit}x</div>
        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${result.passed?"bg-green-50 border-green-200":"bg-amber-50 border-amber-200"}`}>
            <div className="font-bold">{result.passed?"Lulus ✓":"Belum Lulus"}</div>
            <div className="text-sm">Skor: {Math.round(result.score)}% ({result.rawScore}/{result.maxScore} poin)</div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {q.questions.map((qq:any, idx:number)=>(
          <div key={qq.id} className="bg-white border rounded-2xl p-5">
            <div className="font-medium">{idx+1}. {qq.text}</div>
            <div className="mt-3 space-y-2">
              {(qq.options as string[]).map((opt, i)=>(
                <label key={i} className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${answers[qq.id]===i?"bg-zinc-900 text-white border-zinc-900":"bg-white hover:bg-zinc-50"}`}>
                  <input type="radio" name={qq.id} checked={answers[qq.id]===i} onChange={()=>setAnswers(a=>({...a,[qq.id]:i}))} className="mt-1"/>
                  <span className="text-sm">{String.fromCharCode(65+i)}. {opt}</span>
                </label>
              ))}
            </div>
            {result && (
              <div className="mt-2 text-xs text-zinc-500">Kunci: {String.fromCharCode(65+qq.correctIndex)} • Jawabanmu: {answers[qq.id]!==undefined? String.fromCharCode(65+answers[qq.id]):"—"} {answers[qq.id]===qq.correctIndex?"✓":"✗"}</div>
            )}
          </div>
        ))}
      </div>

      <button onClick={submit} className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium">Kirim Jawaban</button>

      {attempts.length>0 && (
        <div className="bg-white border rounded-2xl p-5">
          <div className="font-semibold text-sm">Riwayat Percobaan</div>
          <div className="mt-2 space-y-1 text-sm">
            {attempts.map((a:any)=>(
              <div key={a.id} className="flex justify-between border-b py-2"><span>{new Date(a.submittedAt||a.startedAt).toLocaleString()} • {Math.round(a.score)}% {a.passed?"✓":"✗"}</span><span>{a.user?.nim}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
