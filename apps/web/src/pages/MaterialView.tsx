import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import VideoPlayer from "../components/VideoPlayer";
import PdfViewer from "../components/PdfViewer";

export default function MaterialView(){
  const {id}=useParams();
  const [mat,setMat]=useState<any>(null);
  const [course,setCourse]=useState<any>(null);
  const [pct,setPct]=useState(0);
  const nav=useNavigate();
  useEffect(()=>{
    api.get(`/api/materials/${id}`).then(async r=>{
      setMat(r.data);
      try{
        const c = await api.get(`/api/courses/${r.data.module.courseId}`);
        setCourse(c.data);
      }catch{}
    }).catch(()=>{});
  },[id]);
  if(!mat) return <div>Loading...</div>;

  // nav next/prev
  let prev:any=null, next:any=null;
  if(course){
    const all = course.modules.flatMap((m:any)=>m.materials);
    const idx = all.findIndex((x:any)=>x.id===mat.id);
    prev = all[idx-1]||null; next = all[idx+1]||null;
  }

  const handleDownload=async()=>{
    try{
      // hit tracking endpoint then open
      window.open(`/api/materials/${mat.id}/download`, "_blank");
      // optimistic log via fetch with auth
      await api.get(`/api/materials/${mat.id}/download`).catch(()=>{});
    }catch{}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/courses/${mat.module.courseId}`} className="text-sm text-zinc-500">← Kembali ke Matkul</Link>
        <div className="text-sm text-zinc-500">{pct?`Progress ${Math.round(pct)}%`:"Progress auto-tersimpan ✓"}</div>
      </div>
      <h1 className="text-xl font-bold">{mat.title}</h1>
      <div className="text-sm text-zinc-500">{mat.type} • {mat.sourceType} {mat.duration?`• ${mat.duration}s`:""} {mat.totalPages?`• ${mat.totalPages} hal`:""}</div>

      <div className="bg-white border rounded-2xl p-4 md:p-6">
        {mat.type==="VIDEO" && <VideoPlayer material={mat} onProgress={setPct}/>}
        {(mat.type==="PDF" || mat.type==="PPT") && <PdfViewer material={mat} onProgress={setPct} />}
        {mat.type==="PPT" && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            PPT slide tracking aktif — klik halaman di atas. Download juga tercatat. Preview PPT via Office Online jika tersedia.
          </div>
        )}
        {(mat.type==="PDF" || mat.type==="PPT") && (
          <div className="mt-4 flex gap-2">
            <button onClick={handleDownload} className="px-4 py-2 rounded-lg bg-white border text-sm">⬇ Download & Catat Progress</button>
            <a href={mat.sourceUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm">Buka File</a>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {prev && <Link to={`/material/${prev.id}`} className="px-4 py-2 rounded-lg bg-white border text-sm">← {prev.title}</Link>}
        <div className="flex-1"/>
        {next && <Link to={`/material/${next.id}`} className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm">{next.title} →</Link>}
      </div>
    </div>
  )
}
