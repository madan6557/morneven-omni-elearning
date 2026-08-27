import { createContext, useContext, useEffect, useState } from "react";
type Ctx = { theme:"light"|"dark"; toggle:()=>void };
const C = createContext<Ctx>({ theme:"light", toggle:()=>{} });
export function ThemeProvider({children}:{children:any}){
  const [theme,setTheme]=useState<"light"|"dark">(()=> {
    const saved = localStorage.getItem("themePreference");
    return saved === "light" || saved === "dark" ? saved : "light";
  });
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", theme==="dark");
  },[theme]);
  const toggle=()=>setTheme(t=>{ const next=t==="dark"?"light":"dark"; localStorage.setItem("themePreference", next); return next; });
  return <C.Provider value={{theme,toggle}}>{children}</C.Provider>
}
export const useTheme=()=>useContext(C);
