import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import { useFeedback } from "../context/FeedbackContext";
import { Spinner } from "../components/Loading";
import { Send } from "lucide-react";

export default function Assignment() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { showFeedback } = useFeedback();
  useEffect(() => { api.get(`/api/assignments/${id}`).then((r) => setAssignment(r.data)).catch(() => {}); api.get(`/api/assignments/${id}/submission`).then((r) => { setSubmission(r.data); setNote(r.data?.note || ""); setExternalUrl(r.data?.externalUrl || ""); }).catch(() => {}); }, [id]);
  if (!assignment) return <div className="section-card text-sm text-zinc-500">Memuat tugas...</div>;
  const submit = async () => { setSaving(true); try { const form = new FormData(); form.append("note", note); form.append("externalUrl", externalUrl); if (file) form.append("file", file); const response = await api.post(`/api/assignments/${id}/submit`, form); setSubmission(response.data); setFile(null); showFeedback("Tugas berhasil dikumpulkan."); } catch (error: any) { showFeedback(error.response?.data?.message || "Tugas gagal dikumpulkan.", "error"); } finally { setSaving(false); } };
  return <div className="mx-auto max-w-3xl space-y-6"><Link to={assignment.module?.courseId ? `/courses/${assignment.module.courseId}` : "/courses"} className="text-sm text-zinc-500">← Kembali ke mata kuliah</Link><section className="section-card space-y-3"><p className="eyebrow">Tugas · {assignment.module?.title || "Modul"}</p><h1 className="text-3xl font-bold">{assignment.title}</h1>{assignment.description && <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">{assignment.description}</p>}<p className="text-sm font-medium text-amber-700">{assignment.deadline ? `Deadline: ${new Date(assignment.deadline).toLocaleString()}` : "Tanpa deadline"}</p></section><section className="section-card space-y-4"><h2 className="font-semibold"><Send className="mr-2 inline" size={18} /> Serahkan tugas</h2>{submission && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><p>Sudah dikumpulkan {new Date(submission.submittedAt).toLocaleString()}.</p>{submission.score !== null && <p className="mt-1 font-semibold">Nilai: {submission.score}/100{submission.feedback ? ` · ${submission.feedback}` : ""}</p>}{submission.fileUrl && <a className="mt-2 inline-block underline" href={`${api.defaults.baseURL || ""}${submission.fileUrl}`} target="_blank" rel="noreferrer">Buka file: {submission.fileName || "lampiran"}</a>}</div>}<textarea className="field min-h-28" placeholder="Catatan untuk dosen (opsional)" value={note} onChange={(e) => setNote(e.target.value)} /><label className="block space-y-2 text-sm font-medium">Lampiran file (opsional)<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><p className="text-xs text-zinc-500">Format: PDF, Office, TXT/CSV, gambar, audio, atau video. Maksimal 25 MB.</p><button onClick={submit} disabled={saving} className="primary-button"><Send size={17} /> {saving ? <Spinner /> : "Serahkan tugas"}</button></section></div>;
}
