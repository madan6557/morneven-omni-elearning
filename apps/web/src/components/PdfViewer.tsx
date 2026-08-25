import { useEffect, useState } from "react";
import api from "../lib/api";

// ponytail: minimal slide viewer — PDF & PPT per-slide tracking via viewedPages
export default function PdfViewer({ material, onProgress }: { material: any, onProgress?: (p:number)=>void }){
  const isPPT = material.type==="PPT";
  const total = material.totalPages || (isPPT ? 10 : 12);
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
          const v = typeof s.viewedPages==="string" ? JSON.parse(s.viewedPages) : s.viewedPages;
          setViewed(v); setPercent(s.percent); onProgress?.(s.percent);
        }catch{}
      }
    }).catch(()=>{});
  },[material.id]);

  const go = (p:number)=>{
    const np = Math.max(1, Math.min(total, p));
    setPage(np);
    api.post("/api/progress/slide",{ materialId: material.id, page: np }).then(r=>{
      const v = typeof r.data.viewedPages==="string" ? JSON.parse(r.data.viewedPages) : r.data.viewedPages;
      setViewed(v); setPercent(r.data.percent); onProgress?.(r.data.percent);
    }).catch(()=>{});
  };

  const rawSrc = material.sourceUrl?.startsWith("/uploads/") ? (window.location.origin + material.sourceUrl) : material.sourceUrl;
  const src = isPPT && rawSrc?.startsWith("http") ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawSrc)}` : rawSrc;

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
        <iframe src={isPPT ? src : `${src}#page=${page}`} className="w-full h-full" title={material.title} />
      </div>
      <p className="text-xs text-zinc-500">{isPPT ? "PPT — per-slide tracking aktif (totalPages dari dosen), preview via Office Online. Klik halaman untuk progress." : "PDF — klik halaman / Next untuk mencatat progress (viewedPages JSON)."}</p>
    </div>
  )
}
