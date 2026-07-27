import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Focusly" },
      { name: "description", content: "Sign in to Focusly to sync your study plan, notes, cards, and AI credits across your devices." },
      { property: "og:title", content: "Sign in — Focusly" },
      { property: "og:description", content: "Pick up your plan on any device. Google or email, up to you." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://focuslystudent.lovable.app/login" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sign in — Focusly" },
      { name: "twitter:description", content: "Pick up your plan on any device. Google or email, up to you." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://focuslystudent.lovable.app/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const dest = redirect && redirect.startsWith("/") ? redirect : "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) navigate({ to: dest, replace: true });
    });
  }, [navigate, dest]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    navigate({ to: dest });
  }

  async function onGoogle() {
    setErr(null);
    try { sessionStorage.setItem("post_auth_redirect", dest); } catch {}
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setErr(result.error.message || "Google sign-in failed");
    else if (!result.redirected) navigate({ to: dest });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(900px_500px_at_-10%_10%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%),radial-gradient(700px_400px_at_110%_20%,color-mix(in_oklab,var(--gold)_25%,transparent),transparent_60%)]"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          {/* Editorial side */}
          <div className="hidden md:block">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              <Sparkles className="h-3 w-3" /> Welcome back
            </motion.div>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight leading-[1.05]">
              Pick up where you <em className="not-italic text-primary">left off</em>.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Your plan, docs, notes, cards, and AI credits sync across every device. Signing in is how the offline app knows it's yours.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Your assignments and timetable, everywhere",
                "AI credits picked up mid-conversation",
                "Docs and authorship reports stay private to you",
              ].map((s) => (
                <li key={s} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Sign in</span>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sync your study progress across devices.</p>

              <button
                onClick={onGoogle}
                className="mt-6 w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent/40"
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                {err && <p className="text-xs text-destructive">{err}</p>}
                <button
                  type="submit" disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                New to Focusly? <Link to="/signup" className="text-primary underline underline-offset-2">Create an account</Link>
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                <Link to="/landing" className="hover:text-foreground">← Back to site</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
