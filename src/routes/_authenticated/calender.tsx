import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useT } from "@/lib/store";
import { listAssignments } from "@/lib/assignments.functions";

export const Route = createFileRoute("/_authenticated/calender")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Focusly" }] }),
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const t = useT();
  const listFn = useServerFn(listAssignments);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [cursor, setCursor] = useState(() => new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => { listFn().then((r: any) => setAssignments(r.assignments ?? [])).catch(() => setAssignments([])); }, []);

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    assignments.forEach((a) => {
      if (!a.due) return;
      const d = new Date(a.due);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = String(d.getDate());
        (map[k] ||= []).push(a);
      }
    });
    return map;
  }, [assignments, year, month]);

  const cells: Array<{ day?: number }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });

  const monthName = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 rise-in">
      <PageHeader
        eyebrow="The month ahead"
        icon={CalendarDays}
        title={t("calender")}
        description="Every deadline plotted so nothing arrives by surprise."
        actions={
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-full border border-border/70 p-2 transition-colors hover:bg-accent/40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[170px] text-center font-display text-sm font-semibold">{monthName}</span>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-full border border-border/70 p-2 transition-colors hover:bg-accent/40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="paper p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground mb-2">
          {DAYS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((c, i) => {
              const items = c.day ? byDay[String(c.day)] || [] : [];
              const today = new Date();
              const isToday = c.day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === c.day;
              return (
                <div key={i} className={`min-h-[88px] rounded-xl border border-border/60 p-2 text-left ${isToday ? "ring-2 ring-primary/50" : ""}`}>
                  {c.day && (
                    <>
                      <div className="text-[11px] font-medium text-muted-foreground">{c.day}</div>
                      <div className="mt-1 space-y-1">
                        {items.slice(0, 3).map((a) => (
                          <Link key={a.id} to="/assignments/$id" params={{ id: a.id }} className="block truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/20">
                            {a.title}
                          </Link>
                        ))}
                        {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
