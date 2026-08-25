import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard(){
  const {user}=useAuth();
  const [courses,setCourses]=useState<any[]>([]);
  const [rekap,setRekap]=useState<any>(null);
  useEffect(()=>{
    api.get("/api/courses").then(r=>setCourses(r.data)).catch(()=>{});
    // if mahasiswa, fetch progress first course
    api.get("/api/courses").then(async r=>{
      if(r.data[0] && user?.role==="MAHASISWA"){
        try{ const p=await api.get(`/api/progress/course/${r.data[0].id}`); setRekap(p.data); }catch{}
      }
    });
  },[]);
  if(!user) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {user.name} 👋</h1>
        <p className="text-zinc-600">Goal: materi tersampaikan & progress terlacak — 1 klik ke materi, tanpa belajar website-nya.</p>
      </div>

      {user.role==="MAHASISWA" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border p-5"><div className="text-sm text-zinc-500">Matkul Diikuti</div><div className="text-2xl font-bold">{courses.length}</div></div>
          <div className="bg-white rounded-2xl border p-5"><div className="text-sm text-zinc-500">Video Ditonton</div><div className="text-2xl font-bold">{rekap?.videos?.length||0}</div></div>
          <div className="bg-white rounded-2xl border p-5"><div className="text-sm text-zinc-500">Quiz Selesai</div><div className="text-2xl font-bold">{rekap?.attempts?.length||0}</div></div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Matkul</h2>
        {courses.length===0 && <div className="bg-white border rounded-xl p-6 text-zinc-500">Belum ada matkul. {user.role!=="MAHASISWA" && "Buat di Kelola Materi."}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map(c=>(
            <Link key={c.id} to={`/courses/${c.id}`} className="bg-white border rounded-2xl p-5 hover:shadow-sm transition">
              <div className="font-semibold">{c.title}</div>
              <div className="text-sm text-zinc-500 line-clamp-2">{c.description||"—"}</div>
              <div className="mt-3 text-xs text-zinc-500">{c.modules?.length||0} modul • {c.modules?.flatMap((m:any)=>m.materials)?.length||0} materi • {c.enrolledCount||0} mhs</div>
              <div className="mt-3 progress"><div style={{width: `${Math.min(100, (c.modules?.length||0)*20)}%`}}/></div>
              <div className="mt-3 text-sm font-medium text-primary">Buka →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
