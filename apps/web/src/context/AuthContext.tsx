import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
type User = { id:string; nim:string; name:string; role:"ADMIN"|"DOSEN"|"MAHASISWA" };
type Ctx = { user:User|null; token:string|null; login:(u:User, t:string)=>void; logout:()=>void; loading:boolean };
const C = createContext<Ctx>(null as any);
export function AuthProvider({children}:{children:any}){
  const [user,setUser]=useState<User|null>(null);
  const [token,setToken]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    api.get("/api/auth/me").then(r=>setUser(r.data)).catch(()=>{ localStorage.removeItem("token"); setToken(null);}).finally(()=>setLoading(false));
  },[]);
  const login=(u:User,t:string)=>{ setUser(u); setToken(t); };
  const logout=()=>{ void api.post("/api/auth/logout").catch(()=>{}); setUser(null); setToken(null); };
  return <C.Provider value={{user, token, login, logout, loading}}>{children}</C.Provider>
}
export const useAuth=()=>useContext(C);
