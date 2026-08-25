import { useEffect, useRef, useState } from "react";
import api, { ytEmbed, driveEmbed } from "../lib/api";

export default function VideoPlayer({ material, onProgress }: { material: any; onProgress?: (p:number)=>void }){
  const { sourceType, sourceUrl } = material;
  if(sourceType==="youtube") return <YouTubePlayer material={material} onProgress={onProgress}/>;
  if(sourceType==="drive") return <DrivePlayer material={material} onProgress={onProgress}/>;
  return <UploadPlayer material={material} onProgress={onProgress}/>;
}

function YouTubePlayer({material, onProgress}:{material:any; onProgress?:any}){
  const containerId = `yt-${material.id}`;
  const [secs,setSecs]=useState(0);
  const playerRef=useRef<any>(null);
  const intervalRef=useRef<any>(null);
  const lastSent=useRef(0);

  useEffect(()=>{
    const ytId = (()=>{ try{ const u=new URL(material.sourceUrl); if(u.hostname.includes("youtu.be")) return u.pathname.slice(1); return u.searchParams.get("v")||"";}catch{return ""}})();
    if(!ytId) return;
    let cancelled=false;

    const initPlayer = () => {
      if(cancelled) return;
      const el=document.getElementById(containerId);
      if(!el || !(window as any).YT?.Player) return;
      // fetch lastPosition for resume
      api.get(`/api/progress/course/${material.module?.courseId||"course-demo"}`).then(r=>{
        const v=r.data.videos?.find((x:any)=>x.materialId===material.id);
        if(v && v.lastPosition && playerRef.current?.seekTo){
          try{ playerRef.current.seekTo(v.lastPosition, true); setSecs(v.lastPosition);}catch{}
        }
      }).catch(()=>{});

      playerRef.current = new (window as any).YT.Player(containerId, {
        videoId: ytId,
        playerVars: { origin: window.location.origin, enablejsapi: 1 },
        events: {
          onStateChange: (e:any)=>{
            const YTState=(window as any).YT.PlayerState;
            if(e.data===YTState.PLAYING){
              if(intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current=setInterval(()=>{
                const cur=playerRef.current?.getCurrentTime?.()||0;
                const dur=playerRef.current?.getDuration?.()||material.duration||600;
                if(cur - lastSent.current >= 5){
                  lastSent.current=cur;
                  setSecs(Math.floor(cur));
                  api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(cur), duration: Math.floor(dur)}).then(r=>onProgress?.(r.data.percent)).catch(()=>{});
                }
              },5000);
            } else {
              if(intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current=null; }
              if(e.data===YTState.PAUSED || e.data===YTState.ENDED){
                const cur=playerRef.current?.getCurrentTime?.()||0;
                const dur=playerRef.current?.getDuration?.()||material.duration||600;
                api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(cur), duration: Math.floor(dur)}).then(r=>onProgress?.(r.data.percent)).catch(()=>{});
              }
            }
          }
        }
      });
    };

    if(!(window as any).YT){
      const tag=document.createElement("script");
      tag.src="https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
      const check=setInterval(()=>{ if((window as any).YT?.Player){ clearInterval(check); initPlayer(); }},500);
      return ()=>{ cancelled=true; clearInterval(check); if(intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      initPlayer();
    }
    return ()=>{ cancelled=true; if(intervalRef.current) clearInterval(intervalRef.current); try{ playerRef.current?.destroy?.(); }catch{} };
  },[material.id]);

  return (
    <div className="space-y-2">
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <div id={containerId} className="w-full h-full" />
      </div>
      <p className="text-xs text-zinc-500">YouTube — presisi via IFrame API {secs}s {secs?`(${Math.round(secs/(material.duration||600)*100)}%)`:""}</p>
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
    // resume lastPosition
    api.get(`/api/progress/course/${material.module?.courseId||"course-demo"}`).then(r=>{
      const v=r.data.videos?.find((x:any)=>x.materialId===material.id);
      if(v && v.lastPosition && ref.current){
        try{ ref.current.currentTime = v.lastPosition; lastSent.current=v.lastPosition; onProgress?.(v.percent);}catch{}
      }
    }).catch(()=>{});
  },[material.id]);
  return (
    <div className="space-y-2">
      <video
        ref={ref}
        controls
        preload="metadata"
        className="w-full aspect-video bg-black rounded-xl"
        src={material.sourceUrl}
        onTimeUpdate={()=>{
          const v=ref.current; if(!v) return;
          if(v.currentTime - lastSent.current > 5){
            lastSent.current = v.currentTime;
            api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(v.currentTime), duration: Math.floor(v.duration||material.duration||1)}).then(r=>onProgress?.(r.data.percent)).catch(()=>{});
          }
        }}
        onEnded={()=>{
          const v=ref.current; if(!v) return;
          api.post("/api/progress/video",{ materialId: material.id, pos: Math.floor(v.duration), duration: Math.floor(v.duration)}).then(r=>onProgress?.(r.data.percent)).catch(()=>{});
        }}
      />
      <p className="text-xs text-zinc-500">Upload — presisi + resume {Math.floor(lastSent.current)}s</p>
    </div>
  )
}
