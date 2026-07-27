import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

/** A single shimmering placeholder bar. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-md ${className}`} />;
}

/** Placeholder that mimics a paper card with a title + two text lines. */
export function SkeletonCard({ lines = 2, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`paper p-5 ${className}`}>
      <SkeletonBlock className="h-5 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** Stack of card skeletons — the default "list is loading" state. */
export function SkeletonList({ rows = 3, lines = 2, className = "" }: { rows?: number; lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Responsive grid of card skeletons. */
export function SkeletonGrid({ items = 4, columns = "md:grid-cols-2", lines = 2 }: { items?: number; columns?: string; lines?: number }) {
  return (
    <div role="status" aria-label="Loading" className={`grid gap-3 ${columns}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Skeleton rows for a table body. */
export function SkeletonRows({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-border/60">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-3">
              <SkeletonBlock className="h-3 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Empty + error states                                                */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`paper-raised flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/50 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

function friendlyMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return "Something went wrong on our side.";
  if (/fetch|network|failed to fetch|load failed/i.test(raw)) return "We couldn't reach the server. Check your connection and try again.";
  if (/401|unauthor/i.test(raw)) return "Your session expired. Sign in again to continue.";
  if (/403|permission|denied/i.test(raw)) return "You don't have access to this yet.";
  if (/404|not found/i.test(raw)) return "We couldn't find what you were looking for.";
  if (/429|rate|limit/i.test(raw)) return "That was a lot at once — wait a moment and try again.";
  if (raw.length > 160) return "Something went wrong on our side.";
  return raw;
}

export function ErrorState({
  title = "That didn't load",
  error,
  message,
  onRetry,
  className = "",
}: {
  title?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`paper-raised flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{message ?? friendlyMessage(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </motion.div>
  );
}

/**
 * Route-level error boundary UI. Re-runs the route loader before clearing the
 * boundary so retrying actually refetches.
 */
export function RouteError({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <ErrorState
        title="This page hit a snag"
        error={error}
        onRetry={() => {
          if (typeof window !== "undefined") {
            reset?.();
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

/**
 * One wrapper that covers the three non-happy states so a surface is never
 * blank: loading → skeleton, failed → friendly error, empty → guidance.
 */
export function AsyncSection({
  loading,
  error,
  isEmpty,
  onRetry,
  skeleton,
  empty,
  children,
}: {
  loading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  skeleton?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (loading) return <>{skeleton ?? <SkeletonList />}</>;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
