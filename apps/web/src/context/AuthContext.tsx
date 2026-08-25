import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
type User = { id:string; nim:string; name:string; role:"ADMIN"|"DOSEN"|"MAHASISWA" };
type Ctx = { user:User|null; token:string|null; login:(u:User, t:string)=>void; logout:()=>void; loading:boolean };
const C = createContext<Ctx>(null as any);
export function AuthProvider({children}:{children:any}){
  const [user,setUser]=useState<User|null>(null);
  const [token,setToken]=useState<string|null>(()=>localStorage.getItem("token"));
  const [loading,setLoading]=useState(!!token);
  useEffect(()=>{
    if(!token){ setLoading(false); return; }
    api.get("/api/auth/me").then(r=>setUser(r.data)).catch(()=>{ localStorage.removeItem("token"); setToken(null);}).finally(()=>setLoading(false));
  },[token]);
  const login=(u:User,t:string)=>{ localStorage.setItem("token",t); setUser(u); setToken(t); };
  const logout=()=>{ localStorage.removeItem("token"); setUser(null); setToken(null); };
  return <C.Provider value={{user, token, login, logout, loading}}>{children}</C.Provider>
}
export const useAuth=()=>useContext(C);
