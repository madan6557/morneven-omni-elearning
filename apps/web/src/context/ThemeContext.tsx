import { createContext, useContext, useEffect, useState } from "react";
type Ctx = { theme:"light"|"dark"; toggle:()=>void };
const C = createContext<Ctx>({ theme:"light", toggle:()=>{} });
export function ThemeProvider({children}:{children:any}){
  const [theme,setTheme]=useState<"light"|"dark">(()=> (localStorage.getItem("theme") as any) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light"));
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", theme==="dark");
    localStorage.setItem("theme", theme);
  },[theme]);
  const toggle=()=>setTheme(t=>t==="dark"?"light":"dark");
  return <C.Provider value={{theme,toggle}}>{children}</C.Provider>
}
export const useTheme=()=>useContext(C);
