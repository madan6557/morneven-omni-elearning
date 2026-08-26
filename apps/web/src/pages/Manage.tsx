import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, CirclePlay, ClipboardCheck, FileUp, Plus, Save, Settings2 } from "lucide-react";
import api from "../lib/api";
import { useFeedback } from "../context/FeedbackContext";
import { Spinner } from "../components/Loading";
import { useAuth } from "../context/AuthContext";

type SelectOption = { value: string; label: string };

function SelectField({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: SelectOption[]; ariaLabel: string }) {
  return (
    <div className="select-shell">
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className="field select-field">
        {!value && <option value="" disabled>{ariaLabel}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="select-chevron" size={17} strokeWidth={2} />
    </div>
  );
}

const inputClass = "field";

export default function Manage() {
  const { showFeedback, requestConfirmation } = useFeedback();
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [sel, setSel] = useState("");
  const [course, setCourse] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [modTitle, setModTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  const [mat, setMat] = useState({ moduleId: "", title: "", type: "VIDEO", sourceType: "youtube", sourceUrl: "", duration: "", totalPages: "12" });
  const [quiz, setQuiz] = useState({ moduleId: "", title: "", kind: "PRETEST", showAnswers: false, questions: [{ text: "", options: ["", "", "", ""], correctIndex: 0 }] as any[] });

  const load = async () => {
    try {
      const r = await api.get("/api/courses");
      const next = Array.isArray(r.data) ? r.data : [];
      setCourses(next);
      if (next[0] && !sel) setSel(next[0].id);
      setError("");
    } catch {
      setError("Daftar mata kuliah belum dapat dimuat. Periksa koneksi API lalu muat ulang halaman.");
    }
  };

  const loadCourse = async (id: string) => {
    try {
      const r = await api.get(`/api/courses/${id}`);
      const next = { ...r.data, modules: Array.isArray(r.data?.modules) ? r.data.modules : [] };
      setCourse(next);
      setSelectedLecturers((next.instructors || []).map((item: any) => item.user?.id || item.userId || item.id));
      if (next.modules[0]) {
        setMat((m) => ({ ...m, moduleId: next.modules[0].id }));
        setQuiz((q) => ({ ...q, moduleId: next.modules[0].id }));
      }
      setError("");
    } catch {
      setCourse(null);
      setError("Detail mata kuliah belum dapat dimuat. Pilih ulang mata kuliah atau muat ulang halaman.");
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { api.get("/api/auth/users").then((r) => setLecturers((r.data || []).filter((item: any) => item.role === "DOSEN"))).catch(() => {}); }, []);
  useEffect(() => { if (sel) loadCourse(sel); }, [sel]);

  const resetMaterial = () => { setEditingMaterialId(null); setMat((m) => ({ ...m, title: "", sourceUrl: "", duration: "", totalPages: "" })); };
  const resetQuiz = () => { setEditingQuizId(null); setQuiz((q) => ({ ...q, title: "", showAnswers: false, questions: [{ text: "", options: ["", "", "", ""], correctIndex: 0 }] })); };
  const remove = async (message: string, action: () => Promise<void>) => {
    if (!(await requestConfirmation(message))) return;
    setPending("delete");
    try { await action(); showFeedback("Data berhasil dihapus."); } catch { showFeedback("Data gagal dihapus.", "error"); } finally { setPending(null); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Content studio</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Kelola materi & quiz</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">Bangun pengalaman belajar yang rapi, terstruktur, dan mudah diikuti mahasiswa.</p>
        </div>
        <div className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200 sm:block">Admin workspace</div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}

      <section className="section-card space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><BookOpen size={19} /></div>
          <div><h2 className="font-semibold">Pilih mata kuliah</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Kelola struktur konten dari satu workspace.</p></div>
        </div>
        <SelectField value={sel} onChange={setSel} ariaLabel="Pilih mata kuliah" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        {course && <div className="flex flex-wrap gap-2"><button disabled={pending !== null} onClick={() => { setEditingCourseId(course.id); setTitle(course.title); }} className="secondary-button min-h-10 text-xs">Edit mata kuliah</button>{user?.role === "ADMIN" && <button disabled={pending !== null} onClick={() => remove(`Hapus mata kuliah ${course.title}? Semua modul, materi, dan quiz di dalamnya ikut terhapus.`, async () => { await api.delete(`/api/courses/${course.id}`); setCourse(null); setSel(""); setEditingCourseId(null); setTitle(""); await load(); })} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-70 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30">Hapus mata kuliah</button>}</div>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={editingCourseId ? "Judul mata kuliah" : "Judul mata kuliah baru"} className={`${inputClass} flex-1`} />
          <button disabled={pending !== null} onClick={async () => { setPending("course"); try { if (editingCourseId) { await api.put(`/api/courses/${editingCourseId}`, { title }); setEditingCourseId(null); showFeedback("Mata kuliah berhasil diperbarui."); } else { await api.post("/api/courses", { title, description: "" }); showFeedback("Mata kuliah berhasil ditambahkan."); } setTitle(""); await load(); if (sel) await loadCourse(editingCourseId || sel); } catch { showFeedback(editingCourseId ? "Mata kuliah gagal diperbarui." : "Mata kuliah gagal ditambahkan.", "error"); } finally { setPending(null); } }} className="primary-button sm:px-5 disabled:cursor-wait disabled:opacity-70">{pending === "course" ? <Spinner /> : editingCourseId ? <Save size={17} /> : <Plus size={17} />} {pending === "course" ? "Menyimpan..." : editingCourseId ? "Simpan perubahan" : "Tambah matkul"}</button>
          {editingCourseId && <button onClick={() => { setEditingCourseId(null); setTitle(""); }} className="secondary-button">Batal</button>}
        </div>
      </section>

      {course && (
        <>
          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200"><Settings2 size={19} /></div>
              <div><p className="eyebrow">Course structure</p><h2 className="mt-1 font-semibold">Modul untuk {course.title}</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Susun materi ke dalam modul yang mudah dipindai.</p></div>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <p className="text-sm font-semibold">Dosen pengampu</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Pilih satu atau beberapa dosen yang mengampu mata kuliah ini.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{lecturers.map((lecturer) => <label key={lecturer.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-zinc-900/60"><input type="checkbox" checked={selectedLecturers.includes(lecturer.id)} onChange={() => setSelectedLecturers((current) => current.includes(lecturer.id) ? current.filter((id) => id !== lecturer.id) : [...current, lecturer.id])} /> <span>{lecturer.name} <span className="text-xs text-zinc-500">({lecturer.nim})</span></span></label>)}</div>
              {lecturers.length === 0 && <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Belum ada akun dosen.</p>}
              <button disabled={pending !== null} onClick={async () => { setPending("instructors"); try { await api.put(`/api/courses/${course.id}/instructors`, { userIds: selectedLecturers }); await loadCourse(course.id); showFeedback("Dosen pengampu berhasil diperbarui."); } catch { showFeedback("Dosen pengampu gagal diperbarui.", "error"); } finally { setPending(null); } }} className="secondary-button mt-3 min-h-9 px-3 py-1.5 text-xs disabled:opacity-70">{pending === "instructors" ? <Spinner /> : <Save size={14} />} Simpan pengampu</button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={modTitle} onChange={(e) => setModTitle(e.target.value)} placeholder={editingModuleId ? "Judul modul" : "Judul modul baru"} className={`${inputClass} flex-1`} />
              <button disabled={pending !== null} onClick={async () => { setPending("module"); try { if (editingModuleId) { await api.put(`/api/courses/modules/${editingModuleId}`, { title: modTitle }); setEditingModuleId(null); showFeedback("Modul berhasil diperbarui."); } else { await api.post(`/api/courses/${course.id}/modules`, { title: modTitle, order: course.modules.length + 1 }); showFeedback("Modul berhasil ditambahkan."); } setModTitle(""); await loadCourse(course.id); } catch { showFeedback(editingModuleId ? "Modul gagal diperbarui." : "Modul gagal ditambahkan.", "error"); } finally { setPending(null); } }} className="primary-button sm:px-5 disabled:cursor-wait disabled:opacity-70">{pending === "module" ? <Spinner /> : editingModuleId ? <Save size={17} /> : <Plus size={17} />} {pending === "module" ? "Menyimpan..." : editingModuleId ? "Simpan perubahan" : "Tambah modul"}</button>
              {editingModuleId && <button onClick={() => { setEditingModuleId(null); setModTitle(""); }} className="secondary-button">Batal</button>}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              {course.modules.map((m: any, index: number) => <span key={m.id} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><span>{String(index + 1).padStart(2, "0")} · {m.title}</span><button onClick={() => { setEditingModuleId(m.id); setModTitle(m.title); }} className="font-bold text-violet-600">Edit</button><button disabled={pending !== null} onClick={() => remove(`Hapus modul ${m.title}? Materi dan quiz di dalamnya ikut terhapus.`, async () => { await api.delete(`/api/courses/modules/${m.id}`); if (editingModuleId === m.id) { setEditingModuleId(null); setModTitle(""); } await loadCourse(course.id); })} className="font-bold text-red-600">Hapus</button></span>)}
            </div>
          </section>

          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><CirclePlay size={19} /></div>
              <div><p className="eyebrow">Learning material</p><h2 className="mt-1 font-semibold">Tambah materi</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Gunakan label dan sumber yang konsisten agar mahasiswa tidak kehilangan konteks.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField value={mat.moduleId} onChange={(value) => setMat({ ...mat, moduleId: value })} ariaLabel="Pilih modul materi" options={course.modules.map((m: any) => ({ value: m.id, label: m.title }))} />
              <SelectField value={mat.type} onChange={(value) => setMat({ ...mat, type: value as any })} ariaLabel="Pilih tipe materi" options={[{ value: "VIDEO", label: "Video" }, { value: "PDF", label: "PDF" }, { value: "PPT", label: "Presentasi" }]} />
              <input value={mat.title} onChange={(e) => setMat({ ...mat, title: e.target.value })} placeholder="Judul materi" className={inputClass} />
              <SelectField value={mat.sourceType} onChange={(value) => setMat({ ...mat, sourceType: value as any })} ariaLabel="Pilih tipe sumber" options={[{ value: "youtube", label: "YouTube" }, { value: "drive", label: "Google Drive" }, { value: "upload", label: "Upload file" }]} />
              <input value={mat.sourceUrl} onChange={(e) => setMat({ ...mat, sourceUrl: e.target.value })} placeholder="URL YouTube/Drive atau path file" className={`${inputClass} md:col-span-2`} />
              {mat.type === "VIDEO" && <input value={mat.duration} onChange={(e) => setMat({ ...mat, duration: e.target.value })} placeholder="Durasi dalam detik, misalnya 600" className={inputClass} />}
              {(mat.type === "PDF" || mat.type === "PPT") && <input value={mat.totalPages} onChange={(e) => setMat({ ...mat, totalPages: e.target.value })} placeholder={mat.type === "PPT" ? "Total slide presentasi" : "Total halaman"} className={inputClass} />}
            </div>
            <button disabled={pending !== null} onClick={async () => { setPending("material"); try { const payload = { moduleId: mat.moduleId, title: mat.title, type: mat.type, sourceType: mat.sourceType, sourceUrl: mat.sourceUrl, duration: mat.duration ? Number(mat.duration) : undefined, totalPages: mat.totalPages ? Number(mat.totalPages) : undefined }; if (editingMaterialId) { await api.put(`/api/materials/${editingMaterialId}`, payload); showFeedback("Materi berhasil diperbarui."); } else { await api.post("/api/materials", payload); showFeedback("Materi berhasil disimpan."); } resetMaterial(); await loadCourse(course.id); } catch { showFeedback(editingMaterialId ? "Materi gagal diperbarui." : "Materi gagal disimpan.", "error"); } finally { setPending(null); } }} className="primary-button disabled:cursor-wait disabled:opacity-70">{pending === "material" ? <Spinner /> : <Save size={17} />} {pending === "material" ? "Menyimpan..." : editingMaterialId ? "Simpan perubahan" : "Simpan materi"}</button>
            {editingMaterialId && <button onClick={resetMaterial} className="secondary-button">Batal</button>}
            <div className="surface-muted rounded-xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Upload file materi</p><p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">PDF, PPT, atau video untuk dipakai langsung di course.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="file" id="fileup" aria-label="Pilih file materi untuk di-upload" title="Pilih file materi untuk di-upload" className="block max-w-full text-xs text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-200" />
                  <button disabled={pending !== null} onClick={async () => { const inp = document.getElementById("fileup") as HTMLInputElement; if (!inp.files?.[0]) return showFeedback("Pilih file terlebih dahulu.", "info"); if (!(await requestConfirmation("File akan disimpan ke mata kuliah yang dipilih."))) return; setPending("upload"); try { const fd = new FormData(); fd.append("file", inp.files[0]); fd.append("moduleId", mat.moduleId); fd.append("title", mat.title || inp.files[0].name); fd.append("type", mat.type); await api.post("/api/materials/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); inp.value = ""; setMat((m) => ({ ...m, title: "", sourceUrl: "", duration: "", totalPages: "" })); await loadCourse(course.id); showFeedback("File berhasil di-upload."); } catch { showFeedback("Upload file gagal.", "error"); } finally { setPending(null); } }} className="secondary-button min-h-10 text-xs disabled:cursor-wait disabled:opacity-70">{pending === "upload" ? <Spinner /> : <FileUp size={15} />} {pending === "upload" ? "Mengunggah..." : "Upload"}</button>
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="eyebrow">Existing materials</p>
              <div className="mt-3 space-y-2">
                {course.modules.flatMap((m: any) => m.materials.map((item: any) => ({ ...item, moduleTitle: m.title }))).map((item: any) => <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-zinc-50 px-3 py-3 text-sm dark:bg-zinc-800/70 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{item.moduleTitle} · {item.type} · {item.sourceType}</p></div><div className="flex gap-2"><button onClick={() => { setEditingMaterialId(item.id); setMat({ moduleId: item.moduleId, title: item.title, type: item.type, sourceType: item.sourceType, sourceUrl: item.sourceUrl, duration: item.duration ? String(item.duration) : "", totalPages: item.totalPages ? String(item.totalPages) : "" }); }} className="secondary-button min-h-9 px-3 py-1.5 text-xs">Edit</button><button disabled={pending !== null} onClick={() => remove(`Hapus materi ${item.title}?`, async () => { await api.delete(`/api/materials/${item.id}`); if (editingMaterialId === item.id) resetMaterial(); await loadCourse(course.id); })} className="inline-flex min-h-9 items-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:text-red-300">Hapus</button></div></div>)}
                {course.modules.every((m: any) => !m.materials.length) && <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada materi.</p>}
              </div>
            </div>
          </section>

          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"><ClipboardCheck size={19} /></div>
              <div><p className="eyebrow">Assessment builder</p><h2 className="mt-1 font-semibold">Tambah quiz</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Buat evaluasi dengan opsi jawaban dan kunci yang jelas.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField value={quiz.moduleId} onChange={(value) => setQuiz({ ...quiz, moduleId: value })} ariaLabel="Pilih modul quiz" options={course.modules.map((m: any) => ({ value: m.id, label: m.title }))} />
              <SelectField value={quiz.kind} onChange={(value) => setQuiz({ ...quiz, kind: value })} ariaLabel="Pilih jenis quiz" options={[{ value: "PRETEST", label: "Pretest" }, { value: "POSTTEST", label: "Posttest" }, { value: "QUIZ", label: "Quiz" }]} />
              <input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder="Judul quiz" className={`${inputClass} md:col-span-2`} />
              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-sm dark:border-zinc-700 md:col-span-2"><input type="checkbox" checked={quiz.showAnswers} onChange={(e) => setQuiz({ ...quiz, showAnswers: e.target.checked })} /> Tampilkan kunci jawaban setelah quiz selesai <span className="text-xs text-zinc-500">(default nonaktif)</span></label>
            </div>
            {quiz.questions.map((qq: any, idx: number) => (
              <div key={idx} className="surface-muted space-y-4 rounded-2xl p-4">
                <div className="flex items-center justify-between"><span className="eyebrow">Pertanyaan {String(idx + 1).padStart(2, "0")}</span><span className="text-xs text-zinc-400">Pilih radio untuk jawaban benar</span></div>
                <input value={qq.text} onChange={(e) => { const n = [...quiz.questions]; n[idx].text = e.target.value; setQuiz({ ...quiz, questions: n }); }} placeholder="Tulis pertanyaan" className={inputClass} />
                <div className="grid gap-3 md:grid-cols-2">
                  {qq.options.map((op: string, oi: number) => (
                    <label key={oi} className="flex items-center gap-3">
                      <input value={op} onChange={(e) => { const n = [...quiz.questions]; n[idx].options[oi] = e.target.value; setQuiz({ ...quiz, questions: n }); }} placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} className={`${inputClass} flex-1`} />
                      <input type="radio" name={`correct-${idx}`} checked={qq.correctIndex === oi} onChange={() => { const n = [...quiz.questions]; n[idx].correctIndex = oi; setQuiz({ ...quiz, questions: n }); }} className="h-4 w-4 accent-violet-600" aria-label={`Tandai opsi ${String.fromCharCode(65 + oi)} sebagai jawaban benar`} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="eyebrow">Existing quizzes</p>
              <div className="mt-3 space-y-2">
                {course.modules.flatMap((m: any) => m.quizzes.map((item: any) => ({ ...item, moduleTitle: m.title }))).map((item: any) => <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-zinc-50 px-3 py-3 text-sm dark:bg-zinc-800/70 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{item.moduleTitle} · {item.kind} · {item.questions.length} soal · Kunci {item.showAnswers ? "aktif" : "nonaktif"}</p></div><div className="flex gap-2"><button onClick={() => { setEditingQuizId(item.id); setQuiz({ moduleId: item.moduleId, title: item.title, kind: item.kind, showAnswers: item.showAnswers === true, questions: item.questions.map((q: any) => ({ text: q.text, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options), correctIndex: q.correctIndex })) }); }} className="secondary-button min-h-9 px-3 py-1.5 text-xs">Edit</button><button disabled={pending !== null} onClick={() => remove(`Hapus quiz ${item.title}? Riwayat pengerjaan quiz juga akan terhapus.`, async () => { await api.delete(`/api/quizzes/${item.id}`); if (editingQuizId === item.id) resetQuiz(); await loadCourse(course.id); })} className="inline-flex min-h-9 items-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:text-red-300">Hapus</button></div></div>)}
                {course.modules.every((m: any) => !m.quizzes.length) && <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada quiz.</p>}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setQuiz({ ...quiz, questions: [...quiz.questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }] })} className="secondary-button"><Plus size={17} /> Tambah soal</button>
              <button disabled={pending !== null} onClick={async () => { setPending("quiz"); try { const payload = { title: quiz.title, kind: quiz.kind, moduleId: quiz.moduleId, showAnswers: quiz.showAnswers, questions: quiz.questions.map((q: any, i: number) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, points: 10, order: i + 1 })) }; if (editingQuizId) { await api.put(`/api/quizzes/${editingQuizId}`, payload); showFeedback("Quiz berhasil diperbarui."); } else { await api.post("/api/quizzes", payload); showFeedback("Quiz berhasil dibuat."); } resetQuiz(); await loadCourse(course.id); } catch { showFeedback(editingQuizId ? "Quiz gagal diperbarui." : "Quiz gagal dibuat.", "error"); } finally { setPending(null); } }} className="primary-button disabled:cursor-wait disabled:opacity-70">{pending === "quiz" ? <Spinner /> : <Save size={17} />} {pending === "quiz" ? "Menyimpan..." : editingQuizId ? "Simpan perubahan" : "Simpan quiz"}</button>
              {editingQuizId && <button onClick={resetQuiz} className="secondary-button">Batal</button>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

