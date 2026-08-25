import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LayoutDashboard, BookOpen, BarChart3, Users, Settings2, Sun, Moon } from "lucide-react";

export default function Layout({children}:{children:any}){
  const {user, logout}=useAuth();
  const {theme,toggle}=useTheme();
  const nav=useNavigate();
  if(!user) return <>{children}</>;
  const isMhs=user.role==="MAHASISWA", isDosen=user.role==="DOSEN", isAdmin=user.role==="ADMIN";
  return (
    <div className="min-h-screen flex bg-[#F8F7FC] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <aside className="hidden md:flex w-[240px] bg-white dark:bg-zinc-900 border-r dark:border-zinc-800 flex-col sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-3 border-b dark:border-zinc-800">
          <img src="/omni-logo.svg" alt="OMNI" className="w-9 h-9 dark:bg-white rounded-lg p-1" />
          <div><div className="font-bold leading-none">OMNI</div><div className="text-xs text-zinc-500 dark:text-zinc-400">E-Learning</div></div>
          <button onClick={toggle} className="ml-auto p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Dark mode">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button>
        </div>
        <nav className="p-3 flex-1 space-y-1 text-sm">
          <Link to="/" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><LayoutDashboard size={18} strokeWidth={1.8} /> Dashboard</Link>
          <Link to="/courses" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><BookOpen size={18} strokeWidth={1.8} /> {isMhs?"Matkul Saya":"Matkul"}</Link>
          { (isDosen||isAdmin) && <Link to="/rekap" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><BarChart3 size={18} strokeWidth={1.8} /> Rekap Progress</Link> }
          { isAdmin && <Link to="/users" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><Users size={18} strokeWidth={1.8} /> Kelola User</Link> }
          { (isDosen||isAdmin) && <Link to="/manage" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><Settings2 size={18} strokeWidth={1.8} /> Kelola Materi & Quiz</Link> }
        </nav>
        <div className="p-3 border-t dark:border-zinc-800">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{user.nim} • {user.role}</div>
          <button onClick={()=>{logout(); nav("/login");}} className="mt-3 w-full text-sm py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white">Keluar</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><img src="/omni-logo.svg" alt="OMNI" className="w-7 h-7"/><span className="font-bold">OMNI</span></div>
          <div className="flex gap-2">
            <button onClick={toggle} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button>
            <button onClick={()=>{logout(); nav("/login");}} className="text-sm px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white">Keluar</button>
          </div>
        </header>
        <nav className="md:hidden flex gap-1 p-2 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 overflow-auto text-sm">
          <Link to="/" className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full whitespace-nowrap">Dashboard</Link>
          <Link to="/courses" className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full whitespace-nowrap">Matkul</Link>
          {(isDosen||isAdmin) && <Link to="/rekap" className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full whitespace-nowrap">Rekap</Link>}
          {isAdmin && <Link to="/users" className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full whitespace-nowrap">User</Link>}
        </nav>
        <main className="p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
