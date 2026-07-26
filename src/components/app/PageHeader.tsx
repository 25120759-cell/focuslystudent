import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** small uppercase label above the title */
  eyebrow?: string;
  title: ReactNode;
  /** rendered in italic-accent after the title */
  accent?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared editorial page header for signed-in surfaces.
 * Mirrors the landing page vocabulary: eyebrow → display headline with an
 * italic accent → lede → hairline rule.
 */
export function PageHeader({ eyebrow, title, accent, description, icon: Icon, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`relative ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="eyebrow flex items-center gap-2"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {eyebrow}
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.04 }}
            className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]"
          >
            {title}
            {accent && <em className="not-italic text-primary"> {accent}</em>}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </motion.div>
        )}
      </div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left" }}
        className="hairline mt-5"
      />
    </header>
  );
}
