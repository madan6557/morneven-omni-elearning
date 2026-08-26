import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Feedback = { message: string; type: "success" | "error" | "info" };
type FeedbackContextValue = { showFeedback: (message: string, type?: Feedback["type"]) => void };

const FeedbackContext = createContext<FeedbackContextValue>({ showFeedback: () => {} });

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const showFeedback = useCallback((message: string, type: Feedback["type"] = "success") => setFeedback({ message, type }), []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return <FeedbackContext.Provider value={{ showFeedback }}>
    {children}
    {feedback && <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${feedback.type === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-200" : feedback.type === "info" ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/90 dark:text-violet-200" : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-200"}`}>{feedback.message}</div>}
  </FeedbackContext.Provider>;
}

export const useFeedback = () => useContext(FeedbackContext);
