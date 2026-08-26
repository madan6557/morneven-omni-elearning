import { createContext, useContext, useEffect, useState } from "react";
type Ctx = { theme:"light"|"dark"; toggle:()=>void };
const C = createContext<Ctx>({ theme:"light", toggle:()=>{} });
export function ThemeProvider({children}:{children:any}){
  const [theme,setTheme]=useState<"light"|"dark">(()=> {
    const saved = localStorage.getItem("themePreference");
    return saved === "light" || saved === "dark" ? saved : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light");
  });
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", theme==="dark");
  },[theme]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystem = (event: MediaQueryListEvent) => {
      if (!localStorage.getItem("themePreference")) setTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", syncWithSystem);
    return () => media.removeEventListener("change", syncWithSystem);
  }, []);
  const toggle=()=>setTheme(t=>{ const next=t==="dark"?"light":"dark"; localStorage.setItem("themePreference", next); return next; });
  return <C.Provider value={{theme,toggle}}>{children}</C.Provider>
}
export const useTheme=()=>useContext(C);
