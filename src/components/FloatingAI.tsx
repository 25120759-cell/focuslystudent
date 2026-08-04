import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { AIChat } from "./AIChat";
import { isPublicPath } from "@/lib/publicRoutes";

export function FloatingAI() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  // Hidden on public pages, and on the Console (its dock already has "Ask AI").
  const hidden = isPublicPath(loc.pathname) || loc.pathname === "/app";


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

  if (hidden) return null;

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

