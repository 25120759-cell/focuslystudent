import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createClass, deleteClass, listClasses, updateClass } from "@/lib/timetable.functions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COLORS = {
  blue: "bg-tt-blue", teal: "bg-tt-teal", purple: "bg-tt-purple", peach: "bg-tt-peach",
  rose: "bg-rose-200 dark:bg-rose-900/40", amber: "bg-amber-200 dark:bg-amber-900/40",
  emerald: "bg-emerald-200 dark:bg-emerald-900/40", indigo: "bg-indigo-200 dark:bg-indigo-900/40",
  slate: "bg-slate-200 dark:bg-slate-800",
};
const COLOR_KEYS = Object.keys(COLORS) as (keyof typeof COLORS)[];

interface ClassRow {
  id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  title: string;
  room: string;
  teacher: string;
  color: keyof typeof COLORS;
}

const HOUR_START = 7; // visible window
const HOUR_END = 19;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const PX_PER_MIN = 0.9; // height scale

function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60); const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function hhmmToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0);
}

export function Timetable() {
  const listFn = useServerFn(listClasses);
  const createFn = useServerFn(createClass);
  const updateFn = useServerFn(updateClass);
  const deleteFn = useServerFn(deleteClass);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<ClassRow> | null>(null);

  async function load() {
    try { const r: any = await listFn(); setClasses(r.classes as ClassRow[]); }
    catch (e) { console.error(e); }
    finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  async function save(patch: Partial<ClassRow>) {
    if (!editing) return;
    const data = { ...editing, ...patch } as ClassRow;
    try {
      if (editing.id) {
        await updateFn({ data: { id: editing.id, patch: {
          day_of_week: data.day_of_week, start_minute: data.start_minute, end_minute: data.end_minute,
          title: data.title, room: data.room, teacher: data.teacher, color: data.color,
        } as any } });
      } else {
        await createFn({ data: {
          day_of_week: data.day_of_week ?? 0,
          start_minute: data.start_minute ?? 9 * 60,
          end_minute: data.end_minute ?? 10 * 60,
          title: data.title ?? "New class",
          room: data.room ?? "", teacher: data.teacher ?? "", color: (data.color ?? "blue") as any,
        } as any });
      }
      setEditing(null);
      load();
    } catch (e: any) { alert(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this class?")) return;
    await deleteFn({ data: { id } });
    setEditing(null);
    setClasses((c) => c.filter((x) => x.id !== id));
  }

  if (!loaded) return <div className="paper-raised p-16 text-center text-sm text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading timetable…</div>;

  return (
    <div className="paper-raised p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Weekly timetable</h3>
        <button
          onClick={() => setEditing({ day_of_week: 0, start_minute: 9 * 60, end_minute: 10 * 60, title: "", color: "blue" })}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Add class
        </button>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `48px repeat(${DAYS.length}, minmax(0, 1fr))` }}>
        <div />
        {DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase">{d}</div>)}
        <div className="relative" style={{ height: (HOUR_END - HOUR_START + 1) * 60 * PX_PER_MIN }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute right-1 text-[10px] text-muted-foreground" style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN - 6 }}>{h}:00</div>
          ))}
        </div>
        {DAYS.map((_, dayIdx) => (
          <div key={dayIdx} className="relative border-l border-border/40" style={{ height: (HOUR_END - HOUR_START + 1) * 60 * PX_PER_MIN }}>
            {HOURS.map((h) => (
              <div key={h} className="absolute left-0 right-0 border-t border-border/30" style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN }} />
            ))}
            <AnimatePresence>
              {classes.filter((c) => c.day_of_week === dayIdx).map((c) => {
                const top = (c.start_minute - HOUR_START * 60) * PX_PER_MIN;
                const height = Math.max(28, (c.end_minute - c.start_minute) * PX_PER_MIN);
                return (
                  <motion.button
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setEditing(c)}
                    className={`absolute inset-x-0.5 ${COLORS[c.color]} rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight overflow-hidden border border-black/5 hover:ring-2 hover:ring-primary/50`}
                    style={{ top, height }}
                  >
                    <div className="font-semibold truncate">{c.title}</div>
                    <div className="opacity-70 text-[10px]">{minutesToHHMM(c.start_minute)}–{minutesToHHMM(c.end_minute)}</div>
                    {c.room && <div className="opacity-70 text-[10px] truncate">@{c.room}</div>}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">No classes yet. Click <strong>Add class</strong> to build your week.</p>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-display text-lg font-semibold">{editing.id ? "Edit class" : "New class"}</h4>
                <button onClick={() => setEditing(null)} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Class title">
                  <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Room">
                    <input value={editing.room ?? ""} onChange={(e) => setEditing({ ...editing, room: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Teacher">
                    <input value={editing.teacher ?? ""} onChange={(e) => setEditing({ ...editing, teacher: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                </div>
                <Field label="Day">
                  <select value={editing.day_of_week ?? 0} onChange={(e) => setEditing({ ...editing, day_of_week: Number(e.target.value) })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <input type="time" value={minutesToHHMM(editing.start_minute ?? 540)} onChange={(e) => setEditing({ ...editing, start_minute: hhmmToMinutes(e.target.value) })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Field label="End">
                    <input type="time" value={minutesToHHMM(editing.end_minute ?? 600)} onChange={(e) => setEditing({ ...editing, end_minute: hhmmToMinutes(e.target.value) })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                </div>
                <Field label="Color">
                  <div className="flex flex-wrap gap-2">
                    {COLOR_KEYS.map((k) => (
                      <button key={k} onClick={() => setEditing({ ...editing, color: k })}
                        className={`h-7 w-7 rounded-full ${COLORS[k]} ring-2 ${editing.color === k ? "ring-primary" : "ring-transparent"}`} />
                    ))}
                  </div>
                </Field>
              </div>
              <div className="mt-5 flex items-center justify-between">
                {editing.id ? (
                  <button onClick={() => remove(editing.id!)} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="rounded-full border border-border bg-card px-4 py-2 text-sm">Cancel</button>
                  <button onClick={() => save({})} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="block text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
