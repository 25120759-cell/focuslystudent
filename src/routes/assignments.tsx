import { createFileRoute } from "@tanstack/react-router";
import { useStore, useT } from "@/lib/store";
import { FileText, Check, AlertTriangle } from "lucide-react";

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
  const t = useT();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{t("assignments")}</h1>
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
            <p className="text-sm text-foreground/80 leading-relaxed">{a.description}</p>
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
