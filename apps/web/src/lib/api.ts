import axios from "axios";
// @ts-ignore - vite types
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || "").trim();
const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use(cfg=>{
  const t = localStorage.getItem("token");
  if(t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
export default api;

// helpers
export function ytId(url:string){
  try{
    const u = new URL(url);
    if(u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch { return "" }
}
export function ytEmbed(url:string){
  const id = ytId(url); return id ? `https://www.youtube.com/embed/${id}` : url;
}
export function driveEmbed(url:string){
  // https://drive.google.com/file/d/ID/view
  const m = url.match(/\/d\/([^\/]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}
