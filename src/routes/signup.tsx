import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupPage,
  head: () => ({ meta: [{ title: "Create account — Focusly" }] }),
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
    navigate({ to: "/" });
  }

  async function onGoogle() {
    setErr(null);
    if (!accepted) return setErr("You must accept the Lura legal documents to continue.");
    sessionStorage.setItem("focusly_legal_pending", LEGAL_VERSION);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setErr(result.error.message || "Google sign-in failed");
    else if (!result.redirected) {
      await markAccepted();
      navigate({ to: "/" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl glass p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-xl font-semibold">Focusly</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Free forever. 100 AI credits / month.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />
          <input
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
            <span>
              I have read and accept the Lura{" "}
              <a href={LEGAL_URL} target="_blank" rel="noreferrer" className="text-primary underline">Terms of Service, Privacy Policy, and Content Policy</a>.
            </span>
          </label>

          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
