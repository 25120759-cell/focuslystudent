import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CalendarDays, FolderOpen, Clock } from "lucide-react";
import { StudyClock } from "@/components/console/StudyClock";
import { Timetable } from "@/components/console/Timetable";
import { FilesView } from "@/components/console/FilesView";
import { AIChat } from "@/components/AIChat";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/app")({
  component: Console,
  head: () => ({
    meta: [
      { title: "Console — Focusly" },
      { name: "description", content: "Your study console: focus clock, timetable, and files in one calm place." },
      { property: "og:title", content: "Console — Focusly" },
      { property: "og:description", content: "Your study console: focus clock, timetable, and files in one calm place." },
    ],
  }),
});

type View = "clock" | "timetable" | "files";

const VIEW_META: Record<View, { label: string; eyebrow: string; accent: string; blurb: string; icon: typeof Clock }> = {
  clock: {
    label: "Study",
    accent: "Clock",
    eyebrow: "Deep work",
    blurb: "One timer, no noise. Start a session and let the rest of the app wait for you.",
    icon: Clock,
  },
  timetable: {
    label: "Your",
    accent: "Timetable",
    eyebrow: "The week, mapped",
    blurb: "Build your own schedule with custom classes, colours, rooms, and breaks.",
    icon: CalendarDays,
  },
  files: {
    label: "Your",
    accent: "Files",
    eyebrow: "Everything you keep",
    blurb: "Create, edit, and delete study files — kept in sync with your account.",
    icon: FolderOpen,
  },
};

function Console() {
  const [view, setView] = useState<View>("clock");
  const [aiOpen, setAiOpen] = useState(false);
  const meta = VIEW_META[view];

  return (
    <div className="space-y-8 rise-in">
      <PageHeader
        key={view}
        eyebrow={meta.eyebrow}
        icon={meta.icon}
        title={meta.label}
        accent={meta.accent}
        description={meta.blurb}
        actions={
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-border/70 p-1">
            {(Object.keys(VIEW_META) as View[]).map((v) => {
              const Icon = VIEW_META[v].icon;
              const active = v === view;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="console-seg"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {VIEW_META[v].accent}
                  </span>
                </button>
              );
            })}
          </div>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {view === "clock" && <StudyClock />}
          {view === "timetable" && <Timetable />}
          {view === "files" && <FilesView />}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="nav-pill flex items-center gap-1 rounded-full px-2 py-2 shadow-xl"
        >
          <UBtn icon={<Sparkles className="h-4 w-4" />} label="Ask AI" onClick={() => setAiOpen(true)} />
          <span className="mx-1 h-5 w-px bg-border/70" />
          <UBtn icon={<Clock className="h-4 w-4" />} label="Clock" active={view === "clock"} onClick={() => setView("clock")} />
          <UBtn icon={<CalendarDays className="h-4 w-4" />} label="Timetable" active={view === "timetable"} onClick={() => setView("timetable")} />
          <UBtn icon={<FolderOpen className="h-4 w-4" />} label="Files" active={view === "files"} onClick={() => setView("files")} />
        </motion.div>
      </div>

      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function UBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground/80"
      }`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
