import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { CalendarClock, Megaphone, CheckCircle2 } from "lucide-react";
import { consoleSummary } from "@/lib/classroom.functions";

export function ClassSummary() {
  const fn = useServerFn(consoleSummary);
  const [data, setData] = useState<{ due: any[]; announcements: any[] } | null>(null);
  useEffect(() => {
    fn().then(setData).catch(() => setData({ due: [], announcements: [] }));
  }, []);
  if (!data) return <div className="paper h-28 animate-pulse" />;
  if (!data.due.length && !data.announcements.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-2">
      <div className="paper p-5">
        <div className="eyebrow flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Upcoming due dates</div>
        {data.due.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing due from your classes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.due.map((a) => (
              <li key={a.id}>
                <Link to="/classes/$id" params={{ id: a.classroom_id }} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/40">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.classroom_title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.submitted ? <CheckCircle2 className="h-4 w-4 text-primary" /> : new Date(a.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="paper p-5">
        <div className="eyebrow flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Latest announcements</div>
        {data.announcements.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.announcements.map((a) => (
              <li key={a.id}>
                <Link to="/classes/$id" params={{ id: a.classroom_id }} className="block rounded-lg px-2 py-1.5 hover:bg-accent/40">
                  <span className="block text-xs text-muted-foreground">{a.classroom_title}</span>
                  <span className="line-clamp-2 text-sm">{a.content}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
