import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Zap, AlertTriangle } from "lucide-react";
import { FocuslyAILogo } from "./FocuslyAILogo";

interface Props {
  dayUsed: number;
  monthUsed: number;
  dayLimit: number;
  monthLimit: number;
  plan: string;
}

export function AICreditCard({ dayUsed, monthUsed, dayLimit, monthLimit, plan }: Props) {
  const dayPct = Math.min(100, Math.round((dayUsed / Math.max(1, dayLimit)) * 100));
  const monthPct = Math.min(100, Math.round((monthUsed / Math.max(1, monthLimit)) * 100));
  const out = dayUsed >= dayLimit || monthUsed >= monthLimit;
  const low = !out && (dayPct >= 80 || monthPct >= 80);

  const accent = out
    ? "from-destructive/80 via-destructive to-red-900"
    : low
      ? "from-amber-400 via-amber-500 to-orange-600"
      : "from-primary via-primary to-[color:var(--gold)]";

  const ring = out ? "ring-destructive/60" : low ? "ring-amber-500/40" : "ring-primary/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={out ? { x: [0, -2, 2, -2, 2, 0] } : { opacity: 1, y: 0 }}
      transition={out ? { duration: 0.4 } : { duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl border bg-card p-4 ring-1 ${ring} ${out ? "border-destructive/60" : "border-border"}`}
    >
      {/* Background sheen */}
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-10`}
      />
      {out && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-destructive/5"
          animate={{ opacity: [0.05, 0.18, 0.05] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={out ? { rotate: 0 } : { rotate: [0, 8, -8, 0] }}
            transition={{ repeat: out ? 0 : Infinity, duration: 6, ease: "easeInOut" }}
            className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
          >
            <FocuslyAILogo className="h-4 w-4" />
          </motion.div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Focusly AI</div>
            <div className={`text-xs font-medium ${out ? "text-destructive" : "text-foreground"}`}>
              {out ? "Out of credits" : `${plan.toUpperCase()} plan`}
            </div>
          </div>
        </div>
        <Link
          to="/plans"
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${out ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
        >
          {out ? "Upgrade" : "Plans"}
        </Link>
      </div>

      <div className="relative mt-3 space-y-2">
        <Bar label="Today" used={dayUsed} limit={dayLimit} pct={dayPct} out={out} low={low} accent={accent} />
        <Bar label="This month" used={monthUsed} limit={monthLimit} pct={monthPct} out={out} low={low} accent={accent} />
      </div>

      {out && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="relative mt-3 flex items-center gap-1.5 text-[11px] text-destructive"
        >
          <AlertTriangle className="h-3 w-3" />
          AI features are paused until tomorrow or until you upgrade.
        </motion.div>
      )}
      {low && !out && (
        <div className="relative mt-3 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <Zap className="h-3 w-3" /> Running low — consider upgrading soon.
        </div>
      )}
    </motion.div>
  );
}

function Bar({ label, used, limit, pct, out, low, accent }: { label: string; used: number; limit: number; pct: number; out: boolean; low: boolean; accent: string }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className={out ? "font-semibold text-destructive" : low ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>{used} / {limit}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${accent}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
