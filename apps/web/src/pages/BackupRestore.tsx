import { ArchiveRestore, Download, FileArchive, ShieldAlert, Upload } from "lucide-react";
import api from "../lib/api";
import { Spinner } from "../components/Loading";
import { useFeedback } from "../context/FeedbackContext";
import { useState } from "react";

async function errorMessage(error: any, fallback: string) {
  const responseData = error?.response?.data;
  if (responseData instanceof Blob) {
    try {
      const parsed = JSON.parse(await responseData.text());
      return parsed.message || fallback;
    } catch {
      return fallback;
    }
  }
  return responseData?.message || fallback;
}

export default function BackupRestore() {
  const { showFeedback, requestConfirmation } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"download" | "restore" | null>(null);
  const maxFileSize = 1024 * 1024 * 1024;

  const downloadBackup = async () => {
    setBusy("download");
    try {
      const response = await api.get("/api/backup/download", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "omni-backup.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showFeedback("Backup ZIP berhasil dibuat dan diunduh.");
    } catch (error) {
      showFeedback(await errorMessage(error, "Backup gagal dibuat."), "error");
    } finally {
      setBusy(null);
    }
  };

  const restoreBackup = async () => {
    if (!file) return;
    if (!(await requestConfirmation("Restore akan mengganti seluruh data aktif dan upload dengan isi ZIP. Pastikan Anda sudah memiliki backup terbaru."))) return;
    setBusy("restore");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post("/api/backup/restore", body, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      showFeedback(response.data?.message || "Restore berhasil.");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      showFeedback(await errorMessage(error, "Restore gagal."), "error");
    } finally {
      setBusy(null);
    }
  };

  return <div className="mx-auto max-w-5xl space-y-7">
    <header>
      <p className="eyebrow">System operations</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Backup / Restore</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Cadangkan database dan file upload OMNI dalam satu ZIP, atau pulihkan dari backup resmi. Fitur ini hanya tersedia untuk ADMIN.</p>
    </header>
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="section-card space-y-5">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><Download size={19} /></span><div><h2 className="font-semibold">Buat backup ZIP</h2><p className="mt-1 text-sm leading-6 text-zinc-500">ZIP berisi data aplikasi, progress, attempt, submission, nilai, audit log, dan folder upload.</p></div></div>
        <div className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-900 dark:bg-violet-950/30 dark:text-violet-100"><p className="font-semibold">Simpan di lokasi terpisah</p><p className="mt-1">Jangan hanya menyimpan backup di server yang sama. Gunakan nama dan tanggal backup saat mengarsipkan file.</p></div>
        <div className="flex justify-end"><button type="button" disabled={busy !== null} onClick={downloadBackup} className="primary-button">{busy === "download" ? <><Spinner /> Membuat backup...</> : <><ArchiveRestore size={17} /> Download backup ZIP</>}</button></div>
      </article>
      <article className="section-card space-y-5">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"><Upload size={19} /></span><div><h2 className="font-semibold">Restore dari ZIP</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Pilih ZIP hasil backup OMNI. Data aktif dan upload akan diganti oleh isi backup.</p></div></div>
        <label className="block space-y-2 text-sm font-medium">File backup ZIP<input type="file" accept=".zip,application/zip" onChange={(event) => { const selected = event.target.files?.[0] || null; if (selected && selected.size > maxFileSize) { showFeedback("Ukuran ZIP maksimal 1 GB.", "error"); event.target.value = ""; setFile(null); return; } setFile(selected); }} className="field file:mr-3 file:rounded-md file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-700" /></label>
        {file && <p className="text-xs text-zinc-500">File dipilih: <span className="font-medium text-zinc-700 dark:text-zinc-300">{file.name}</span> · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><p className="flex items-center gap-2 font-semibold"><ShieldAlert size={17} /> Perhatian</p><p className="mt-1">Buat backup terbaru sebelum restore. Setelah restore, periksa login, mata kuliah, materi, upload, quiz, progress, dan rekap.</p></div>
        <div className="flex justify-end"><button type="button" disabled={!file || busy !== null} onClick={restoreBackup} className="primary-button disabled:opacity-50">{busy === "restore" ? <><Spinner /> Memulihkan...</> : <><FileArchive size={17} /> Restore ZIP</>}</button></div>
      </article>
    </section>
    <section className="section-card space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300"><h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Catatan operasional</h2><ul className="list-disc space-y-1 pl-5"><li>Format backup baru adalah ZIP logical backup yang kompatibel dengan PostgreSQL Railway dan SQLite lokal.</li><li>Restore memakai transaksi database; ZIP yang tidak lengkap, rusak, atau bukan backup OMNI akan ditolak.</li><li>Gunakan volume persisten untuk <code>UPLOAD_DIR</code> di production agar file tidak hilang saat service restart.</li><li>Backup berisi password hash dan data akademik sensitif. Batasi akses serta penyimpanannya.</li></ul></section>
  </div>;
}
