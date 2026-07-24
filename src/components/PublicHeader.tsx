import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { to: "/landing", label: "Home" },
  { to: "/engagement", label: "Community" },
  { to: "/plans", label: "Plans" },
  { to: "/updates", label: "Updates" },
  { to: "/support", label: "Support" },
] as const;

export function PublicHeader() {
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link to="/landing" className="group inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/15">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          Focusly
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-0.5 text-sm">
          {LINKS.map((l) => {
            const active = path === l.to || path.startsWith(`${l.to}/`);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active ? "bg-accent/60 text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            to={user ? "/app" : "/login"}
            className="ml-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            {user ? "Open app" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
