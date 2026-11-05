import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { AuthStage } from "@/components/AuthStage";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create your Cogni account" },
      { name: "description", content: "Free forever. 100 AI credits every month. Sign up in under a minute." },
      { property: "og:title", content: "Create your Cogni account" },
      { property: "og:description", content: "Free forever. 100 AI credits every month. All study tools included." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/signup" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Create your Cogni account" },
      { name: "twitter:description", content: "Free forever. 100 AI credits every month. All study tools included." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/signup" }],
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
      <AuthStage kicker="Free to start" headline="Start studying quieter." points={["No card, no trial", "Works offline and syncs back", "Delete your account anytime"]}>
              <span className="workspace-kicker">Sign up</span>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-normal">Create your account</h2>
              <p className="mt-1 text-sm text-muted-foreground">Free forever · 100 AI credits every month.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <input
                  aria-label="Email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  aria-label="Password" autoComplete="new-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
                  <span>
                    I have read and accept the Lura{" "}
                    <a href={LEGAL_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Terms, Privacy, and Content Policy</a>.
                  </span>
                </label>

                {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
                <Button
                  type="submit" disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : <>Create account <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-normal text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                onClick={onGoogle}
                className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent/40"
              >
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary underline underline-offset-2">Sign in</Link>
              </p>
      </AuthStage>
    </div>
  );
}
