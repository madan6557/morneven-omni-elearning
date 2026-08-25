import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, BookOpen, BarChart3, Users, Settings2, LogOut } from "lucide-react";

export default function Layout({children}:{children:any}){
  const {user, logout}=useAuth();
  const nav=useNavigate();
  if(!user) return <>{children}</>;
  const isMhs=user.role==="MAHASISWA", isDosen=user.role==="DOSEN", isAdmin=user.role==="ADMIN";
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-[240px] bg-white border-r flex-col sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-3 border-b">
          <img src="/omni-logo.svg" alt="OMNI" className="w-9 h-9" />
          <div><div className="font-bold leading-none">OMNI</div><div className="text-xs text-zinc-500">E-Learning</div></div>
        </div>
        <nav className="p-3 flex-1 space-y-1 text-sm">
          <Link to="/" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100"><LayoutDashboard size={18} strokeWidth={1.8} /> Dashboard</Link>
          <Link to="/courses" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100"><BookOpen size={18} strokeWidth={1.8} /> {isMhs?"Matkul Saya":"Matkul"}</Link>
          { (isDosen||isAdmin) && <Link to="/rekap" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100"><BarChart3 size={18} strokeWidth={1.8} /> Rekap Progress</Link> }
          { isAdmin && <Link to="/users" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100"><Users size={18} strokeWidth={1.8} /> Kelola User</Link> }
          { (isDosen||isAdmin) && <Link to="/manage" className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-zinc-100"><Settings2 size={18} strokeWidth={1.8} /> Kelola Materi & Quiz</Link> }
        </nav>
        <div className="p-3 border-t">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-zinc-500">{user.nim} • {user.role}</div>
          <button onClick={()=>{logout(); nav("/login");}} className="mt-3 w-full text-sm py-2 rounded-lg bg-zinc-900 text-white">Keluar</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 bg-white border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><img src="/omni-logo.svg" alt="OMNI" className="w-7 h-7"/><span className="font-bold">OMNI</span></div>
          <button onClick={()=>{logout(); nav("/login");}} className="text-sm px-3 py-1.5 rounded bg-zinc-900 text-white">Keluar</button>
        </header>
        <nav className="md:hidden flex gap-1 p-2 bg-white border-b overflow-auto text-sm">
          <Link to="/" className="px-3 py-1.5 bg-zinc-100 rounded-full whitespace-nowrap">Dashboard</Link>
          <Link to="/courses" className="px-3 py-1.5 bg-zinc-100 rounded-full whitespace-nowrap">Matkul</Link>
          {(isDosen||isAdmin) && <Link to="/rekap" className="px-3 py-1.5 bg-zinc-100 rounded-full whitespace-nowrap">Rekap</Link>}
          {isAdmin && <Link to="/users" className="px-3 py-1.5 bg-zinc-100 rounded-full whitespace-nowrap">User</Link>}
        </nav>
        <main className="p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
