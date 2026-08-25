import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login(){
  const [nim,setNim]=useState("2025001");
  const [pw,setPw]=useState("password123");
  const [err,setErr]=useState("");
  const nav=useNavigate();
  const {login}=useAuth();
  const submit=async(e:any)=>{
    e.preventDefault(); setErr("");
    try{
      const r=await api.post("/api/auth/login",{nim, password:pw});
      login(r.data.user, r.data.token);
      nav("/");
    }catch(e:any){ setErr(e.response?.data?.message||"Gagal login"); }
  };
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center p-10 bg-gradient-to-br from-[#F88944] via-[#C47876] to-[#884892] text-white">
        <img src="/omni-logo.svg" alt="OMNI" className="w-20 h-20 mb-6 bg-white rounded-2xl p-3"/>
        <h1 className="text-4xl font-bold leading-tight">OMNI E-Learning</h1>
        <p className="mt-3 text-white/90">Materi tersampaikan, progress terlacak. Video • PDF • PPT • Quiz pre/post test — 1 klik ke materi.</p>
        <div className="mt-8 text-sm bg-white/15 rounded-xl p-4">
          <div className="font-semibold">Akun demo (seed):</div>
          <div>Admin: admin001 / password123</div>
          <div>Dosen: 2024001 / password123</div>
          <div>Mahasiswa: 2025001 / password123</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 bg-[#F8F7FC] dark:bg-zinc-900">
        <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 rounded-2xl border p-6 space-y-4">
          <div className="flex items-center gap-3 md:hidden"><img src="/omni-logo.svg" className="w-9 h-9"/><span className="font-bold">OMNI</span></div>
          <h2 className="text-xl font-bold">Masuk</h2>
          <p className="text-sm text-zinc-500">Gunakan NIM sebagai username.</p>
          <div>
            <label className="text-sm">NIM / Username</label>
            <input value={nim} onChange={e=>setNim(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="2025001"/>
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2"/>
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-zinc-900 text-white font-medium">Masuk</button>
          <div className="text-xs text-zinc-500 text-center">Belum punya akun? Hubungi admin. <Link to="/login" className="underline">Demo seed otomatis</Link></div>
        </form>
      </div>
    </div>
  )
}
