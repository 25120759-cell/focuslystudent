import { RouteError } from "@/components/app/States";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Zap, Crown, Calendar, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { aiCredits, aiUsageLog } from "@/lib/ai.functions";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/usage")({
  errorComponent: RouteError,
  component: UsagePage,
  head: () => ({ meta: [{ title: "AI Usage — Focusly" }] }),
});

type Credits = {
  dayUsed: number; monthUsed: number; dayLimit: number; monthLimit: number;
  plan: "free" | "pro" | "max";
  capabilities: { pro_model: boolean; allow_vision: boolean; max_chars: number };
};
type Entry = { id: string; kind: string; model: string; tokens_in: number; tokens_out: number; plan: string | null; created_at: string };

const KIND_LABEL: Record<string, string> = {
  chat: "Assistant chat",
  parse_task: "Task parsing",
  support: "Support",
  breakdown_all: "Assignment breakdown",
  breakdown_subtasks: "Breakdown · subtasks",
  breakdown_schedule: "Breakdown · schedule",
  breakdown_tips: "Breakdown · tips",
  notes_all: "Study notes",
  notes_summary: "Notes · summary",
  notes_flashcards: "Notes · flashcards",
  notes_quiz: "Notes · quiz",
  admin_post: "Admin post",
  admin_summary: "Admin summary",
  admin_image: "Admin cover image",
};

function UsagePage() {
  const creditsFn = useServerFn(aiCredits);
  const logFn = useServerFn(aiUsageLog);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, l]: any = await Promise.all([creditsFn(), logFn()]);
      setCredits(c);
      setLog(l.entries ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const dayPct = credits ? Math.min(100, Math.round((credits.dayUsed / Math.max(1, credits.dayLimit)) * 100)) : 0;
  const monthPct = credits ? Math.min(100, Math.round((credits.monthUsed / Math.max(1, credits.monthLimit)) * 100)) : 0;
  const exhaustedDay = credits ? credits.dayUsed >= credits.dayLimit : false;
  const exhaustedMonth = credits ? credits.monthUsed >= credits.monthLimit : false;

  return (
    <div className="max-w-4xl mx-auto space-y-6 rise-in">
      <PageHeader
        eyebrow="Credits & history"
        icon={Activity}
        title="AI"
        accent="Usage"
        description="Track every AI generation and exactly what's left in your quota."
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent/40">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        }
      />

      {credits && (
        <div className="grid gap-4 md:grid-cols-2">
          <Meter
            icon={<Zap className="h-4 w-4" />}
            label="Today"
            used={credits.dayUsed}
            limit={credits.dayLimit}
            pct={dayPct}
            exhausted={exhaustedDay}
          />
          <Meter
            icon={<Calendar className="h-4 w-4" />}
            label="This month"
            used={credits.monthUsed}
            limit={credits.monthLimit}
            pct={monthPct}
            exhausted={exhaustedMonth}
          />
        </div>
      )}

      {credits && (
        <div className="paper-raised p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${credits.plan === "max" ? "text-amber-500" : credits.plan === "pro" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-display text-lg font-semibold capitalize">{credits.plan} plan</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Smarter model: <strong>{credits.capabilities.pro_model ? "yes" : "no"}</strong> ·
                Vision input: <strong>{credits.capabilities.allow_vision ? "yes" : "no"}</strong> ·
                Max input: <strong>{credits.capabilities.max_chars.toLocaleString()} chars</strong>
              </p>
            </div>
            {credits.plan !== "max" && (
              <Link to="/plans" className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Upgrade to {credits.plan === "free" ? "Pro" : "Max"}
              </Link>
            )}
          </div>
        </div>
      )}

      {(exhaustedDay || exhaustedMonth) && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">AI requests are blocked</p>
            <p className="text-muted-foreground text-xs mt-1">
              You've hit your {exhaustedDay ? "daily" : "monthly"} limit. {credits?.plan !== "max" ? "Upgrade for more credits" : "Wait for the next cycle"}.
            </p>
          </div>
        </motion.div>
      )}

      <div className="paper-raised p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Recent generations</h2>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : log.length === 0 ? (
          <p className="text-xs text-muted-foreground">No AI usage yet.</p>
        ) : (
          <div className="space-y-1">
            {log.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{KIND_LABEL[e.kind] ?? e.kind}</div>
                  <div className="text-muted-foreground truncate">{e.model} · {e.plan ?? "—"}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-muted-foreground">{(e.tokens_in + e.tokens_out).toLocaleString()} tok</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Meter({ icon, label, used, limit, pct, exhausted }: { icon: React.ReactNode; label: string; used: number; limit: number; pct: number; exhausted: boolean }) {
  return (
    <div className="paper-raised p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon} {label}</span>
        <span className={`text-xs ${exhausted ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{used} / {limit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
          className={`h-full ${exhausted ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"}`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{Math.max(0, limit - used)} requests remaining</p>
    </div>
  );
}
