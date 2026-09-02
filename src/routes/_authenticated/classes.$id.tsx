import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Pin,
  MessageSquare,
  Send,
  ClipboardList,
  GraduationCap,
  Megaphone,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { AsyncSection, EmptyState, ErrorState, RouteError, SkeletonList } from "@/components/app/States";
import { getClassroom, addAnnouncementComment, submitWork, unsubmitWork } from "@/lib/classroom.functions";
import { celebrate } from "@/components/app/Celebration";

export const Route = createFileRoute("/_authenticated/classes/$id")({
  errorComponent: RouteError,
  component: ClassDetail,
  head: () => ({
    meta: [
      { title: "Class — Focusly" },
      { name: "description", content: "Class stream, classwork, and grades from your teacher." },
      { property: "og:title", content: "Class — Focusly" },
      { property: "og:description", content: "Class stream, classwork, and grades from your teacher." },
    ],
  }),
});

type Tab = "stream" | "classwork" | "grades";

function ClassDetail() {
  const { id } = useParams({ from: "/_authenticated/classes/$id" });
  const getFn = useServerFn(getClassroom);
  const commentFn = useServerFn(addAnnouncementComment);
  const submitFn = useServerFn(submitWork);
  const unsubmitFn = useServerFn(unsubmitWork);

  const [tab, setTab] = useState<Tab>("stream");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getFn({ data: { classroom_id: id } }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const subByAssignment = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of data?.submissions ?? []) m.set(s.assignment_id, s);
    return m;
  }, [data]);

  if (loading) return <SkeletonList rows={4} lines={3} className="py-8" />;
  if (error) return <ErrorState error={error} onRetry={load} className="my-10" />;
  if (!data?.classroom)
    return (
      <div className="py-10">
        <EmptyState
          title="Class not found"
          description="You may have left this class, or the link is out of date."
          action={
            <Link to="/classes" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to classes
            </Link>
          }
        />
      </div>
    );

  const c = data.classroom;

  return (
    <div className="space-y-8 rise-in">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All classes
      </Link>

      <div className="paper-raised overflow-hidden">
        <div className="h-2 w-full" style={{ background: c.banner_color || "var(--primary)" }} />
        <div className="p-5">
          <PageHeader
            eyebrow={[c.subject, c.grade_level].filter(Boolean).join(" · ") || "Class"}
            icon={GraduationCap}
            title={c.title}
            description={`${c.teacher_name}${c.room ? ` · Room ${c.room}` : ""}${c.period ? ` · ${c.period}` : ""}${
              c.join_code ? ` · Code ${c.join_code}` : ""
            }`}
          />
        </div>
      </div>

      <div className="nav-pill inline-flex items-center gap-1 rounded-full p-1.5">
        {([
          ["stream", "Stream", Megaphone],
          ["classwork", "Classwork", ClipboardList],
          ["grades", "Grades", GraduationCap],
        ] as [Tab, string, any][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === key && (
              <motion.span layoutId="class-tab" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-primary" />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24 }}
          className="space-y-3"
        >
          {tab === "stream" && (
            <AsyncSection
              loading={false}
              isEmpty={(data.announcements ?? []).length === 0}
              empty={<EmptyState icon={Megaphone} title="Nothing posted yet" description="Announcements from your teacher will show up here." />}
            >
              {(data.announcements ?? []).map((a: any, i: number) => (
                <Announcement
                  key={a.id}
                  a={a}
                  index={i}
                  onComment={async (content) => {
                    const r = await commentFn({ data: { announcement_id: a.id, classroom_id: c.id, content } });
                    setData((d: any) => ({
                      ...d,
                      announcements: d.announcements.map((x: any) =>
                        x.id === a.id ? { ...x, comments: [...(x.comments ?? []), { ...r.comment, author_name: "You" }] } : x,
                      ),
                    }));
                  }}
                />
              ))}
            </AsyncSection>
          )}

          {tab === "classwork" && (
            <AsyncSection
              loading={false}
              isEmpty={(data.assignments ?? []).length === 0}
              empty={<EmptyState icon={ClipboardList} title="No classwork published" description="When your teacher publishes an assignment, it appears here with its rubric." />}
            >
              {(data.assignments ?? []).map((a: any, i: number) => (
                <Classwork
                  key={a.id}
                  a={a}
                  index={i}
                  submission={subByAssignment.get(a.id)}
                  onSubmit={async (content) => {
                    const r = await submitFn({ data: { assignment_id: a.id, content } });
                    setData((d: any) => ({
                      ...d,
                      submissions: [...(d.submissions ?? []).filter((s: any) => s.assignment_id !== a.id), r.submission],
                    }));
                    celebrate("assignment");
                  }}
                  onUnsubmit={async () => {
                    await unsubmitFn({ data: { assignment_id: a.id } });
                    setData((d: any) => ({
                      ...d,
                      submissions: (d.submissions ?? []).map((s: any) =>
                        s.assignment_id === a.id ? { ...s, submitted_at: null, grade_status: "unsubmitted" } : s,
                      ),
                    }));
                  }}
                />
              ))}
            </AsyncSection>
          )}

          {tab === "grades" && <Grades assignments={data.assignments ?? []} submissions={data.submissions ?? []} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Announcement({ a, index, onComment }: { a: any; index: number; onComment: (c: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="paper p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{a.author_name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {a.pinned && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          <time>{new Date(a.created_at).toLocaleDateString()}</time>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{a.content}</p>

      {(a.comments ?? []).length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border/60 pt-3">
          {a.comments.map((cm: any) => (
            <li key={cm.id} className="text-sm">
              <span className="font-medium">{cm.author_name}</span>{" "}
              <span className="text-muted-foreground">{cm.content}</span>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim() || busy) return;
          setBusy(true);
          setErr(null);
          try {
            await onComment(draft.trim());
            setDraft("");
          } catch (e2: any) {
            setErr(e2?.message ?? "Couldn't post that comment.");
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 flex items-center gap-2"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a class comment…"
          className="min-w-0 flex-1 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <motion.button whileTap={{ scale: 0.94 }} disabled={busy} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60">
          <Send className="h-3.5 w-3.5" />
        </motion.button>
      </form>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </motion.article>
  );
}

function Classwork({
  a,
  index,
  submission,
  onSubmit,
  onUnsubmit,
}: {
  a: any;
  index: number;
  submission?: any;
  onSubmit: (content: string) => Promise<void>;
  onUnsubmit: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(submission?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submitted = !!submission?.submitted_at;
  const criteria: any[] = Array.isArray(a.rubric_json?.criteria) ? a.rubric_json.criteria : [];

  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{a.module || a.kind || "Classwork"}</div>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">{a.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.due_date ? `Due ${new Date(a.due_date).toLocaleString()}` : "No due date"} · {a.points} pts
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            submission?.grade_status === "graded"
              ? "bg-primary/10 text-primary"
              : submitted
                ? "bg-accent/60 text-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {submission?.grade_status === "graded" ? `Graded ${submission.score ?? 0}/${a.points}` : submitted ? "Submitted" : "Not submitted"}
        </span>
      </div>

      {a.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{a.description}</p>}

      {criteria.length > 0 && (
        <div className="mt-4 rounded-xl border border-border/60 p-3">
          <div className="eyebrow">Rubric</div>
          <ul className="mt-2 space-y-1 text-sm">
            {criteria.map((cr: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{cr.name ?? cr.title ?? `Criterion ${i + 1}`}</span>
                <span className="shrink-0 text-muted-foreground">{cr.points ?? cr.max ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submission?.teacher_feedback && (
        <div className="mt-4 rounded-xl bg-accent/40 p-3">
          <div className="eyebrow">Teacher feedback</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{submission.teacher_feedback}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen((o) => !o)} className="rounded-full border border-border/70 px-3 py-1.5 text-sm font-medium hover:bg-accent/40">
          {open ? "Hide work" : submitted ? "View / edit work" : "Add work"}
        </button>
        {submitted && (
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onUnsubmit();
              } catch (e: any) {
                setErr(e?.message ?? "Couldn't unsubmit.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/40 disabled:opacity-60"
          >
            <Undo2 className="h-3.5 w-3.5" /> Unsubmit
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Type or paste your work here…"
              className="mt-3 w-full rounded-xl border border-border/70 bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={busy || !content.trim()}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  await onSubmit(content.trim());
                  setOpen(false);
                } catch (e: any) {
                  setErr(e?.message ?? "Couldn't submit.");
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? "Submitting…" : submitted ? "Resubmit" : "Submit work"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </motion.article>
  );
}

function Grades({ assignments, submissions }: { assignments: any[]; submissions: any[] }) {
  const rows = submissions.filter((s) => s.grade_status === "graded");
  if (!rows.length)
    return <EmptyState icon={GraduationCap} title="No grades returned yet" description="Once your teacher returns marked work, scores and rubric breakdowns show up here." />;
  const aOf = new Map<string, any>(assignments.map((a) => [a.id, a]));
  const earned = rows.reduce((s, r) => s + (Number(r.score) || 0), 0);
  const possible = rows.reduce((s, r) => s + (Number(aOf.get(r.assignment_id)?.points) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="paper-raised p-5">
        <div className="eyebrow">Class total</div>
        <p className="mt-1 font-display text-3xl font-semibold">
          {possible ? Math.round((earned / possible) * 100) : 0}
          <span className="text-lg text-muted-foreground">%</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {earned} of {possible} points across {rows.length} graded {rows.length === 1 ? "task" : "tasks"}
        </p>
      </div>
      {rows.map((r, i) => {
        const a = aOf.get(r.assignment_id);
        const crit = r.criteria_scores && typeof r.criteria_scores === "object" ? Object.entries(r.criteria_scores) : [];
        return (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="paper p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate font-medium">{a?.title ?? "Assignment"}</h3>
              <span className="shrink-0 font-display text-lg font-semibold">
                {r.score ?? 0}/{a?.points ?? 0}
              </span>
            </div>
            {crit.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {crit.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{k}</span>
                    <span>{String(v)}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.teacher_feedback && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.teacher_feedback}</p>}
          </motion.div>
        );
      })}
    </div>
  );
}
