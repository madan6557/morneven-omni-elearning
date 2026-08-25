import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
export default function Courses(){
  const [list,setList]=useState<any[]>([]);
  useEffect(()=>{ api.get("/api/courses").then(r=>setList(r.data)).catch(()=>{}); },[]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Matkul</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map(c=>(
          <Link key={c.id} to={`/courses/${c.id}`} className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-2xl p-5">
            <div className="font-semibold">{c.title}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{c.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
