import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings2,
  Sun,
  Users,
} from "lucide-react";

export default function Layout({ children }: { children: any }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  if (!user) return <>{children}</>;

  const isMhs = user.role === "MAHASISWA";
  const isDosen = user.role === "DOSEN";
  const isAdmin = user.role === "ADMIN";

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, show: true, end: true },
    { to: "/courses", label: isMhs ? "Matkul Saya" : "Matkul", icon: BookOpen, show: true },
    { to: "/rekap", label: "Rekap Progress", icon: BarChart, show: isDosen || isAdmin },
    { to: "/users", label: "Kelola User", icon: Users, show: isAdmin },
    { to: "/manage", label: "Kelola Materi & Quiz", icon: Settings2, show: isDosen || isAdmin },
  ];

  const visibleItems = navItems.filter((item) => item.show);
  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <div className="app-shell min-h-screen text-zinc-900 dark:text-zinc-100">
      <aside className="sidebar-shell sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-y-0 border-l-0 md:flex">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-6 dark:border-zinc-800">
          <Link to="/" className="flex items-center gap-3" aria-label="OMNI dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F88944] to-[#884892] p-1.5 shadow-lg shadow-violet-500/20">
              <img src="/omni-logo.svg" alt="OMNI" className="h-full w-full rounded-lg bg-white/95 p-1" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.16em]">OMNI</span>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">E-Learning platform</span>
            </span>
          </Link>
          <button
            onClick={toggle}
            className="ml-auto rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title={theme === "dark" ? "Gunakan mode terang" : "Gunakan mode gelap"}
            aria-label={theme === "dark" ? "Gunakan mode terang" : "Gunakan mode gelap"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <div className="px-6 pb-2 pt-7">
          <p className="eyebrow">Workspace</p>
        </div>
        <nav className="flex-1 space-y-1 px-4" aria-label="Navigasi utama">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-900/5 dark:bg-violet-950/50 dark:text-violet-200"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 rounded-2xl bg-gradient-to-br from-violet-50 to-orange-50 p-4 dark:from-violet-950/50 dark:to-orange-950/20">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-200">Akun aktif</p>
          <p className="mt-2 truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{user.nim} · {user.role}</p>
          <button onClick={handleLogout} className="secondary-button mt-4 min-h-9 w-full px-3 py-1.5 text-xs">
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sidebar-shell sticky top-0 z-20 flex items-center justify-between border-x-0 border-t-0 px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2.5" aria-label="OMNI dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F88944] to-[#884892] p-1">
              <img src="/omni-logo.svg" alt="OMNI" className="h-full w-full rounded-md bg-white/95 p-0.5" />
            </span>
            <span className="text-sm font-bold tracking-[0.16em]">OMNI</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Ganti tema">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button onClick={handleLogout} className="rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
              Keluar
            </button>
          </div>
        </header>

        <nav className="sidebar-shell sticky top-[57px] z-10 flex gap-1 overflow-x-auto border-x-0 border-t-0 px-3 py-2 md:hidden" aria-label="Navigasi mobile">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-200"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`
              }
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
        <div className="px-4 pb-5 text-center text-[11px] text-zinc-400 sm:px-6 lg:px-10">OMNI E-Learning · Belajar lebih terarah, progres lebih terukur</div>
      </div>
    </div>
  );
}
