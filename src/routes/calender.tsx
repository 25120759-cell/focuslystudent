import { createFileRoute } from "@tanstack/react-router";
import { useStore, useT } from "@/lib/store";

export const Route = createFileRoute("/calender")({
  ssr: false,
  component: CalenderPage,
  head: () => ({
    meta: [
      { title: "Calender — Focusly" },
      { name: "description", content: "Calendar grid showing weeks as columns and days as rows." },
    ],
  }),
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

function CalenderPage() {
  const { state } = useStore();
  const t = useT();

  // Map each assignment to a Week × Day cell based on the due date.
  const cells: Record<string, { title: string; status: string }[]> = {};
  for (const a of state.assignments) {
    const d = new Date(a.due);
    if (isNaN(d.getTime())) continue;
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0
    const weekIdx = Math.min(4, Math.floor((d.getDate() - 1) / 7));
    const key = `${weekIdx}-${dayIdx}`;
    (cells[key] = cells[key] ?? []).push({ title: a.title, status: a.status });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{t("calender")}</h1>
      <p className="text-sm text-muted-foreground">View: {t(state.settings.calendarView)}</p>
      <div className="rounded-3xl glass p-4 overflow-x-auto">
        <div className="grid grid-cols-[100px_repeat(5,minmax(140px,1fr))] gap-2">
          <div />
          {WEEKS.map((w) => (
            <div key={w} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">{w}</div>
          ))}
          {DAYS.map((day, dIdx) => (
            <>
              <div key={day} className="flex items-center justify-end text-xs font-semibold text-muted-foreground pr-2">{day}</div>
              {WEEKS.map((_, wIdx) => {
                const items = cells[`${wIdx}-${dIdx}`] ?? [];
                return (
                  <div key={`${dIdx}-${wIdx}`} className="rounded-xl border border-border bg-card/50 min-h-[80px] p-2 space-y-1">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className={`text-[10px] rounded-md px-1.5 py-1 ${
                          it.status === "Completed" ? "bg-tt-break" : it.status === "Late" ? "bg-destructive/20" : "bg-tt-blue"
                        }`}
                      >
                        {it.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
