import { RouteError, SkeletonList, EmptyState, ErrorState } from "@/components/app/States";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { parseTask } from "@/lib/ai.functions";
import { createAssignment, deleteAssignment, listAssignments, updateAssignment } from "@/lib/assignments.functions";
import { FileText, Check, AlertTriangle, Sparkles, Plus, Trash2, ClipboardList, ChevronRight, Folder, FolderOpen, PartyPopper } from "lucide-react";
import { celebrate } from "@/components/app/Celebration";

import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/assignments")({
  errorComponent: RouteError,
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
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [nlInput, setNlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);


  async function load() {
    setLoadErr(null);
    const r: any = await listFn();
    setAssignments(r.assignments ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    if (path !== "/assignments") return;
    load().catch((e) => { setLoadErr(e?.message ?? "Failed to load"); setLoaded(true); });
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

  const openList = assignments.filter((a) => a.status !== "Completed");
  const doneList = assignments.filter((a) => a.status === "Completed");

  async function complete(id: string) {
    celebrate("assignment");
    await updateFn({ data: { id, patch: { status: "Completed" } } });
    await load();
  }
  async function markLate(id: string) {
    await updateFn({ data: { id, patch: { status: id && doneList.some((d) => d.id === id) ? "Opened" : "Late" } } });
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this assignment?")) return;
    await deleteFn({ data: { id } });
    await load();
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
        <AnimatePresence initial={false}>
          {openList.map((a) => (
            <AssignmentCard key={a.id} a={a} t={t} onComplete={complete} onLate={markLate} onDelete={remove} />
          ))}
        </AnimatePresence>

        {doneList.length > 0 && (
          <div className="rounded-2xl border border-border bg-muted/30">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <motion.span animate={{ rotate: showDone ? 90 : 0 }} className="inline-flex">
                <ChevronRight className="h-4 w-4" />
              </motion.span>
              {showDone ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              Completed ({doneList.length})
            </button>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid gap-4 px-4 pb-4">
                    {doneList.map((a) => (
                      <AssignmentCard key={a.id} a={a} t={t} onComplete={complete} onLate={markLate} onDelete={remove} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!loaded && <SkeletonList rows={3} lines={2} />}
        {loaded && loadErr && (
          <ErrorState
            title="We couldn't load your assignments"
            message={loadErr}
            onRetry={() => { setLoaded(false); load().catch((e) => { setLoadErr(e?.message ?? "Failed to load"); setLoaded(true); }); }}
          />
        )}
        {loaded && !loadErr && assignments.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="Nothing due — yet"
            description="Type something like “Read Hatchet ch 8 by Tuesday 9pm” in the quick add box and Focusly will schedule it for you."
          />
        )}
        {loaded && !loadErr && assignments.length > 0 && openList.length === 0 && (
          <EmptyState
            icon={PartyPopper}
            title="All caught up 🎉"
            description="Every assignment is complete. Open the Completed folder to review your wins."
          />
        )}
      </div>
    </div>
  );
}

function AssignmentCard({
  a,
  t,
  onComplete,
  onLate,
  onDelete,
}: {
  a: any;
  t: (k: any) => string;
  onComplete: (id: string) => void;
  onLate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="paper-raised p-6 group"
    >
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <Link to="/assignments/$id" params={{ id: a.id }} className="flex-1 block min-w-[200px]">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${a.status === "Completed" ? "bg-tt-break" : a.status === "Late" ? "bg-destructive text-destructive-foreground" : "bg-tt-peach"}`}>
            {a.status}
          </span>
          <h2 className={`font-display text-xl font-semibold mt-2 hover:underline ${a.status === "Completed" ? "text-muted-foreground line-through" : ""}`}>{a.title}</h2>
          {a.due && <p className="text-xs text-muted-foreground mt-1">{t("dueDate")}: {new Date(a.due).toLocaleString()}</p>}
        </Link>
        <div className="flex gap-2 opacity-80 group-hover:opacity-100">
          {a.status !== "Completed" && (
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => onComplete(a.id)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Check className="h-3 w-3" /> {t("markComplete")}
            </motion.button>
          )}
          {a.status !== "Late" && a.status !== "Completed" && (
            <button onClick={() => onLate(a.id)} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <AlertTriangle className="h-3 w-3" /> {t("markLate")}
            </button>
          )}
          {a.status === "Completed" && (
            <button onClick={() => onLate(a.id)} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Reopen
            </button>
          )}
          <button onClick={() => onDelete(a.id)} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground" title="Delete">
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
  );
}

