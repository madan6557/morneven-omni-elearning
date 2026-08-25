import { useEffect, useState } from "react";
import api from "../lib/api";

// ponytail: minimal PDF viewer — iframe for upload PDF + page buttons for tracking, not full pdfjs render
export default function PdfViewer({ material }: { material: any }){
  const total = material.totalPages || 12;
  const [page,setPage]=useState(1);
  const [viewed,setViewed]=useState<number[]>([]);
  const [percent,setPercent]=useState(0);

  // load existing progress
  useEffect(()=>{
    const t=localStorage.getItem("token");
    if(!t) return;
    api.get(`/api/progress/course/${material.module?.courseId||"course-demo"}`).then(r=>{
      const s = r.data.slides?.find((x:any)=>x.materialId===material.id);
      if(s){
        try{
          const v = Array.isArray(s.viewedPages) ? s.viewedPages : JSON.parse(s.viewedPages);
          setViewed(v); setPercent(s.percent);
        }catch{}
      }
    }).catch(()=>{});
  },[material.id]);

  const go = (p:number)=>{
    const np = Math.max(1, Math.min(total, p));
    setPage(np);
    api.post("/api/progress/slide",{ materialId: material.id, page: np }).then(r=>{
      const v = Array.isArray(r.data.viewedPages) ? r.data.viewedPages : JSON.parse(r.data.viewedPages);
      setViewed(v); setPercent(r.data.percent);
    }).catch(()=>{});
  };

  const src = material.sourceUrl?.startsWith("/uploads/") ? material.sourceUrl : material.sourceUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Halaman {page} / {total} — {viewed.length} dilihat ({Math.round(percent)}%)</div>
        <div className="flex gap-2">
          <button onClick={()=>go(page-1)} className="px-3 py-1.5 rounded bg-white border">Sebelumnya</button>
          <button onClick={()=>go(page+1)} className="px-3 py-1.5 rounded bg-zinc-900 text-white">Selanjutnya</button>
        </div>
      </div>
      <div className="progress"><div style={{width:`${percent}%`}}/></div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({length: total}, (_,i)=>i+1).map(n=>(
          <button key={n} onClick={()=>go(n)} className={`w-9 h-9 rounded text-sm border ${viewed.includes(n)?"bg-green-600 text-white border-green-600": page===n?"bg-zinc-900 text-white":"bg-white"}`}>{n}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden" style={{height: 560}}>
        {/* ponytail: iframe for PDF, native browser viewer */}
        <iframe src={`${src}#page=${page}`} className="w-full h-full" title={material.title} />
      </div>
      <p className="text-xs text-zinc-500">PDF — klik halaman / Next untuk mencatat progress (viewedPages JSON). PPT hanya tracking download.</p>
    </div>
  )
}
