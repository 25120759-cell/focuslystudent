import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Link2, CalendarDays, FolderOpen, Clock } from "lucide-react";
import { StudyClock } from "@/components/console/StudyClock";
import { Timetable } from "@/components/console/Timetable";
import { ToddleView } from "@/components/console/ToddleView";
import { FilesView } from "@/components/console/FilesView";
import { AIChat } from "@/components/AIChat";

export const Route = createFileRoute("/_authenticated/app")({
  component: Console,
});

type View = "clock" | "timetable" | "toddle" | "files";

const VIEW_LABEL: Record<View, string> = {
  clock: "Study Clock",
  timetable: "Timetable",
  toddle: "Analyse from Toddle",
  files: "Files",
};

function Console() {
  const [view, setView] = useState<View>("clock");
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
        >
          {VIEW_LABEL[view]}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === "clock" && <StudyClock />}
          {view === "timetable" && <Timetable />}
          {view === "toddle" && <ToddleView />}
          {view === "files" && <FilesView />}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="nav-pill flex items-center gap-1 rounded-full px-2 py-2 shadow-lg">
          <UBtn icon={<Sparkles className="h-4 w-4" />} label="Ask AI for help" onClick={() => setAiOpen(true)} />
          <UBtn icon={<Link2 className="h-4 w-4" />} label="Link to Toddle" active={view === "toddle"} onClick={() => setView("toddle")} />
          <UBtn icon={<CalendarDays className="h-4 w-4" />} label="Timetable" active={view === "timetable"} onClick={() => setView("timetable")} />
          <UBtn icon={<Clock className="h-4 w-4" />} label="Study Clock" active={view === "clock"} onClick={() => setView("clock")} />
          <UBtn icon={<FolderOpen className="h-4 w-4" />} label="Files" active={view === "files"} onClick={() => setView("files")} />
        </div>
      </div>

      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function UBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.04 }}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground/80"
      }`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
