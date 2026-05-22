import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore, useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { parseTask } from "@/lib/ai.functions";
import { FileText, Check, AlertTriangle, Sparkles, Plus } from "lucide-react";

export const Route = createFileRoute("/assignments")({
  ssr: false,
  component: AssignmentsPage,
  head: () => ({
    meta: [
      { title: "Assignments — Focusly" },
      { name: "description", content: "Track your assignments, due dates, instructions and resources." },
    ],
  }),
});

function AssignmentsPage() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const t = useT();
  const parseFn = useServerFn(parseTask);
  const [nlInput, setNlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);

  async function quickAdd() {
    if (!nlInput.trim()) return;
    setParseErr(null);
    if (!user) {
      // local fallback — just add a stub
      dispatch({
        type: "ADD_ASSIGNMENT",
        assignment: {
          id: `a-${Date.now()}`,
          title: nlInput,
          description: "",
          due: new Date(Date.now() + 86400000).toISOString(),
          status: "Opened",
          resources: [],
        },
      });
      setNlInput("");
      return;
    }
    setParsing(true);
    try {
      const r: any = await parseFn({ data: { text: nlInput } });
      dispatch({
        type: "ADD_ASSIGNMENT",
        assignment: {
          id: `a-${Date.now()}`,
          title: r.title || nlInput,
          description: r.description || "",
          due: r.due || new Date(Date.now() + 86400000).toISOString(),
          status: "Opened",
          resources: [],
        },
      });
      setNlInput("");
    } catch (e: any) {
      setParseErr(e.message || "Failed to parse");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{t("assignments")}</h1>

      <div className="rounded-3xl glass p-4">
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
          <button
            onClick={quickAdd}
            disabled={parsing || !nlInput.trim()}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> {parsing ? "Parsing…" : "Add"}
          </button>
        </div>
        {parseErr && <p className="mt-2 text-xs text-destructive">{parseErr}</p>}
      </div>

      <div className="grid gap-4">
        {state.assignments.map((a) => (
          <article key={a.id} className="rounded-3xl glass p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    a.status === "Completed"
                      ? "bg-tt-break"
                      : a.status === "Late"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-tt-peach"
                  }`}
                >
                  {a.status}
                </span>
                <h2 className="font-display text-xl font-semibold mt-2">{a.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dueDate")}: {new Date(a.due).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => dispatch({ type: "COMPLETE_ASSIGNMENT", id: a.id })}
                  className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-3 w-3" /> {t("markComplete")}
                </button>
                <button
                  onClick={() => dispatch({ type: "LATE_ASSIGNMENT", id: a.id })}
                  className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <AlertTriangle className="h-3 w-3" /> {t("markLate")}
                </button>
              </div>
            </div>
            {a.description && <p className="text-sm text-foreground/80 leading-relaxed">{a.description}</p>}
            {a.resources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {a.resources.map((r) => (
                  <a key={r.name} href={r.link} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs hover:bg-accent/80">
                    <FileText className="h-3 w-3" /> {r.name}
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
