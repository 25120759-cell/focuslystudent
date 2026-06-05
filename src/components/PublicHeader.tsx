import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link to="/landing" className="font-display text-xl font-semibold tracking-tight">Focusly</Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
          <Link to="/landing" className="rounded-full px-3 py-1.5 hover:bg-accent">Home</Link>
          <Link to="/engagement" className="rounded-full px-3 py-1.5 hover:bg-accent">Features</Link>
          <Link to="/plans" className="rounded-full px-3 py-1.5 hover:bg-accent">Plans</Link>
          <Link to="/updates" className="rounded-full px-3 py-1.5 hover:bg-accent">Updates</Link>
          <Link to="/support" className="rounded-full px-3 py-1.5 hover:bg-accent">Support</Link>
          <Link to={user ? "/app" : "/login"} className="ml-1 rounded-full bg-primary px-4 py-1.5 text-primary-foreground hover:opacity-90">
            {user ? "Open app" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}