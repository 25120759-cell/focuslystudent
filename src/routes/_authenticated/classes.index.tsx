import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Plus, Bell, ArrowRight, DoorOpen } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AsyncSection, EmptyState, RouteError, SkeletonGrid } from "@/components/app/States";
import { listMyClasses, joinClass, classNotifications } from "@/lib/classroom.functions";

export const Route = createFileRoute("/_authenticated/classes/")({
  errorComponent: RouteError,
  component: ClassesPage,
  head: () => ({
    meta: [
      { title: "Classes — Cogni" },
      { name: "description", content: "Join your teacher's classes, read the stream, and track classwork and grades." },
      { property: "og:title", content: "Classes — Cogni" },
      { property: "og:description", content: "Join your teacher's classes, read the stream, and track classwork and grades." },
    ],
  }),
});

type ClassRow = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  banner_color: string;
  join_code: string;
  room: string;
  period: string;
  teacher_name: string;
};

function ClassesPage() {
  const listFn = useServerFn(listMyClasses);
  const joinFn = useServerFn(joinClass);
  const notifFn = useServerFn(classNotifications);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await listFn();
      setClasses((r.classes ?? []) as ClassRow[]);
      notifFn({ data: {} })
        .then((n) => setNotifs(n.notifications ?? []))
        .catch(() => {});
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || joining) return;
    setJoining(true);
    setJoinError(null);
    setJoined(null);
    try {
      await joinFn({ data: { join_code: code.trim() } });
      setJoined("You're in — welcome to the class.");
      setCode("");
      await load();
    } catch (err: any) {
      setJoinError(err?.message ?? "That code didn't work.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="workspace mx-auto max-w-6xl space-y-10 rise-in">
      <header className="workspace-overview">
        <div>
          <p className="workspace-kicker mb-3">Connected to Cogni Teacher</p>
          <h1 className="workspace-heading font-display">Your classes.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Announcements, classwork and returned grades from your teachers, in one calm place.</p>
        </div>
        <form onSubmit={join} className="w-full max-w-sm space-y-2">
          <label htmlFor="join-code" className="workspace-kicker">Join with a class code</label>
          <div className="flex gap-2">
            <input
              id="join-code"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="7KQ2XM"
              className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-base tracking-[0.3em] outline-none focus:border-primary"
            />
            <motion.button whileTap={{ scale: 0.96 }} disabled={joining || code.length !== 6} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <Plus className="h-4 w-4" /> {joining ? "Joining…" : "Join"}
            </motion.button>
          </div>
          <AnimatePresence>
            {(joinError || joined) && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`text-sm ${joinError ? "text-destructive" : "text-primary"}`}>
                {joinError ?? joined}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="order-2 lg:order-1">
      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={classes.length === 0}
        onRetry={load}
        skeleton={<SkeletonGrid items={4} lines={2} />}
        empty={
          <EmptyState
            icon={DoorOpen}
            title="No classes yet"
            description="Ask your teacher for the class code from Cogni Teacher, then enter it above to join."
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={{ y: -3 }}
            >
              <Link to="/classes/$id" params={{ id: c.id }} className="workspace-surface block overflow-hidden transition-shadow hover:shadow-lg">
                <div className="h-2 w-full" style={{ background: c.banner_color || "var(--primary)" }} />
                <div className="p-5">
                  <h2 className="font-display text-xl font-semibold tracking-tight">{c.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[c.subject, c.grade_level].filter(Boolean).join(" · ") || "Class"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.teacher_name}
                    {c.room ? ` · Room ${c.room}` : ""}
                    {c.period ? ` · ${c.period}` : ""}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Open class <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </AsyncSection>
      </div>
      <aside className="order-1 lg:order-2">
        <p className="workspace-kicker mb-3 flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> This week</p>
        {notifs.length === 0 ? <p className="text-sm text-muted-foreground">Nothing new from your teachers.</p> : (
          <ul className="divide-y divide-border">
            {notifs.slice(0, 6).map((n) => (
              <li key={n.id} className="py-3 text-sm">
                <span className="font-medium">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.classroom_title}</span>
                <span className="mt-1 block line-clamp-2 text-muted-foreground">{n.body}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
      </div>
    </div>
  );
}
