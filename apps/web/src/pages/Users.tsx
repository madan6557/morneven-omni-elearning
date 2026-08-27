import { useEffect, useState } from "react";
import { ChevronDown, UserPlus, Users as UsersIcon } from "lucide-react";
import api from "../lib/api";
import { useFeedback } from "../context/FeedbackContext";
import { Spinner } from "../components/Loading";

export default function Users() {
  const { showFeedback, requestConfirmation } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [sort, setSort] = useState({ key: "createdAt", direction: "desc" });
  const [form, setForm] = useState({ nim: "", name: "", password: "", role: "MAHASISWA" });
  const load = () => api.get("/api/auth/users", { params: { search, page, limit: 25 } }).then((r) => { const data = r.data?.items ? r.data : { items: r.data, total: r.data.length, totalPages: 1 }; setList(data.items); setMeta({ total: data.total, totalPages: data.totalPages }); }).catch(() => {});
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [search, page]);
  const sorted = [...list].sort((a, b) => { const left = String(a[sort.key] || "").toLowerCase(); const right = String(b[sort.key] || "").toLowerCase(); return (left > right ? 1 : left < right ? -1 : 0) * (sort.direction === "asc" ? 1 : -1); });
  const changeSort = (key: string) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <BackupPanel />
      <div><p className="eyebrow">People & access</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Kelola user</h1><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Atur akun dan peran pengguna agar akses platform tetap terkontrol.</p></div>
      <section className="section-card space-y-5">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><UserPlus size={19} /></div><div><h2 className="font-semibold">Tambah user baru</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Lengkapi identitas dasar dan tentukan role akses.</p></div></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input value={form.nim} onChange={(e) => setForm({ ...form, nim: e.target.value })} placeholder="NIM" className="field" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" className="field" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" className="field" />
          <div className="select-shell"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} aria-label="Pilih role user" className="field select-field"><option>MAHASISWA</option><option>DOSEN</option><option>ADMIN</option></select><ChevronDown className="select-chevron" size={17} /></div>
        </div>
        <button disabled={saving} onClick={async () => { if (!(await requestConfirmation(`User ${form.name || form.nim} akan ditambahkan ke sistem.`))) return; setSaving(true); try { await api.post("/api/auth/users", form); setForm({ nim: "", name: "", password: "", role: "MAHASISWA" }); await load(); showFeedback("User berhasil ditambahkan."); } catch { showFeedback("User gagal ditambahkan.", "error"); } finally { setSaving(false); } }} className="primary-button disabled:cursor-wait disabled:opacity-70">{saving ? <Spinner /> : <UserPlus size={17} />} {saving ? "Menyimpan..." : "Tambah user"}</button>
      </section>
      <section className="table-shell overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800"><div className="flex items-center gap-3"><UsersIcon size={18} className="text-violet-600" /><div><h2 className="text-sm font-semibold">Daftar pengguna</h2><p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{meta.total} akun terdaftar</p></div></div><input className="field max-w-xs" placeholder="Cari nama atau NIM..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <table className="w-full min-w-[540px] text-sm"><thead><tr><th><button onClick={() => changeSort("nim")} className="font-semibold">NIM {sort.key === "nim" ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</button></th><th><button onClick={() => changeSort("name")} className="font-semibold">Nama {sort.key === "name" ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</button></th><th className="text-center"><button onClick={() => changeSort("role")} className="font-semibold">Role {sort.key === "role" ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</button></th></tr></thead><tbody>{sorted.map((u) => <tr key={u.id}><td className="font-medium">{u.nim}</td><td className="font-semibold">{u.name}</td><td className="text-center"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">{u.role}</span></td></tr>)}</tbody></table>
        {meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="secondary-button min-h-8 px-2 disabled:opacity-40">Sebelumnya</button><span>Halaman {page} dari {meta.totalPages}</span><button disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} className="secondary-button min-h-8 px-2 disabled:opacity-40">Berikutnya</button></div>}
      </section>
    </div>
  );
}

function BackupPanel() { const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const { showFeedback, requestConfirmation } = useFeedback(); const download = async () => { const response = await api.get("/api/backup/download", { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = "elearning-backup.zip"; link.click(); URL.revokeObjectURL(url); }; const restore = async () => { if (!file || !(await requestConfirmation("Restore akan mengganti seluruh database dan file upload saat ini. Lanjutkan?"))) return; setBusy(true); try { const data = new FormData(); data.append("file", file); await api.post("/api/backup/restore", data); showFeedback("Restore berhasil. Restart server diperlukan."); } catch (error: any) { showFeedback(error.response?.data?.message || "Restore gagal.", "error"); } finally { setBusy(false); } }; return <section className="section-card space-y-3"><div><h2 className="font-semibold">Backup & restore</h2><p className="mt-1 text-sm text-zinc-500">Backup mencakup database dan seluruh file upload.</p></div><div className="flex flex-wrap items-center gap-3"><button onClick={download} className="secondary-button">Download backup ZIP</button><input type="file" accept=".zip" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button onClick={restore} disabled={!file || busy} className="primary-button disabled:opacity-50">{busy ? "Memulihkan..." : "Restore backup"}</button></div><p className="text-xs text-amber-700">Restore hanya untuk admin dan mengganti data yang sedang digunakan.</p></section>; }
