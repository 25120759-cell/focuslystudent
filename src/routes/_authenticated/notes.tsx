import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, RotateCcw, BookOpen, Brain, ListChecks, Check, X } from "lucide-react";
import { aiStudyNotes } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "AI Notes — Focusly" }] }),
});

type Flashcard = { front: string; back: string };
type QuizQ = { question: string; options: string[]; answer_index: number; explanation: string };
type Result = { summary: string; key_points: string[]; flashcards: Flashcard[]; quiz: QuizQ[] };

type Tab = "summary" | "flashcards" | "quiz";

function NotesPage() {
  const studyFn = useServerFn(aiStudyNotes);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<Tab>("summary");

  async function generate() {
    if (text.trim().length < 20) { setErr("Paste at least a paragraph of notes."); return; }
    setErr(null);
    setLoading(true);
    try {
      const r: any = await studyFn({ data: { text, mode: "all" } });
      setResult(r);
      setTab("summary");
    } catch (e: any) {
      setErr(e.message || "Failed to generate study aids.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" /> AI Study Notes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Paste your notes, lecture transcript, or textbook excerpt. AI will generate a summary, flashcards, and a quiz.</p>
      </div>

      <div className="rounded-3xl glass p-5 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste your study material here…"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm resize-y"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">{text.length} characters</span>
          <div className="flex items-center gap-2">
            {result && (
              <button onClick={() => { setResult(null); setText(""); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={generate}
              disabled={loading || text.trim().length < 20}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Generating…" : "Generate study aids"}
            </motion.button>
          </div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex gap-2 rounded-full bg-card border border-border p-1 w-fit">
              <TabBtn icon={<BookOpen className="h-3 w-3" />} label="Summary" active={tab === "summary"} onClick={() => setTab("summary")} />
              <TabBtn icon={<Brain className="h-3 w-3" />} label={`Flashcards (${result.flashcards.length})`} active={tab === "flashcards"} onClick={() => setTab("flashcards")} />
              <TabBtn icon={<ListChecks className="h-3 w-3" />} label={`Quiz (${result.quiz.length})`} active={tab === "quiz"} onClick={() => setTab("quiz")} />
            </div>

            {tab === "summary" && <SummaryView summary={result.summary} keyPoints={result.key_points} />}
            {tab === "flashcards" && <FlashcardsView cards={result.flashcards} />}
            {tab === "quiz" && <QuizView quiz={result.quiz} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"}`}>
      {icon} {label}
    </button>
  );
}

function SummaryView({ summary, keyPoints }: { summary: string; keyPoints: string[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl glass p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold mb-2">Summary</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>
      {keyPoints.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-2">Key points</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {keyPoints.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (cards.length === 0) return <div className="rounded-3xl glass p-6 text-sm text-muted-foreground">No flashcards generated.</div>;
  const card = cards[i];
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground text-center">Card {i + 1} of {cards.length}</div>
      <motion.div
        key={`${i}-${flipped}`}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        onClick={() => setFlipped((f) => !f)}
        className="rounded-3xl glass p-10 min-h-[220px] flex items-center justify-center text-center cursor-pointer select-none"
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{flipped ? "Back" : "Front"}</div>
          <p className="font-display text-xl leading-snug">{flipped ? card.back : card.front}</p>
          <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
        </div>
      </motion.div>
      <div className="flex justify-between">
        <button onClick={() => { setFlipped(false); setI((p) => Math.max(0, p - 1)); }} disabled={i === 0} className="rounded-full border border-border bg-card px-4 py-1.5 text-xs disabled:opacity-50">← Prev</button>
        <button onClick={() => { setFlipped(false); setI((p) => Math.min(cards.length - 1, p + 1)); }} disabled={i === cards.length - 1} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50">Next →</button>
      </div>
    </div>
  );
}

function QuizView({ quiz }: { quiz: QuizQ[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  if (quiz.length === 0) return <div className="rounded-3xl glass p-6 text-sm text-muted-foreground">No quiz generated.</div>;
  const score = quiz.reduce((s, q, i) => s + (answers[i] === q.answer_index ? 1 : 0), 0);

  return (
    <div className="space-y-4">
      {quiz.map((q, qi) => {
        const picked = answers[qi];
        return (
          <div key={qi} className="rounded-3xl glass p-5">
            <p className="font-medium text-sm mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = submitted && oi === q.answer_index;
                const isWrong = submitted && isPicked && oi !== q.answer_index;
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers((a) => ({ ...a, [qi]: oi }))}
                    disabled={submitted}
                    className={`w-full text-left text-sm rounded-xl border px-3 py-2 transition-colors flex items-center gap-2 ${
                      isCorrect ? "border-emerald-500 bg-emerald-500/10" :
                      isWrong ? "border-destructive bg-destructive/10" :
                      isPicked ? "border-primary bg-primary/10" :
                      "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
                    {isWrong && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="mt-3 text-xs text-muted-foreground border-l-2 border-primary pl-3">{q.explanation}</p>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-3xl glass p-4">
        {!submitted ? (
          <>
            <span className="text-xs text-muted-foreground">{Object.keys(answers).length} of {quiz.length} answered</span>
            <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < quiz.length} className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              Submit quiz
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold">Score: {score}/{quiz.length} ({Math.round((score / quiz.length) * 100)}%)</span>
            <button onClick={() => { setAnswers({}); setSubmitted(false); }} className="rounded-full border border-border bg-card px-4 py-1.5 text-xs">Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
