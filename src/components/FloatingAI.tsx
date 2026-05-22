import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { AIChat } from "./AIChat";

const HIDDEN_ROUTES = ["/landing", "/plans", "/updates", "/login", "/signup"];

export function FloatingAI() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  if (HIDDEN_ROUTES.some((r) => loc.pathname.startsWith(r))) return null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ask AI (⌘K)"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <AIChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}
