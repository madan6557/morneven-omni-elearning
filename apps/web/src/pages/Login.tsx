import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const testAccounts = [{ id: "mahasiswa", label: "Mahasiswa · 2025001", nim: "2025001", password: "password123" }, { id: "dosen", label: "Dosen · 2024001", nim: "2024001", password: "password123" }, { id: "admin", label: "Admin · admin001", nim: "admin001", password: "password123" }];

export default function Login() {
  const [account, setAccount] = useState("mahasiswa");
  const [nim, setNim] = useState("2025001");
  const [pw, setPw] = useState("password123");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const { login } = useAuth();

  const selectAccount = (id: string) => {
    const selected = testAccounts.find((item) => item.id === id);
    if (!selected) return;
    setAccount(selected.id);
    setNim(selected.nim);
    setPw(selected.password);
    setErr("");
  };

  const submit = async (e: any) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await api.post("/api/auth/login", { nim, password: pw });
      login(r.data.user, r.data.token);
      nav("/");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Gagal login");
    }
  };

  return (
    <div className="app-shell grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-zinc-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-28 -top-20 h-96 w-96 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="relative"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#F88944] to-[#884892] p-1.5"><img src="/omni-logo.svg" alt="OMNI" className="h-full w-full rounded-lg bg-white/95 p-1" /></span><span className="text-sm font-bold tracking-[0.18em]">OMNI</span></div></div>
        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100"><Sparkles size={14} /> The focused learning platform</div>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">Belajar lebih tenang. Bertumbuh lebih konsisten.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-300">Materi tersampaikan, progress terlacak. Satu ruang untuk video, PDF, presentasi, dan evaluasi pembelajaran.</p>
          <div className="mt-8 grid gap-3 text-sm text-zinc-200 sm:grid-cols-3"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-orange-300" /> Materi terstruktur</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-orange-300" /> Progress terukur</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-orange-300" /> Evaluasi jelas</span></div>
        </div>
        <p className="relative text-xs text-zinc-500">OMNI E-Learning Â· Ruang belajar yang lebih bermakna</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <form onSubmit={submit} className="surface w-full max-w-md rounded-3xl p-6 sm:p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F88944] to-[#884892] p-1.5"><img src="/omni-logo.svg" alt="OMNI" className="h-full w-full rounded-lg bg-white/95 p-1" /></span><span className="text-sm font-bold tracking-[0.18em]">OMNI</span></div>
          <div className="mb-8"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><BookOpen size={20} /></span><h2 className="mt-5 text-2xl font-bold tracking-tight">Selamat datang kembali</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Masuk untuk melanjutkan perjalanan belajarmu.</p><div className="mt-5"><label htmlFor="test-account" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Akun tes cepat</label><div className="select-shell mt-2"><select id="test-account" value={account} onChange={(e) => selectAccount(e.target.value)} className="field select-field">{testAccounts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown className="select-chevron" size={17} /></div><p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Pilih akun untuk mengisi NIM dan password otomatis.</p></div></div>
          <div className="space-y-5"><div><label htmlFor="nim" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">NIM / Username</label><input id="nim" value={nim} onChange={(e) => setNim(e.target.value)} className="field mt-2" placeholder="2025001" autoComplete="username" /></div><div><label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Password</label><input id="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="field mt-2" autoComplete="current-password" /></div></div>
          {err && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{err}</div>}
          <button type="submit" className="primary-button mt-6 w-full">Masuk ke workspace <ArrowRight size={17} /></button>
          <div className="mt-6 flex items-start gap-2 border-t border-zinc-100 pt-5 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-500" /> Belum punya akun? Hubungi admin untuk mendapatkan akses.</div>
        </form>
      </section>
    </div>
  );
}
