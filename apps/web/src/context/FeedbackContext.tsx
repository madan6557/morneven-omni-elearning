import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Feedback = { message: string; type: "success" | "error" | "info" };
type FeedbackContextValue = { showFeedback: (message: string, type?: Feedback["type"]) => void; requestConfirmation: (message: string) => Promise<boolean>; unsavedMessage: string | null; setUnsavedChanges: (message: string | null) => void };

const FeedbackContext = createContext<FeedbackContextValue>({ showFeedback: () => {}, requestConfirmation: async () => false, unsavedMessage: null, setUnsavedChanges: () => {} });

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [unsavedMessage, setUnsavedChanges] = useState<string | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const showFeedback = useCallback((message: string, type: Feedback["type"] = "success") => setFeedback({ message, type }), []);
  const requestConfirmation = useCallback((message: string) => new Promise<boolean>((resolve) => { resolver.current = resolve; setConfirmation(message); }), []);
  const answerConfirmation = (accepted: boolean) => { setConfirmation(null); resolver.current?.(accepted); resolver.current = null; };

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsavedMessage) return;
      event.preventDefault();
      event.returnValue = unsavedMessage;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [unsavedMessage]);

  return <FeedbackContext.Provider value={{ showFeedback, requestConfirmation, unsavedMessage, setUnsavedChanges }}>
    {children}
    {feedback && <div role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"} className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${feedback.type === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-200" : feedback.type === "info" ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/90 dark:text-violet-200" : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-200"}`}>{feedback.message}</div>}
    {confirmation && <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"><p className="eyebrow">Konfirmasi aksi</p><h2 id="confirmation-title" className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">Lanjutkan aksi ini?</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{confirmation}</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => answerConfirmation(false)} className="secondary-button">Batal</button><button autoFocus onClick={() => answerConfirmation(true)} className="primary-button">Lanjutkan</button></div></div></div>}
  </FeedbackContext.Provider>;
}

export const useFeedback = () => useContext(FeedbackContext);
