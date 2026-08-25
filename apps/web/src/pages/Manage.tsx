import { useEffect, useState } from "react";
import api from "../lib/api";
export default function Manage(){
  const [courses,setCourses]=useState<any[]>([]);
  const [sel,setSel]=useState("");
  const [course,setCourse]=useState<any>(null);
  const [title,setTitle]=useState(""); const [modTitle,setModTitle]=useState("");
  const [mat,setMat]=useState({ moduleId:"", title:"", type:"VIDEO", sourceType:"youtube", sourceUrl:"", duration:"", totalPages:"12" });
  const [quiz,setQuiz]=useState({ moduleId:"", title:"", kind:"PRETEST", questions:[{text:"", options:["","","",""], correctIndex:0}] as any[]});
  const load=async()=>{
    const r=await api.get("/api/courses"); setCourses(r.data); if(r.data[0] && !sel){ setSel(r.data[0].id); }
  };
  const loadCourse=async(id:string)=>{ const r=await api.get(`/api/courses/${id}`); setCourse(r.data); if(r.data.modules[0]){ setMat(m=>({...m, moduleId:r.data.modules[0].id})); setQuiz(q=>({...q, moduleId:r.data.modules[0].id})); } };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ if(sel) loadCourse(sel); },[sel]);
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">Kelola Materi & Quiz (Dosen/Admin)</h1>

      <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl p-5 space-y-3">
        <div className="font-semibold">Matkul</div>
        <div className="flex gap-2">
          <select value={sel} onChange={e=>setSel(e.target.value)} className="border dark:border-zinc-700 rounded-lg px-3 py-2 flex-1">{courses.map(c=> <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul matkul baru" className="flex-1 border dark:border-zinc-700 rounded-lg px-3 py-2"/>
          <button onClick={async()=>{ await api.post("/api/courses",{ title, description:"" }); setTitle(""); load(); }} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg">Tambah</button>
        </div>
      </div>

      {course && (
        <>
          <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl p-5 space-y-3">
            <div className="font-semibold">Modul — {course.title}</div>
            <div className="flex gap-2">
              <input value={modTitle} onChange={e=>setModTitle(e.target.value)} placeholder="Judul modul baru" className="flex-1 border dark:border-zinc-700 rounded-lg px-3 py-2"/>
              <button onClick={async()=>{ await api.post(`/api/courses/${course.id}/modules`,{ title: modTitle, order: course.modules.length+1 }); loadCourse(course.id); setModTitle(""); }} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg">Tambah Modul</button>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{course.modules.map((m:any)=>m.title).join(" • ")}</div>
          </div>

          <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl p-5 space-y-3">
            <div className="font-semibold">Tambah Materi</div>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={mat.moduleId} onChange={e=>setMat({...mat, moduleId:e.target.value})} className="border dark:border-zinc-700 rounded-lg px-3 py-2">{course.modules.map((m:any)=> <option key={m.id} value={m.id}>{m.title}</option>)}</select>
              <select value={mat.type} onChange={e=>setMat({...mat, type:e.target.value as any})} className="border dark:border-zinc-700 rounded-lg px-3 py-2"><option value="VIDEO">VIDEO</option><option value="PDF">PDF</option><option value="PPT">PPT</option></select>
              <input value={mat.title} onChange={e=>setMat({...mat, title:e.target.value})} placeholder="Judul materi" className="border dark:border-zinc-700 rounded-lg px-3 py-2"/>
              <select value={mat.sourceType} onChange={e=>setMat({...mat, sourceType:e.target.value as any})} className="border dark:border-zinc-700 rounded-lg px-3 py-2"><option value="youtube">youtube</option><option value="drive">drive</option><option value="upload">upload</option></select>
              <input value={mat.sourceUrl} onChange={e=>setMat({...mat, sourceUrl:e.target.value})} placeholder="URL (YT/Drive) atau /uploads/..." className="border dark:border-zinc-700 rounded-lg px-3 py-2 md:col-span-2"/>
              {mat.type==="VIDEO" && <input value={mat.duration} onChange={e=>setMat({...mat, duration:e.target.value})} placeholder="Durasi detik (mis 600)" className="border dark:border-zinc-700 rounded-lg px-3 py-2"/>}
              {(mat.type==="PDF" || mat.type==="PPT") && <input value={mat.totalPages} onChange={e=>setMat({...mat, totalPages:e.target.value})} placeholder={mat.type==="PPT" ? "Total slide PPT" : "Total halaman"} className="border dark:border-zinc-700 rounded-lg px-3 py-2"/>}
            </div>
            <button onClick={async()=>{ await api.post("/api/materials",{ moduleId: mat.moduleId, title: mat.title, type: mat.type, sourceType: mat.sourceType, sourceUrl: mat.sourceUrl, duration: mat.duration?Number(mat.duration):undefined, totalPages: mat.totalPages?Number(mat.totalPages):undefined }); alert("Materi ditambah"); loadCourse(course.id); }} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg">Simpan Materi</button>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Upload file: gunakan endpoint POST /api/materials/upload (multipart) — UI upload drag-drop add when dosen butuh.</div>
            <div>
              <div className="font-medium text-sm">Upload File (PDF/PPT/Video)</div>
              <input type="file" id="fileup" className="text-sm"/>
              <button onClick={async()=>{
                const inp=document.getElementById("fileup") as HTMLInputElement; if(!inp.files?.[0]) return alert("pilih file");
                const fd=new FormData(); fd.append("file", inp.files[0]); fd.append("moduleId", mat.moduleId); fd.append("title", mat.title||inp.files[0].name); fd.append("type", mat.type);
                await api.post("/api/materials/upload", fd, { headers: {"Content-Type":"multipart/form-data"}}); alert("Uploaded"); loadCourse(course.id);
              }} className="ml-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm">Upload</button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl p-5 space-y-3">
            <div className="font-semibold">Tambah Quiz (Pretest/Posttest/Quiz)</div>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={quiz.moduleId} onChange={e=>setQuiz({...quiz, moduleId:e.target.value})} className="border dark:border-zinc-700 rounded-lg px-3 py-2">{course.modules.map((m:any)=> <option key={m.id} value={m.id}>{m.title}</option>)}</select>
              <select value={quiz.kind} onChange={e=>setQuiz({...quiz, kind:e.target.value})} className="border dark:border-zinc-700 rounded-lg px-3 py-2"><option value="PRETEST">PRETEST</option><option value="POSTTEST">POSTTEST</option><option value="QUIZ">QUIZ</option></select>
              <input value={quiz.title} onChange={e=>setQuiz({...quiz, title:e.target.value})} placeholder="Judul quiz" className="border dark:border-zinc-700 rounded-lg px-3 py-2 md:col-span-2"/>
            </div>
            {quiz.questions.map((qq:any, idx:number)=>(
              <div key={idx} className="border dark:border-zinc-700 rounded-xl p-3 space-y-2 bg-zinc-50 dark:bg-zinc-800">
                <input value={qq.text} onChange={e=>{ const n=[...quiz.questions]; n[idx].text=e.target.value; setQuiz({...quiz, questions:n}); }} placeholder={`Soal ${idx+1}`} className="w-full border dark:border-zinc-700 rounded-lg px-3 py-2"/>
                <div className="grid md:grid-cols-2 gap-2">
                  {qq.options.map((op:string, oi:number)=>(
                    <div key={oi} className="flex gap-2"><input value={op} onChange={e=>{ const n=[...quiz.questions]; n[idx].options[oi]=e.target.value; setQuiz({...quiz, questions:n}); }} placeholder={`Opsi ${String.fromCharCode(65+oi)}`} className="flex-1 border dark:border-zinc-700 rounded-lg px-3 py-1.5"/><input type="radio" checked={qq.correctIndex===oi} onChange={()=>{ const n=[...quiz.questions]; n[idx].correctIndex=oi; setQuiz({...quiz, questions:n}); }}/></div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={()=>setQuiz({...quiz, questions:[...quiz.questions, {text:"", options:["","","",""], correctIndex:0}]})} className="px-3 py-1.5 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm">+ Soal</button>
              <button onClick={async()=>{ await api.post("/api/quizzes",{ title: quiz.title, kind: quiz.kind, moduleId: quiz.moduleId, questions: quiz.questions.map((q:any,i:number)=>({ text:q.text, options:q.options, correctIndex:q.correctIndex, points:10, order:i+1 })) }); alert("Quiz dibuat"); }} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-sm">Simpan Quiz</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
