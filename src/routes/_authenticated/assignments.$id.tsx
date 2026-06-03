import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Save, X, Check, Plus, Calendar } from "lucide-react";
import { useStore, type Assignment } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/assignments/$id")({
  component: AssignmentDetail,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="font-display text-2xl">Assignment not found</h1>
      <Link to="/assignments" className="mt-4 inline-block text-primary underline">← Back</Link>
    </div>
  ),
});

function AssignmentDetail() {
  const { id } = Route.useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const a = state.assignments.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Assignment | null>(a ?? null);
  const [newSub, setNewSub] = useState("");

  if (!a) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl">Assignment not found</h1>
        <Link to="/assignments" className="mt-4 inline-block text-primary underline">← Back to assignments</Link>
      </div>
    );
  }

  const current = edit ? draft! : a;
  const subtasks = (a as any).subtasks as Array<{ id: string; title: string; done: boolean }> | undefined ?? [];

  function save() {
    if (!draft) return;
    dispatch({ type: "UPDATE_ASSIGNMENT", id: a!.id, patch: draft });
    setEdit(false);
  }

  function addSub() {
    if (!newSub.trim()) return;
    const sub = { id: `s-${Date.now()}`, title: newSub.trim(), done: false };
    const next = [...subtasks, sub];
    dispatch({ type: "UPDATE_ASSIGNMENT", id: a!.id, patch: { subtasks: next } as any });
    setNewSub("");
  }
  function toggleSub(sid: string) {
    const next = subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s));
    dispatch({ type: "UPDATE_ASSIGNMENT", id: a!.id, patch: { subtasks: next } as any });
  }
  function delSub(sid: string) {
    dispatch({ type: "UPDATE_ASSIGNMENT", id: a!.id, patch: { subtasks: subtasks.filter((s) => s.id !== sid) } as any });
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
              <button onClick={() => { setDraft(a); setEdit(true); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => { if (confirm("Delete this assignment?")) { dispatch({ type: "DELETE_ASSIGNMENT", id: a.id }); navigate({ to: "/assignments" }); } }}
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
                  onChange={(e) => setDraft({ ...draft!, due: new Date(e.target.value).toISOString() })}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="block text-muted-foreground mb-1">Status</span>
                <select
                  value={draft!.status}
                  onChange={(e) => setDraft({ ...draft!, status: e.target.value as Assignment["status"] })}
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
              <Calendar className="h-3.5 w-3.5" /> Due {new Date(current.due).toLocaleString()}
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
