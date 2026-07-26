import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { parseTask } from "@/lib/ai.functions";
import { createAssignment, deleteAssignment, listAssignments, updateAssignment } from "@/lib/assignments.functions";
import { FileText, Check, AlertTriangle, Sparkles, Plus, Trash2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/assignments")({
  component: AssignmentsPage,
  head: () => ({ meta: [{ title: "Assignments — Focusly" }] }),
});

function AssignmentsPage() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const t = useT();
  const listFn = useServerFn(listAssignments);
  const createFn = useServerFn(createAssignment);
  const updateFn = useServerFn(updateAssignment);
  const deleteFn = useServerFn(deleteAssignment);
  const parseFn = useServerFn(parseTask);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [nlInput, setNlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);

  async function load() {
    const r: any = await listFn();
    setAssignments(r.assignments ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    if (path !== "/assignments") return;
    load().catch((e) => { setParseErr(e.message); setLoaded(true); });
  }, [path]);

  if (path !== "/assignments") return <Outlet />;

  async function quickAdd() {
    if (!nlInput.trim()) return;
    setParseErr(null);
    if (!user) {
      setNlInput("");
      return;
    }
    setParsing(true);
    try {
      const r: any = await parseFn({ data: { text: nlInput } });
      await createFn({ data: { title: r.title || nlInput, description: r.description || "", due: r.due || new Date(Date.now() + 86400000).toISOString(), status: "Opened", resources: [] } });
      setNlInput("");
      await load();
    } catch (e: any) {
      setParseErr(e.message || "Failed to parse");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="space-y-6 rise-in">
      <PageHeader
        eyebrow="Your workload"
        icon={ClipboardList}
        title={t("assignments")}
        description="Everything due, in one calm list. Type a sentence and Focusly turns it into a scheduled task."
      />

      <div className="paper p-5">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Sparkles className="h-3 w-3 text-primary" /> Quick add — type naturally
        </label>
        <div className="flex items-center gap-2">
          <input
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAdd()}
            placeholder="e.g. Read Hatchet ch 8 by Tuesday 9pm"
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={quickAdd}
            disabled={parsing || !nlInput.trim()}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> {parsing ? "Parsing…" : "Add"}
          </motion.button>
        </div>
        {parseErr && <p className="mt-2 text-xs text-destructive">{parseErr}</p>}
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {assignments.map((a) => (
            <motion.article
              layout
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="rounded-3xl glass p-6 group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <Link to="/assignments/$id" params={{ id: a.id }} className="flex-1 block">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${a.status === "Completed" ? "bg-tt-break" : a.status === "Late" ? "bg-destructive text-destructive-foreground" : "bg-tt-peach"}`}>
                    {a.status}
                  </span>
                  <h2 className="font-display text-xl font-semibold mt-2 hover:underline">{a.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{t("dueDate")}: {new Date(a.due).toLocaleString()}</p>
                </Link>
                <div className="flex gap-2 opacity-80 group-hover:opacity-100">
                  <button onClick={async () => { await updateFn({ data: { id: a.id, patch: { status: "Completed" } } }); await load(); }} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                    <Check className="h-3 w-3" /> {t("markComplete")}
                  </button>
                  <button onClick={async () => { await updateFn({ data: { id: a.id, patch: { status: "Late" } } }); await load(); }} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
                    <AlertTriangle className="h-3 w-3" /> {t("markLate")}
                  </button>
                  <button onClick={async () => { if (confirm("Delete this assignment?")) { await deleteFn({ data: { id: a.id } }); await load(); } }} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {a.description && <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{a.description}</p>}
              {(a.resources ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(a.resources ?? []).map((r: any) => (
                    <a key={r.name} href={r.link} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs hover:bg-accent/80">
                      <FileText className="h-3 w-3" /> {r.name}
                    </a>
                  ))}
                </div>
              )}
            </motion.article>
          ))}
        </AnimatePresence>
        {!loaded && <div className="rounded-3xl glass p-12 text-center text-muted-foreground text-sm">Loading assignments…</div>}
        {loaded && assignments.length === 0 && (
          <div className="rounded-3xl glass p-12 text-center text-muted-foreground text-sm">
            No assignments yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}
