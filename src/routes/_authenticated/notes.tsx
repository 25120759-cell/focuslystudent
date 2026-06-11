import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Loader2, RotateCcw, BookOpen, Brain, ListChecks, Check, X,
  Pencil, Save, Trash2, RefreshCw, Image as ImageIcon, Crown, History, WifiOff, Cloud, CloudUpload,
} from "lucide-react";
import { aiCredits, aiStudyNotes, saveArtifact, listArtifacts } from "@/lib/ai.functions";
import { saveLocal, getLocal, listLocal, deleteLocal, markClean, makeKey, listDirty } from "@/lib/ai-cache";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "AI Notes — Focusly" }] }),
});

type Flashcard = { front: string; back: string };
type QuizQ = { question: string; options: string[]; answer_index: number; explanation: string };
type Result = { summary: string; key_points: string[]; flashcards: Flashcard[]; quiz: QuizQ[] };
type Tab = "summary" | "flashcards" | "quiz";

function emptyResult(): Result { return { summary: "", key_points: [], flashcards: [], quiz: [] }; }

function NotesPage() {
  const studyFn = useServerFn(aiStudyNotes);
  const creditsFn = useServerFn(aiCredits);
  const saveFn = useServerFn(saveArtifact);
  const listFn = useServerFn(listArtifacts);

  const [text, setText] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | "all" | "summary" | "flashcards" | "quiz">(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [creds, setCreds] = useState<any>(null);
  const [key, setKey] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled notes");
  const [savedList, setSavedList] = useState<any[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    creditsFn().then(setCreds).catch(() => {});
    refreshSavedList();
    const up = () => setOnline(true); const down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  async function refreshSavedList() {
    const local = await listLocal("notes");
    setSavedList(local);
    if (navigator.onLine) {
      try {
        const r: any = await listFn({ data: { kind: "notes" } });
        for (const a of r.artifacts ?? []) {
          const k = `notes:${a.ref_id ?? a.id}`;
          const existing = await getLocal(k);
          if (!existing || existing.updated_at < new Date(a.updated_at).getTime()) {
            await saveLocal({ key: k, kind: "notes", ref_id: a.ref_id ?? a.id, title: a.title, payload: a.payload, updated_at: new Date(a.updated_at).getTime(), cloud_id: a.id, dirty: false });
          }
        }
        setSavedList(await listLocal("notes"));
      } catch {}
    }
  }

  function reachedLimit() {
    if (!creds) return false;
    return creds.dayUsed >= creds.dayLimit || creds.monthUsed >= creds.monthLimit;
  }

  async function persist(next: Result, opts?: { newKey?: boolean }) {
    let k = key;
    if (!k || opts?.newKey) { k = makeKey("notes", null); setKey(k); }
    await saveLocal({ key: k, kind: "notes", ref_id: k.split(":")[1], title, payload: { text, image: imageData, result: next }, dirty: true });
    if (navigator.onLine) syncOne(k).catch(() => {});
  }

  async function syncOne(k: string) {
    const local = await getLocal(k);
    if (!local) return;
    try {
      const r: any = await saveFn({ data: { kind: "notes", ref_id: local.ref_id, title: local.title, payload: local.payload } });
      await markClean(k, r.id);
      refreshSavedList();
    } catch {}
  }

  async function generate(mode: "all" | "summary" | "flashcards" | "quiz") {
    if (text.trim().length < 20) { setErr("Paste at least a paragraph of notes."); return; }
    if (reachedLimit()) { setErr("You've hit your AI limit. Upgrade or wait for the next cycle."); return; }
    setErr(null);
    setLoading(mode);
    try {
      const r: any = await studyFn({ data: { text, mode, user_instruction: instruction || undefined, image_data_url: imageData || undefined } });
      const base = result ?? emptyResult();
      const merged: Result = {
        summary: r.summary ?? base.summary,
        key_points: r.key_points ?? base.key_points,
        flashcards: r.flashcards ?? base.flashcards,
        quiz: r.quiz ?? base.quiz,
      };
      setResult(merged);
      if (mode === "all") setTab("summary");
      else setTab(mode);
      setInstruction("");
      await persist(merged, { newKey: !key });
      creditsFn().then(setCreds).catch(() => {});
    } catch (e: any) {
      setErr(e.message || "Failed to generate study aids.");
    } finally {
      setLoading(null);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1_500_000) { setErr("Image too large (max 1.5MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function loadSaved(item: any) {
    setKey(item.key);
    setTitle(item.title || "Untitled notes");
    setText(item.payload?.text ?? "");
    setImageData(item.payload?.image ?? null);
    setResult(item.payload?.result ?? null);
    setTab("summary");
    setShowSaved(false);
  }

  async function deleteSaved(item: any) {
    await deleteLocal(item.key);
    refreshSavedList();
    if (item.key === key) { setKey(null); setResult(null); setText(""); setImageData(null); setTitle("Untitled notes"); }
  }

  async function newDoc() {
    setKey(null); setResult(null); setText(""); setImageData(null); setTitle("Untitled notes"); setShowSaved(false);
  }

  function updateResult(patch: Partial<Result>) {
    if (!result) return;
    const next = { ...result, ...patch };
    setResult(next);
    persist(next);
  }

  const isMax = creds?.plan === "max";
  const isPro = creds?.plan === "pro";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" /> AI Study Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Paste notes — get a summary, flashcards, and quiz. Saved offline.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-card border border-border">
            {online ? <Cloud className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-amber-500" />}
            {online ? "Online" : "Offline"}
          </span>
          <button onClick={() => setShowSaved((s) => !s)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
            <History className="h-3 w-3" /> Saved ({savedList.length})
          </button>
          <button onClick={newDoc} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">+ New</button>
        </div>
      </div>

      {creds && (
        <div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs flex items-center justify-between gap-2 flex-wrap">
          <span>
            <strong className="capitalize">{creds.plan}</strong> plan · {creds.dayUsed}/{creds.dayLimit} today · {creds.monthUsed}/{creds.monthLimit} this month
            {isMax && <span className="ml-2 text-amber-600 font-medium"><Crown className="inline h-3 w-3" /> smarter model + vision + 20k chars</span>}
          </span>
          {reachedLimit() && <span className="text-destructive font-medium">Limit reached — upgrade for more</span>}
        </div>
      )}

      {showSaved && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl glass p-4 space-y-2 max-h-80 overflow-auto">
          {savedList.length === 0 && <p className="text-xs text-muted-foreground">Nothing saved yet.</p>}
          {savedList.map((it: any) => (
            <div key={it.key} className="flex items-center justify-between gap-2 rounded-xl bg-card border border-border px-3 py-2">
              <button onClick={() => loadSaved(it)} className="flex-1 text-left text-sm truncate">
                <div className="font-medium truncate">{it.title || "Untitled"}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  {new Date(it.updated_at).toLocaleString()}
                  {it.dirty ? <span className="text-amber-600">unsynced</span> : it.cloud_id ? <span className="text-emerald-600 flex items-center gap-0.5"><CloudUpload className="h-2.5 w-2.5" /> synced</span> : null}
                </div>
              </button>
              <button onClick={() => deleteSaved(it)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </motion.div>
      )}

      <div className="rounded-3xl glass p-5 space-y-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (result) persist(result); }}
          className="w-full bg-transparent font-display text-xl font-semibold outline-none"
          placeholder="Note title"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste your study material here…"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm resize-y"
        />
        {imageData && (
          <div className="relative inline-block">
            <img src={imageData} alt="attachment" className="max-h-32 rounded-lg border border-border" />
            <button onClick={() => setImageData(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {text.length} / {creds?.capabilities?.max_chars ?? 4000} characters
            {!isMax && text.length > (creds?.capabilities?.max_chars ?? 4000) && <span className="text-destructive ml-1">truncated on send</span>}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {isMax && (
              <label className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs cursor-pointer hover:bg-accent">
                <ImageIcon className="h-3 w-3" /> Attach photo
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              </label>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => generate("all")}
              disabled={loading !== null || text.trim().length < 20 || reachedLimit()}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading === "all" ? "Generating…" : result ? "Regenerate all" : "Generate study aids"}
            </motion.button>
          </div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 rounded-full bg-card border border-border p-1 w-fit">
                <TabBtn icon={<BookOpen className="h-3 w-3" />} label="Summary" active={tab === "summary"} onClick={() => setTab("summary")} />
                <TabBtn icon={<Brain className="h-3 w-3" />} label={`Flashcards (${result.flashcards.length})`} active={tab === "flashcards"} onClick={() => setTab("flashcards")} />
                <TabBtn icon={<ListChecks className="h-3 w-3" />} label={`Quiz (${result.quiz.length})`} active={tab === "quiz"} onClick={() => setTab("quiz")} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Optional: tell AI how to change it"
                  className="rounded-full border border-input bg-background px-3 py-1.5 text-xs w-56"
                />
                <button
                  onClick={() => generate(tab)}
                  disabled={loading !== null || reachedLimit()}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {loading === tab ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Regenerate {tab}
                </button>
              </div>
            </div>

            {tab === "summary" && <SummaryView result={result} onChange={(p) => updateResult(p)} />}
            {tab === "flashcards" && <FlashcardsView cards={result.flashcards} onChange={(cards) => updateResult({ flashcards: cards })} />}
            {tab === "quiz" && <QuizView quiz={result.quiz} onChange={(quiz) => updateResult({ quiz })} />}
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

function SummaryView({ result, onChange }: { result: Result; onChange: (p: Partial<Result>) => void }) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(result.summary);
  const [points, setPoints] = useState(result.key_points.join("\n"));
  useEffect(() => { setSummary(result.summary); setPoints(result.key_points.join("\n")); }, [result.summary, result.key_points]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Summary</h2>
        {editing ? (
          <button onClick={() => { onChange({ summary, key_points: points.split("\n").map((p) => p.trim()).filter(Boolean) }); setEditing(false); }} className="inline-flex items-center gap-1 text-xs rounded-full bg-primary px-3 py-1 text-primary-foreground">
            <Save className="h-3 w-3" /> Save
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs rounded-full border border-border bg-card px-3 py-1 hover:bg-accent">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} className="w-full rounded-xl border border-input bg-background p-3 text-sm" />
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
      )}
      <div>
        <h3 className="font-display text-base font-semibold mb-2">Key points</h3>
        {editing ? (
          <textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={6} placeholder="One per line" className="w-full rounded-xl border border-input bg-background p-3 text-sm font-mono" />
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm">
            {result.key_points.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function FlashcardsView({ cards, onChange }: { cards: Flashcard[]; onChange: (c: Flashcard[]) => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  if (cards.length === 0) return <div className="rounded-3xl glass p-6 text-sm text-muted-foreground">No flashcards generated.</div>;
  const card = cards[Math.min(i, cards.length - 1)];

  function patch(field: "front" | "back", v: string) {
    const next = cards.map((c, idx) => idx === i ? { ...c, [field]: v } : c);
    onChange(next);
  }
  function delCard() {
    const next = cards.filter((_, idx) => idx !== i);
    onChange(next);
    setI((p) => Math.max(0, Math.min(p, next.length - 1)));
  }
  function addCard() {
    onChange([...cards, { front: "New card", back: "Answer" }]);
    setI(cards.length);
    setEditing(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Card {i + 1} of {cards.length}</span>
        <div className="flex gap-2">
          <button onClick={addCard} className="rounded-full border border-border bg-card px-2 py-1">+ Add</button>
          <button onClick={() => setEditing((e) => !e)} className="rounded-full border border-border bg-card px-2 py-1 inline-flex items-center gap-1">
            {editing ? <Save className="h-3 w-3" /> : <Pencil className="h-3 w-3" />} {editing ? "Done" : "Edit"}
          </button>
          <button onClick={delCard} className="rounded-full border border-border bg-card px-2 py-1 text-destructive">Delete</button>
        </div>
      </div>
      <motion.div
        key={`${i}-${flipped}-${editing}`}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={() => !editing && setFlipped((f) => !f)}
        className="rounded-3xl glass p-10 min-h-[220px] flex items-center justify-center text-center cursor-pointer select-none"
      >
        <div className="w-full">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{flipped ? "Back" : "Front"}</div>
          {editing ? (
            <textarea
              value={flipped ? card.back : card.front}
              onChange={(e) => patch(flipped ? "back" : "front", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-center font-display text-xl border border-input rounded-xl p-3"
              rows={4}
            />
          ) : (
            <p className="font-display text-xl leading-snug">{flipped ? card.back : card.front}</p>
          )}
          {!editing && <p className="text-xs text-muted-foreground mt-4">Click to flip</p>}
        </div>
      </motion.div>
      <div className="flex justify-between">
        <button onClick={() => { setFlipped(false); setI((p) => Math.max(0, p - 1)); }} disabled={i === 0} className="rounded-full border border-border bg-card px-4 py-1.5 text-xs disabled:opacity-50">← Prev</button>
        <button onClick={() => { setFlipped(false); setI((p) => Math.min(cards.length - 1, p + 1)); }} disabled={i === cards.length - 1} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50">Next →</button>
      </div>
    </div>
  );
}

function QuizView({ quiz, onChange }: { quiz: QuizQ[]; onChange: (q: QuizQ[]) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  if (quiz.length === 0) return <div className="rounded-3xl glass p-6 text-sm text-muted-foreground">No quiz generated.</div>;
  const score = quiz.reduce((s, q, i) => s + (answers[i] === q.answer_index ? 1 : 0), 0);

  function updateQ(idx: number, patch: Partial<QuizQ>) {
    onChange(quiz.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }
  function delQ(idx: number) { onChange(quiz.filter((_, i) => i !== idx)); setEditIdx(null); }

  return (
    <div className="space-y-4">
      {quiz.map((q, qi) => {
        const picked = answers[qi];
        const isEditing = editIdx === qi;
        return (
          <div key={qi} className="rounded-3xl glass p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              {isEditing ? (
                <input value={q.question} onChange={(e) => updateQ(qi, { question: e.target.value })} className="flex-1 bg-transparent border-b border-input text-sm font-medium" />
              ) : (
                <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
              )}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditIdx(isEditing ? null : qi)} className="text-xs rounded-full border border-border bg-card px-2 py-0.5 inline-flex items-center gap-1">
                  {isEditing ? <><Save className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /></>}
                </button>
                {isEditing && <button onClick={() => delQ(qi)} className="text-xs text-destructive"><Trash2 className="h-3 w-3" /></button>}
              </div>
            </div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = submitted && oi === q.answer_index;
                const isWrong = submitted && isPicked && oi !== q.answer_index;
                if (isEditing) {
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" checked={q.answer_index === oi} onChange={() => updateQ(qi, { answer_index: oi })} />
                      <input value={opt} onChange={(e) => updateQ(qi, { options: q.options.map((o, i) => i === oi ? e.target.value : o) })} className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </div>
                  );
                }
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
            {isEditing && (
              <textarea value={q.explanation} onChange={(e) => updateQ(qi, { explanation: e.target.value })} rows={2} placeholder="Explanation" className="mt-2 w-full rounded-lg border border-input bg-background p-2 text-xs" />
            )}
            {!isEditing && submitted && q.explanation && (
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
            <button onClick={() => { setAnswers({}); setSubmitted(false); }} className="rounded-full border border-border bg-card px-4 py-1.5 text-xs">
              <RotateCcw className="inline h-3 w-3 mr-1" /> Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
