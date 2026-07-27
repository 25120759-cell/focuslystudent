import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create your Focusly account" },
      { name: "description", content: "Free forever. 100 AI credits every month. Sign up in under a minute." },
      { property: "og:title", content: "Create your Focusly account" },
      { property: "og:description", content: "Free forever. 100 AI credits every month. All study tools included." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://focuslystudent.lovable.app/signup" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Create your Focusly account" },
      { name: "twitter:description", content: "Free forever. 100 AI credits every month. All study tools included." },
    ],
    links: [{ rel: "canonical", href: "https://focuslystudent.lovable.app/signup" }],
  }),
});

const LEGAL_VERSION = "2026-05-22";
const LEGAL_URL = "https://luraapps.base44.app/legal";

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function markAccepted() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const now = new Date().toISOString();
    await supabase.from("profiles").update({
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_content_policy_at: now,
      legal_version: LEGAL_VERSION,
    }).eq("id", data.user.id);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!accepted) return setErr("You must accept the Lura legal documents to continue.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setLoading(false); return setErr(error.message); }
    await markAccepted();
    setLoading(false);
    navigate({ to: "/app" });
  }

  async function onGoogle() {
    setErr(null);
    if (!accepted) return setErr("You must accept the Lura legal documents to continue.");
    sessionStorage.setItem("focusly_legal_pending", LEGAL_VERSION);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setErr(result.error.message || "Google sign-in failed");
    else if (!result.redirected) { await markAccepted(); navigate({ to: "/app" }); }
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
          <div className="hidden md:block">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              <Sparkles className="h-3 w-3" /> Free forever · 100 AI credits/mo
            </motion.div>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight leading-[1.05]">
              Start studying <em className="not-italic text-primary">quieter</em>.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Every study tool is on the free plan — assignments, calendar, timetable, docs, focus timer, notes, cards, social. AI just scales when you need more.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "No card. No trial. No feature paywalls.",
                "Your work syncs offline and back online seamlessly.",
                "Delete your account at any time — takes one click.",
              ].map((s) => (
                <li key={s} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Sign up</span>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Create your account</h2>
              <p className="mt-1 text-sm text-muted-foreground">Free forever · 100 AI credits every month.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
                  <span>
                    I have read and accept the Lura{" "}
                    <a href={LEGAL_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Terms, Privacy, and Content Policy</a>.
                  </span>
                </label>

                {err && <p className="text-xs text-destructive">{err}</p>}
                <button
                  type="submit" disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : <>Create account <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={onGoogle}
                className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent/40"
              >
                Continue with Google
              </button>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary underline underline-offset-2">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
