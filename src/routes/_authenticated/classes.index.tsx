import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Plus, Bell, ArrowRight, DoorOpen } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app/PageHeader";
import { AsyncSection, EmptyState, RouteError, SkeletonGrid } from "@/components/app/States";
import { listMyClasses, joinClass, classNotifications } from "@/lib/classroom.functions";

export const Route = createFileRoute("/_authenticated/classes/")({
  errorComponent: RouteError,
  component: ClassesPage,
  head: () => ({
    meta: [
      { title: "Classes — Focusly" },
      { name: "description", content: "Join your teacher's classes, read the stream, and track classwork and grades." },
      { property: "og:title", content: "Classes — Focusly" },
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
    <div className="space-y-8 rise-in">
      <PageHeader
        eyebrow="Focusly Teacher"
        icon={GraduationCap}
        title="Your"
        accent="Classes"
        description="Everything your teachers post — announcements, classwork, and returned grades — lands here."
      />

      <form onSubmit={join} className="paper-raised flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="join-code" className="eyebrow">
            Class code
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7KQ2XM"
            className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 font-mono text-sm tracking-[0.2em] outline-none focus:border-primary"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={joining}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {joining ? "Joining…" : "Join class"}
        </motion.button>
        <AnimatePresence>
          {(joinError || joined) && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`w-full text-sm ${joinError ? "text-destructive" : "text-primary"}`}
            >
              {joinError ?? joined}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {notifs.length > 0 && (
        <section className="paper p-5">
          <div className="eyebrow flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" /> This week
          </div>
          <ul className="mt-3 space-y-2">
            {notifs.slice(0, 6).map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 text-sm"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <span className="font-medium">{n.title}</span>{" "}
                  <span className="text-muted-foreground">· {n.classroom_title}</span>
                  <span className="block truncate text-muted-foreground">{n.body}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

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
            description="Ask your teacher for the class code from Focusly Teacher, then enter it above to join."
          />
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={{ y: -3 }}
            >
              <Link to="/classes/$id" params={{ id: c.id }} className="paper-raised block overflow-hidden">
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
  );
}
