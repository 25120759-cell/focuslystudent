import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import cogniMark from "@/assets/cogni-mark.png";

/** Split sign-in stage: navy brand panel with a word-by-word headline, warm form sheet beside it. */
export function AuthStage({ kicker, headline, points, children }: { kicker: string; headline: string; points: string[]; children: ReactNode }) {
  const reduce = useReducedMotion();
  const words = headline.split(" ");
  return (
    <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl gap-6 px-4 pb-6 md:grid-cols-[1.1fr_0.9fr] md:px-6">
      <section className="relative hidden overflow-hidden rounded-[8px] bg-brand-night p-12 text-brand-ink md:flex md:flex-col md:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <motion.img
          src={cogniMark} alt="" className="h-12 w-12 object-contain brightness-0 invert"
          initial={reduce ? false : { opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        />
        <div>
          <p className="eyebrow mb-6 opacity-70">{kicker}</p>
          <h1 className="font-display text-6xl font-medium leading-[1.03] tracking-tight">
            {words.map((w, i) => (
              <motion.span key={i} className="mr-[0.25em] inline-block"
                initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >{w}</motion.span>
            ))}
          </h1>
          <ul className="mt-10 space-y-3 border-t border-current/15 pt-6 text-sm opacity-80">
            {points.map((p, i) => (
              <motion.li key={p} initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}>{p}</motion.li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-50">Cogni For Students, part of the Cogni Suite</p>
      </section>
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center justify-center py-10"
      >
        <div className="w-full max-w-sm">{children}</div>
      </motion.section>
    </div>
  );
}
