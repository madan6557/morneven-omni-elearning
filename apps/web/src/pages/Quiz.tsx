import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import { useFeedback } from "../context/FeedbackContext";
import { Spinner } from "../components/Loading";

const mediaUrl = (value: string) => value.startsWith("/") ? `${api.defaults.baseURL || ""}${value}` : value;
const finiteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const scoreText = (value: unknown) => {
  const score = finiteNumber(value);
  return score === null ? "Belum dinilai" : `${Math.round(score)}%`;
};
const kindLabel = (kind: string) => kind === "PRETEST" ? "Pretest" : kind === "POSTTEST" ? "Posttest" : "Quiz";
const formatRemaining = (seconds: number | null) => {
  if (seconds === null) return "";
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export default function Quiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startMessage, setStartMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showFeedback, requestConfirmation } = useFeedback();

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/quizzes/${id}`);
      const loadedQuiz = response.data;
      setQuiz(loadedQuiz);
      const history = await api.get(`/api/quizzes/${id}/attempts`);
      const loadedAttempts = Array.isArray(history.data) ? history.data : [];
      setAttempts(loadedAttempts);
      const submittedCount = loadedAttempts.filter((attempt: any) => attempt.submittedAt).length;
      const canStart = loadedQuiz.attemptLimit !== 0 && !(loadedQuiz.attemptLimit > 0 && submittedCount >= loadedQuiz.attemptLimit);
      setStartMessage(canStart ? "" : loadedQuiz.attemptLimit === 0 ? "Quiz ini ditutup oleh pengelola." : `Batas attempt ${loadedQuiz.attemptLimit}x telah tercapai.`);
      if (canStart) {
        try {
          const started = await api.post(`/api/quizzes/${id}/start`);
          setActiveAttempt(started.data);
        } catch (reason: any) {
          const status = reason?.response?.status;
          if (status === 400 || status === 403) setStartMessage(reason?.response?.data?.message || "Quiz belum dapat dimulai saat ini.");
          else throw reason;
        }
      }
      setError("");
    } catch (reason: any) {
      setError(reason?.response?.data?.message || "Quiz tidak dapat dimuat atau belum tersedia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  useEffect(() => {
    if (!activeAttempt?.expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt?.expiresAt]);

  const submittedAttempts = useMemo(() => attempts.filter((attempt) => attempt.submittedAt), [attempts]);
  const remainingSeconds = activeAttempt?.expiresAt
    ? Math.ceil((new Date(activeAttempt.expiresAt).getTime() - now) / 1000)
    : null;
  const timeExpired = remainingSeconds !== null && remainingSeconds <= 0;
  const canSubmit = Boolean(activeAttempt) && !timeExpired && quiz?.attemptLimit !== 0 && !(quiz?.attemptLimit > 0 && submittedAttempts.length >= quiz.attemptLimit);

  const submit = async () => {
    if (!(await requestConfirmation("Jawaban akan dikirim dan tidak dapat diubah setelah dikirim.")) || submitting || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        answers: (quiz.questions || []).map((question: any) => question.type === "ESSAY"
          ? ({ questionId: question.id, answerText: String(answers[question.id] || "") })
          : ({ questionId: question.id, chosen: Number(answers[question.id] ?? -1) }))
      };
      const response = await api.post(`/api/quizzes/${id}/submit`, payload);
      setActiveAttempt(null);
      setResult(response.data);
      const history = await api.get(`/api/quizzes/${id}/attempts`);
      setAttempts(Array.isArray(history.data) ? history.data : []);
      showFeedback("Jawaban berhasil dikirim.");
    } catch (reason: any) {
      const message = reason?.response?.data?.message || "Jawaban gagal dikirim.";
      setError(message);
      showFeedback(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="section-card text-sm text-zinc-500">Memuat quiz...</div>;
  if (error || !quiz) return <div className="mx-auto max-w-3xl space-y-4"><Link to="/courses" className="text-sm text-zinc-500">← Kembali ke mata kuliah</Link><div role="alert" className="section-card text-sm text-red-700">{error || "Quiz tidak ditemukan."}</div></div>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link to={quiz.module?.courseId ? `/courses/${quiz.module.courseId}` : "/courses"} className="text-sm text-zinc-500 dark:text-zinc-400">← Kembali</Link>
    <section className="section-card space-y-3">
      <p className="eyebrow">{kindLabel(quiz.kind)} · {quiz.module?.title || "Modul"}</p>
      <h1 className="text-2xl font-bold sm:text-3xl">{quiz.title}</h1>
      <p className="text-sm text-zinc-500">{quiz.questions?.length || 0} soal · Lulus {finiteNumber(quiz.passingScore) ?? 0}% · {quiz.attemptLimit === -1 ? "Attempt tak terbatas" : quiz.attemptLimit === 0 ? "Quiz ditutup" : `Batas ${quiz.attemptLimit}x`}{quiz.deadline ? ` · Deadline ${new Date(quiz.deadline).toLocaleString()}` : " · Tanpa deadline"}{quiz.timeLimit ? ` · Timer ${quiz.timeLimit} menit` : ""}</p>
      {remainingSeconds !== null && <div className={`rounded-xl border p-3 text-sm font-semibold ${timeExpired ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>Waktu tersisa: {formatRemaining(remainingSeconds)}{timeExpired ? " · Waktu habis" : ""}</div>}
      {quiz.resultReleaseMode !== "HIDDEN" && <p className="text-xs text-zinc-500">Publikasi nilai: {quiz.resultReleaseMode === "SCHEDULED" ? quiz.resultReleaseAt ? `terjadwal ${new Date(quiz.resultReleaseAt).toLocaleString()}` : "terjadwal" : "manual oleh dosen/admin"}.</p>}
      {!activeAttempt && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{startMessage || "Quiz belum dapat dimulai saat ini."}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {result && <div className={`rounded-xl border p-4 ${result.resultStatus ? "border-blue-200 bg-blue-50 text-blue-800" : result.passed ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><p className="font-bold">{result.resultStatus || (result.passed ? "Lulus" : "Belum lulus")}</p><p className="text-sm">{result.resultStatus || `Skor: ${scoreText(result.score)} (${finiteNumber(result.rawScore) ?? 0}/${finiteNumber(result.maxScore) ?? 0} poin)`}</p></div>}
    </section>
    <div className="space-y-4">{(quiz.questions || []).map((question: any, index: number) => <section key={question.id} className="section-card space-y-3">
      <h2 className="font-medium">{index + 1}. {question.text}</h2>
      {question.imageUrl && <img src={mediaUrl(question.imageUrl)} alt={`Gambar soal ${index + 1}`} className="max-h-72 rounded-xl object-contain" />}
      {question.type === "ESSAY" ? <label className="block space-y-2 text-sm font-medium">Jawaban essay<textarea className="field min-h-32" placeholder="Tulis jawaban essay..." value={String(answers[question.id] || "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} disabled={!canSubmit} /></label> : <div className="space-y-2">{(Array.isArray(question.options) ? question.options : []).map((option: string, optionIndex: number) => <label key={optionIndex} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${answers[question.id] === optionIndex ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700"}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} disabled={!canSubmit} /><span className="text-sm">{String.fromCharCode(65 + optionIndex)}. {option}</span></label>)}</div>}
    </section>)}</div>
    <button type="button" disabled={submitting || !canSubmit} onClick={submit} className="primary-button w-full justify-center">{submitting && <Spinner />}{quiz.attemptLimit === 0 ? "Quiz ditutup" : timeExpired ? "Waktu habis" : !activeAttempt ? "Quiz belum dapat dimulai" : !canSubmit ? "Batas attempt tercapai" : submitting ? "Mengirim..." : "Kirim jawaban"}</button>
    {attempts.length > 0 && <section className="section-card space-y-3"><h2 className="font-semibold">Riwayat percobaan</h2>{attempts.map((attempt: any) => <div key={attempt.id} className="flex flex-wrap justify-between gap-2 border-b border-zinc-200 py-2 text-sm last:border-0 dark:border-zinc-700"><span>{new Date(attempt.submittedAt || attempt.startedAt).toLocaleString()}</span><span>{attempt.resultStatus || scoreText(attempt.score)}{attempt.passed === true ? " · Lulus" : ""}</span></div>)}</section>}
  </div>;
}
