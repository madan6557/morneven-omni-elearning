import { useEffect, useState } from "react";
import api from "../lib/api";

const normalizePages = (value: unknown) => Array.isArray(value) ? value.map(Number).filter((page) => Number.isInteger(page) && page >= 1) : [];

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
          setViewed(normalizePages(v)); setPercent(Number(s.percent) || 0); onProgress?.(Number(s.percent) || 0);
        }catch{}
      }
    }).catch(()=>{});
  },[material.id]);

  // Halaman pertama adalah halaman yang langsung dibuka. Catat sekali saat
  // viewer tampil agar PPT tetap memiliki progress meskipun preview Office
  // gagal merender slide pertama.
  useEffect(()=>{
    api.post("/api/progress/slide",{ materialId: material.id, page: 1 }).then(r=>{
      const v = typeof r.data.viewedPages==="string" ? JSON.parse(r.data.viewedPages) : r.data.viewedPages;
      const nextPercent = Number(r.data.percent) || 0;
      setViewed(normalizePages(v)); setPercent(nextPercent); onProgress?.(nextPercent);
    }).catch(()=>{});
  },[material.id]);

  const go = (p:number)=>{
    const np = Math.max(1, Math.min(total, p));
    setPage(np);
    api.post("/api/progress/slide",{ materialId: material.id, page: np }).then(r=>{
      const v = typeof r.data.viewedPages==="string" ? JSON.parse(r.data.viewedPages) : r.data.viewedPages;
      const nextPercent = Number(r.data.percent) || 0;
      setViewed(normalizePages(v)); setPercent(nextPercent); onProgress?.(nextPercent);
    }).catch(()=>{});
  };

  const rawSrc = material.sourceUrl?.startsWith("/") ? `${api.defaults.baseURL || window.location.origin}${material.sourceUrl}` : material.sourceUrl;
  const src = isPPT && rawSrc?.startsWith("http") ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawSrc)}` : rawSrc;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Halaman {page} / {total} — {viewed.length} dilihat ({Math.round(percent)}%)</div>
        <div className="flex gap-2">
          <button onClick={()=>go(page-1)} className="px-3 py-1.5 rounded bg-white dark:bg-zinc-800 border dark:border-zinc-700">Sebelumnya</button>
          <button onClick={()=>go(page+1)} className="px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">Selanjutnya</button>
        </div>
      </div>
      <div className="progress"><div style={{width:`${percent}%`}}/></div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({length: total}, (_,i)=>i+1).map(n=>(
          <button key={n} onClick={()=>go(n)} className={`w-9 h-9 rounded text-sm border dark:border-zinc-700 ${viewed.includes(n)?"bg-green-600 dark:bg-green-700 text-white dark:text-zinc-900 border-green-600 dark:border-green-700": page===n?"bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900":"bg-white dark:bg-zinc-800"}`}>{n}</button>
        ))}
      </div>
      <div className="bg-white dark:bg-zinc-800 rounded-xl border dark:border-zinc-700 overflow-hidden" style={{height: 560}}>
        <iframe src={isPPT ? src : `${src}#page=${page}`} className="w-full h-full" title={material.title} />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{isPPT ? "PPT — per-slide tracking aktif (totalPages dari dosen), preview via Office Online. Klik halaman untuk progress." : "PDF — klik halaman / Next untuk mencatat progress (viewedPages JSON)."}</p>
    </div>
  )
}
