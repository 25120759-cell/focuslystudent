import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PublicHeader } from "@/components/PublicHeader";
import cogniMark from "@/assets/cogni-mark.png";

export function PublicPage({ label, title, description, children }: { label: string; title: string; description: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return <div className="public-editorial min-h-screen bg-background text-foreground">
    <PublicHeader />
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <motion.header initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="public-overview">
        <div className="min-w-0 max-w-3xl">
          <p className="workspace-kicker">Cogni For Students / {label}</p>
          <h1 className="public-title mt-5">{title}</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <img src={cogniMark} alt="" className="public-mark dark:brightness-0 dark:invert" />
      </motion.header>
      {children}
    </main>
    <footer className="border-t border-border px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 text-xs text-muted-foreground">
        <p>Cogni For Students, part of the Cogni Suite</p>
        <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="underline underline-offset-4">Terms & privacy</a>
      </div>
    </footer>
  </div>;
}
