import { useEffect, useRef, useState } from "react";
import api, { ytEmbed, driveEmbed } from "../lib/api";

export default function VideoPlayer({ material, onProgress }: { material: any; onProgress?: (p:number)=>void }){
  const { sourceType, sourceUrl } = material;
  if(sourceType==="youtube") return <YouTubePlayer material={material} onProgress={onProgress}/>;
  if(sourceType==="drive") return <DrivePlayer material={material} onProgress={onProgress}/>;
  return <UploadPlayer material={material} onProgress={onProgress}/>;
}

function YouTubePlayer({material, onProgress}:{material:any; onProgress?:any}){
  const src = ytEmbed(material.sourceUrl);
  const [secs,setSecs]=useState(0);
  // ponytail: YT IFrame API not needed for MVP — track time on page while playing (est.)
  useEffect(()=>{
    let t:any, active=true;
    const iv=setInterval(()=>{
      if(!active || document.hidden) return;
      setSecs(s=>{const ns=s+5; // est 5s per tick if tab visible
        api.post("/api/progress/video",{ materialId: material.id, pos: Math.min(ns, material.duration||600), duration: material.duration||600 }).catch(()=>{});
        onProgress?.(Math.min(100, (ns/(material.duration||600))*100));
        return ns;
      });
    },5000);
    return ()=>{ active=false; clearInterval(iv); clearInterval(t); };
  },[material.id]);
  return (
    <div className="space-y-2">
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen title={material.title} />
      </div>
      <p className="text-xs text-zinc-500">YouTube — progress estimasi {secs}s (ponytail: Drive/YT presisi penuh jika perlu IFrame API, add when dosen butuh detik akurat)</p>
    </div>
  )
}
function DrivePlayer({material, onProgress}:{material:any; onProgress?:any}){
  const src = driveEmbed(material.sourceUrl);
  const [secs,setSecs]=useState(0);
  useEffect(()=>{
    const iv=setInterval(()=>{
      if(document.hidden) return;
      setSecs(s=>{const ns=s+5; api.post("/api/progress/video",{ materialId: material.id, pos: ns, duration: material.duration||600 }).catch(()=>{}); onProgress?.(Math.min(100, (ns/600)*100)); return ns;});
    },5000);
    return ()=>clearInterval(iv);
  },[]);
  return (
    <div className="space-y-2">
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <iframe src={src} className="w-full h-full" allow="autoplay" title={material.title} />
      </div>
      <p className="text-xs text-zinc-500">Drive — estimasi waktu buka {secs}s</p>
    </div>
  )
}
function UploadPlayer({material, onProgress}:{material:any; onProgress?:any}){
  const ref=useRef<HTMLVideoElement>(null);
  const lastSent=useRef(0);
  useEffect(()=>{
    // resume
    api.get(`/api/progress/course/${material.module?.courseId||""}`).catch(()=>{}); // warm
    // load last position
    const token=localStorage.getItem("token");
    if(token){
      fetch(`/api/progress/course/${material.module?.courseId||""}`,{headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
    }
  },[]);
  return (
    <div className="space-y-2">
      <video
        ref={ref}
        controls
        preload="metadata"
        className="w-full aspect-video bg-black rounded-xl"
        src={material.sourceUrl}
        onLoadedMetadata={(e)=>{
          // try restore lastPosition via separate fetch
          fetch(`/api/progress/course/demo`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}}).catch(()=>{});
        }}
        onTimeUpdate={()=>{
          const v=ref.current; if(!v) return;
          if(v.currentTime - lastSent.current > 5){
            lastSent.current = v.currentTime;
            api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(v.currentTime), duration: Math.floor(v.duration||material.duration||1)}).then(r=>onProgress?.(r.data.percent)).catch(()=>{});
          }
        }}
        onEnded={()=>{
          const v=ref.current; if(!v) return;
          api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(v.duration), duration: Math.floor(v.duration)}).catch(()=>{});
        }}
      />
      <p className="text-xs text-zinc-500">Upload — tracking native &lt;video&gt; timeupdate (presisi)</p>
    </div>
  )
}
