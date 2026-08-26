import { useEffect, useState } from "react";
import { ChevronDown, UserPlus, Users as UsersIcon } from "lucide-react";
import api from "../lib/api";
import { useFeedback } from "../context/FeedbackContext";
import { Spinner } from "../components/Loading";

export default function Users() {
  const { showFeedback, requestConfirmation } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ nim: "", name: "", password: "", role: "MAHASISWA" });
  const load = () => api.get("/api/auth/users").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800"><UsersIcon size={18} className="text-violet-600" /><div><h2 className="text-sm font-semibold">Daftar pengguna</h2><p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{list.length} akun terdaftar</p></div></div>
        <table className="w-full min-w-[540px] text-sm"><thead><tr><th>NIM</th><th>Nama</th><th className="text-center">Role</th></tr></thead><tbody>{list.map((u) => <tr key={u.id}><td className="font-medium">{u.nim}</td><td className="font-semibold">{u.name}</td><td className="text-center"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">{u.role}</span></td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
