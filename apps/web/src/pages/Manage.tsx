import { useEffect, useState } from "react";
import { ChevronDown, FileUp, Plus, Save } from "lucide-react";
import api from "../lib/api";

type SelectOption = { value: string; label: string };

function SelectField({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: SelectOption[]; ariaLabel: string }) {
  return (
    <div className="select-shell">
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className="field select-field">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="select-chevron" size={17} strokeWidth={2} />
    </div>
  );
}

const inputClass = "field";

export default function Manage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [sel, setSel] = useState("");
  const [course, setCourse] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [modTitle, setModTitle] = useState("");
  const [mat, setMat] = useState({ moduleId: "", title: "", type: "VIDEO", sourceType: "youtube", sourceUrl: "", duration: "", totalPages: "12" });
  const [quiz, setQuiz] = useState({ moduleId: "", title: "", kind: "PRETEST", questions: [{ text: "", options: ["", "", "", ""], correctIndex: 0 }] as any[] });

  const load = async () => {
    const r = await api.get("/api/courses");
    setCourses(r.data);
    if (r.data[0] && !sel) setSel(r.data[0].id);
  };

  const loadCourse = async (id: string) => {
    const r = await api.get(`/api/courses/${id}`);
    setCourse(r.data);
    if (r.data.modules[0]) {
      setMat((m) => ({ ...m, moduleId: r.data.modules[0].id }));
      setQuiz((q) => ({ ...q, moduleId: r.data.modules[0].id }));
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (sel) loadCourse(sel); }, [sel]);

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

      <section className="section-card space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><BookOpenIcon /></div>
          <div><h2 className="font-semibold">Pilih mata kuliah</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Kelola struktur konten dari satu workspace.</p></div>
        </div>
        <SelectField value={sel} onChange={setSel} ariaLabel="Pilih mata kuliah" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul mata kuliah baru" className={`${inputClass} flex-1`} />
          <button onClick={async () => { await api.post("/api/courses", { title, description: "" }); setTitle(""); load(); }} className="primary-button sm:px-5"><Plus size={17} /> Tambah matkul</button>
        </div>
      </section>

      {course && (
        <>
          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200"><LayersIcon /></div>
              <div><p className="eyebrow">Course structure</p><h2 className="mt-1 font-semibold">Modul untuk {course.title}</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Susun materi ke dalam modul yang mudah dipindai.</p></div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={modTitle} onChange={(e) => setModTitle(e.target.value)} placeholder="Judul modul baru" className={`${inputClass} flex-1`} />
              <button onClick={async () => { await api.post(`/api/courses/${course.id}/modules`, { title: modTitle, order: course.modules.length + 1 }); loadCourse(course.id); setModTitle(""); }} className="primary-button sm:px-5"><Plus size={17} /> Tambah modul</button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              {course.modules.map((m: any, index: number) => <span key={m.id} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{String(index + 1).padStart(2, "0")} · {m.title}</span>)}
            </div>
          </section>

          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><VideoIcon /></div>
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
            <button onClick={async () => { await api.post("/api/materials", { moduleId: mat.moduleId, title: mat.title, type: mat.type, sourceType: mat.sourceType, sourceUrl: mat.sourceUrl, duration: mat.duration ? Number(mat.duration) : undefined, totalPages: mat.totalPages ? Number(mat.totalPages) : undefined }); alert("Materi ditambah"); loadCourse(course.id); }} className="primary-button"><Save size={17} /> Simpan materi</button>
            <div className="surface-muted rounded-xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Upload file materi</p><p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">PDF, PPT, atau video untuk dipakai langsung di course.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="file" id="fileup" className="block max-w-full text-xs text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-200" />
                  <button onClick={async () => { const inp = document.getElementById("fileup") as HTMLInputElement; if (!inp.files?.[0]) return alert("Pilih file terlebih dahulu"); const fd = new FormData(); fd.append("file", inp.files[0]); fd.append("moduleId", mat.moduleId); fd.append("title", mat.title || inp.files[0].name); fd.append("type", mat.type); await api.post("/api/materials/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); alert("Uploaded"); loadCourse(course.id); }} className="secondary-button min-h-10 text-xs"><FileUp size={15} /> Upload</button>
                </div>
              </div>
            </div>
          </section>

          <section className="section-card space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"><QuizIcon /></div>
              <div><p className="eyebrow">Assessment builder</p><h2 className="mt-1 font-semibold">Tambah quiz</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Buat evaluasi dengan opsi jawaban dan kunci yang jelas.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField value={quiz.moduleId} onChange={(value) => setQuiz({ ...quiz, moduleId: value })} ariaLabel="Pilih modul quiz" options={course.modules.map((m: any) => ({ value: m.id, label: m.title }))} />
              <SelectField value={quiz.kind} onChange={(value) => setQuiz({ ...quiz, kind: value })} ariaLabel="Pilih jenis quiz" options={[{ value: "PRETEST", label: "Pretest" }, { value: "POSTTEST", label: "Posttest" }, { value: "QUIZ", label: "Quiz" }]} />
              <input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder="Judul quiz" className={`${inputClass} md:col-span-2`} />
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setQuiz({ ...quiz, questions: [...quiz.questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }] })} className="secondary-button"><Plus size={17} /> Tambah soal</button>
              <button onClick={async () => { await api.post("/api/quizzes", { title: quiz.title, kind: quiz.kind, moduleId: quiz.moduleId, questions: quiz.questions.map((q: any, i: number) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, points: 10, order: i + 1 })) }); alert("Quiz dibuat"); }} className="primary-button"><Save size={17} /> Simpan quiz</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function BookOpenIcon() { return <span className="text-lg">◈</span>; }
function LayersIcon() { return <span className="text-lg">▱</span>; }
function VideoIcon() { return <span className="text-lg">▶</span>; }
function QuizIcon() { return <span className="text-lg">?</span>; }
