import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Save, X, Check, Plus, Calendar, Sparkles, Loader2, RefreshCw, Pencil, Crown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteAssignment, getAssignment, updateAssignment } from "@/lib/assignments.functions";
import { aiBreakdownAssignment, aiCredits, saveArtifact } from "@/lib/ai.functions";
import { saveLocal, getLocal, markClean } from "@/lib/ai-cache";



interface AssignmentDetailRow {
  id: string;
  title: string;
  due: string | null;
  status: "Opened" | "Completed" | "Late";
  description: string;
  resources: { name: string; link: string }[];
  subtasks: { id: string; title: string; done: boolean }[];
  priority?: "low" | "medium" | "high";
  tags?: string[];
  notes?: string;
}

export const Route = createFileRoute("/_authenticated/assignments/$id")({
  component: AssignmentDetail,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="font-display text-2xl">Assignment not found</h1>
      <Link to="/assignments" className="mt-4 inline-block text-primary underline">← Back</Link>
    </div>
  ),
});

type Breakdown = {
  subtasks: { title: string; estimated_minutes: number }[];
  total_minutes: number;
  study_plan: { day_offset: number; start_hour: number; duration_minutes: number; focus: string }[];
  tips: string[];
};

function AssignmentDetail() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getAssignment);
  const updateFn = useServerFn(updateAssignment);
  const deleteFn = useServerFn(deleteAssignment);
  const breakdownFn = useServerFn(aiBreakdownAssignment);
  const creditsFn = useServerFn(aiCredits);
  const saveArtFn = useServerFn(saveArtifact);
  const navigate = useNavigate();
  const [a, setA] = useState<AssignmentDetailRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<AssignmentDetailRow | null>(null);
  const [newSub, setNewSub] = useState("");
  const [aiLoading, setAiLoading] = useState<null | "all" | "subtasks" | "schedule" | "tips">(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [instruction, setInstruction] = useState("");
  const [creds, setCreds] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<null | "subtasks" | "tips">(null);



  async function load() {
    setLoaded(false);
    setErr(null);
    try {
      const r: any = await getFn({ data: { id } });
      setA(r.assignment ? { ...r.assignment, subtasks: r.assignment.subtasks ?? [], resources: r.assignment.resources ?? [] } : null);
      const cached = await getLocal(`breakdown:${id}`);
      if (cached?.payload?.breakdown) setBreakdown(cached.payload.breakdown);
    } catch (e: any) {
      setErr(e.message || "Failed to load assignment");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); creditsFn().then(setCreds).catch(() => {}); }, [id]);



  if (!loaded) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!a) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl">Assignment not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{err || "It may have been deleted, or the link is from a different account."}</p>
        <Link to="/assignments" className="mt-4 inline-block text-primary underline">← Back to assignments</Link>
      </div>
    );
  }

  const assignment = a;
  const current = edit ? draft! : assignment;
  const subtasks = assignment.subtasks ?? [];

  async function save() {
    if (!draft) return;
    const r: any = await updateFn({ data: { id: assignment.id, patch: draft } });
    setA({ ...r.assignment, subtasks: r.assignment.subtasks ?? [], resources: r.assignment.resources ?? [] });
    setEdit(false);
  }

  async function saveSubtasks(next: AssignmentDetailRow["subtasks"]) {
    const r: any = await updateFn({ data: { id: assignment.id, patch: { subtasks: next } } });
    setA({ ...r.assignment, subtasks: r.assignment.subtasks ?? [], resources: r.assignment.resources ?? [] });
  }

  async function addSub() {
    if (!newSub.trim()) return;
    const sub = { id: `s-${Date.now()}`, title: newSub.trim(), done: false };
    const next = [...subtasks, sub];
    await saveSubtasks(next);
    setNewSub("");
  }
  async function toggleSub(sid: string) {
    const next = subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s));
    await saveSubtasks(next);
  }
  async function delSub(sid: string) {
    await saveSubtasks(subtasks.filter((s) => s.id !== sid));
  }

  async function runBreakdown() {
    setAiErr(null);
    setAiLoading(true);
    try {
      const r: any = await breakdownFn({ data: { title: assignment.title, description: assignment.description || "", due: assignment.due } });
      setBreakdown(r);
    } catch (e: any) {
      setAiErr(e.message || "AI breakdown failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function applyBreakdownSubtasks() {
    if (!breakdown) return;
    const additions = breakdown.subtasks.map((s, i) => ({
      id: `ai-${Date.now()}-${i}`,
      title: s.estimated_minutes ? `${s.title} (~${s.estimated_minutes}m)` : s.title,
      done: false,
    }));
    await saveSubtasks([...subtasks, ...additions]);
  }


  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/assignments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-2">
          {!edit ? (
            <>
              <button onClick={() => { setDraft(assignment); setEdit(true); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={async () => { if (confirm("Delete this assignment?")) { await deleteFn({ data: { id: assignment.id } }); navigate({ to: "/assignments" }); } }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={save} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                <Save className="h-3 w-3" /> Save
              </button>
              <button onClick={() => setEdit(false)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <X className="h-3 w-3" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl glass p-6 space-y-4">
        {edit ? (
          <>
            <input
              value={draft!.title}
              onChange={(e) => setDraft({ ...draft!, title: e.target.value })}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 font-display text-2xl font-semibold"
            />
            <div className="flex flex-wrap gap-3">
              <label className="text-xs">
                <span className="block text-muted-foreground mb-1">Due</span>
                <input
                  type="datetime-local"
                  value={draft!.due ? new Date(draft!.due).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setDraft({ ...draft!, due: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="block text-muted-foreground mb-1">Status</span>
                <select
                  value={draft!.status}
                  onChange={(e) => setDraft({ ...draft!, status: e.target.value as AssignmentDetailRow["status"] })}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option>Opened</option><option>Completed</option><option>Late</option>
                </select>
              </label>
            </div>
            <textarea
              value={draft!.description}
              onChange={(e) => setDraft({ ...draft!, description: e.target.value })}
              rows={6}
              placeholder="Description / notes"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </>
        ) : (
          <>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${current.status === "Completed" ? "bg-tt-break" : current.status === "Late" ? "bg-destructive text-destructive-foreground" : "bg-tt-peach"}`}>
              {current.status}
            </span>
            <h1 className="font-display text-3xl font-semibold">{current.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {current.due ? `Due ${new Date(current.due).toLocaleString()}` : "No due date"}
            </p>
            {current.description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{current.description}</p>}
          </>
        )}
      </div>

      <div className="rounded-3xl glass p-6">
        <h2 className="font-display text-lg font-semibold mb-3">Subtasks</h2>
        <div className="space-y-2">
          {subtasks.map((s) => (
            <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              <button onClick={() => toggleSub(s.id)} className={`flex h-5 w-5 items-center justify-center rounded-md border ${s.done ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                {s.done && <Check className="h-3 w-3" />}
              </button>
              <span className={`flex-1 text-sm ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
              <button onClick={() => delSub(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </motion.div>
          ))}
          {subtasks.length === 0 && <p className="text-xs text-muted-foreground">No subtasks yet.</p>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSub()}
            placeholder="Add a subtask"
            className="flex-1 rounded-full border border-input bg-background px-4 py-1.5 text-sm"
          />
          <button onClick={addSub} className="rounded-full bg-primary p-1.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Breakdown
          </h2>
          <button
            onClick={runBreakdown}
            disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {breakdown ? "Regenerate" : "Generate plan"}
          </button>
        </div>
        {aiErr && <p className="text-xs text-destructive mb-2">{aiErr}</p>}
        {!breakdown && !aiLoading && (
          <p className="text-xs text-muted-foreground">Let AI split this assignment into subtasks with time estimates and a study schedule.</p>
        )}
        <AnimatePresence>
          {breakdown && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Suggested subtasks {breakdown.total_minutes ? <span className="text-muted-foreground font-normal">· ~{breakdown.total_minutes} min total</span> : null}</h3>
                  <button onClick={applyBreakdownSubtasks} className="text-xs text-primary hover:underline">Add all to subtasks</button>
                </div>
                <ul className="space-y-1">
                  {breakdown.subtasks.map((s, i) => (
                    <li key={i} className="text-sm rounded-lg bg-card border border-border px-3 py-2 flex justify-between gap-2">
                      <span>{s.title}</span>
                      {s.estimated_minutes ? <span className="text-xs text-muted-foreground">{s.estimated_minutes}m</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
              {breakdown.study_plan.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Study schedule</h3>
                  <ul className="space-y-1 text-xs">
                    {breakdown.study_plan.map((p, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + (p.day_offset || 0));
                      const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                      const h = String(p.start_hour).padStart(2, "0");
                      return (
                        <li key={i} className="rounded-lg bg-card border border-border px-3 py-2">
                          <span className="font-medium">{label} · {h}:00</span> · {p.duration_minutes}m — {p.focus}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {breakdown.tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Tips</h3>
                  <ul className="space-y-1 text-xs list-disc list-inside text-foreground/80">
                    {breakdown.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {current.resources.length > 0 && (
        <div className="rounded-3xl glass p-6">
          <h2 className="font-display text-lg font-semibold mb-3">Resources</h2>
          <div className="flex flex-wrap gap-2">
            {current.resources.map((r) => (
              <a key={r.name} href={r.link} className="rounded-full bg-accent px-3 py-1 text-xs hover:bg-accent/80">{r.name}</a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
