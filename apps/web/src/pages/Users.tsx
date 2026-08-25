import { useEffect, useState } from "react";
import api from "../lib/api";
export default function Users(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({ nim:"", name:"", password:"", role:"MAHASISWA" });
  const load=()=>api.get("/api/auth/users").then(r=>setList(r.data)).catch(()=>{});
  useEffect(()=>{ load(); },[]);
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Kelola User (Admin)</h1>
      <div className="bg-white border rounded-2xl p-5 grid md:grid-cols-4 gap-3">
        <input value={form.nim} onChange={e=>setForm({...form, nim:e.target.value})} placeholder="NIM" className="border rounded-lg px-3 py-2"/>
        <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Nama" className="border rounded-lg px-3 py-2"/>
        <input value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="Password" className="border rounded-lg px-3 py-2"/>
        <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} className="border rounded-lg px-3 py-2"><option>MAHASISWA</option><option>DOSEN</option><option>ADMIN</option></select>
        <button onClick={async()=>{ await api.post("/api/auth/users", form); load(); }} className="md:col-span-4 py-2 bg-zinc-900 text-white rounded-lg">Tambah User</button>
      </div>
      <div className="bg-white border rounded-2xl overflow-auto">
        <table className="w-full text-sm"><thead className="bg-zinc-50"><tr><th className="p-3 text-left">NIM</th><th className="p-3 text-left">Nama</th><th className="p-3">Role</th></tr></thead>
        <tbody>{list.map(u=> <tr key={u.id} className="border-t"><td className="p-3">{u.nim}</td><td className="p-3">{u.name}</td><td className="p-3 text-center">{u.role}</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
