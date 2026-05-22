import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { breakdownToddleSubject } from "@/lib/ai.functions";
import { ChevronLeft, Sparkles } from "lucide-react";

export function ToddleView() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const { toddle } = state;
  const active = toddle.activeSubject;
  const breakdownFn = useServerFn(breakdownToddleSubject);
  const [analysing, setAnalysing] = useState(false);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);

  if (!toddle.linked) {
    return (
      <div className="rounded-3xl glass p-12 text-center">
        <p className="font-display text-2xl mb-4">Link your Toddle account</p>
        <p className="text-sm text-muted-foreground mb-6">We'll crawl your subjects and assignments so you can plan ahead.</p>
        <button
          onClick={() => dispatch({ type: "TOGGLE_TODDLE" })}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Link to Toddle
        </button>
      </div>
    );
  }

  if (active) {
    const subj = toddle.subjects.find((s) => s.id === active);
    const tasks = toddle.extractedTasks[active] ?? [];

    async function analyse() {
      if (!user) { setAnalysisErr("Sign in to analyse."); return; }
      if (!subj) return;
      setAnalysing(true);
      setAnalysisErr(null);
      try {
        const r: any = await breakdownFn({
          data: { subject: subj.name, tasks: tasks.slice(0, 10) },
        });
        if (r?.title && r?.steps) {
          dispatch({
            type: "ADD_ACTION_PLAN",
            plan: { id: `plan-${Date.now()}`, title: r.title, steps: r.steps },
          });
        }
      } catch (e: any) {
        setAnalysisErr(e.message || "Failed");
      } finally {
        setAnalysing(false);
      }
    }

    return (
      <div className="rounded-3xl glass p-6">
        <button
          onClick={() => dispatch({ type: "SET_ACTIVE_SUBJECT", id: null })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-2xl">{subj?.name}</h3>
          <button
            onClick={analyse}
            disabled={analysing || tasks.length === 0}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" /> {analysing ? "Analysing…" : "Analyse from Toddle"}
          </button>
        </div>
        {analysisErr && <p className="text-xs text-destructive mb-2">{analysisErr}</p>}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No assignments crawled for this subject yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative">
            {tasks.map((t, i) => (
              <div
                key={i}
                className={`p-5 ${i === 0 ? "md:border-r-2 md:border-foreground/80" : ""}`}
              >
                <h4 className="font-display text-lg font-semibold mb-2">{t.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                <div className="space-y-1 text-xs">
                  <div><span className="font-semibold">Due:</span> {t.due}</div>
                  <div><span className="font-semibold">Group:</span> {t.group}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl glass p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {toddle.subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => dispatch({ type: "SET_ACTIVE_SUBJECT", id: s.id })}
            className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary hover:shadow-md transition"
          >
            <div className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground mb-2">
              {s.name.split(":")[0]}
            </div>
            <div className="font-medium text-sm leading-snug">{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
