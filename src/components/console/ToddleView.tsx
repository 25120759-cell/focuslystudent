import { useStore } from "@/lib/store";
import { ChevronLeft } from "lucide-react";

export function ToddleView() {
  const { state, dispatch } = useStore();
  const { toddle } = state;
  const active = toddle.activeSubject;

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
    return (
      <div className="rounded-3xl glass p-6">
        <button
          onClick={() => dispatch({ type: "SET_ACTIVE_SUBJECT", id: null })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h3 className="font-display text-2xl mb-4">{subj?.name}</h3>
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
