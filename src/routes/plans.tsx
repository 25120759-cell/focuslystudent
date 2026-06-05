import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { redeemPlanCode } from "@/lib/plans.functions";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/plans")({
  ssr: false,
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "Plans & Pricing — Focusly" },
      { name: "description", content: "Free, Pro, and Max plans for Focusly. Start with 100 AI credits per month, free forever." },
      { property: "og:title", content: "Plans & Pricing — Focusly" },
      { property: "og:description", content: "Free, Pro, and Max plans. 100 AI credits free monthly. Pro and Max coming soon." },
    ],
  }),
});

interface Plan {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  ctaDisabled?: boolean;
  highlight?: boolean;
  soon?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Everything you need to study smarter — no card required.",
    features: [
      "100 AI credits / month",
      "Max 10 AI credits / day",
      "Full study clock + timetable",
      "Assignments, calendar, social, cards",
      "Offline-first storage",
      "Gamified rewards & redemptions",
    ],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$6",
    cadence: "/ month",
    blurb: "10× more AI for serious students who plan ahead.",
    features: [
      "1,000 AI credits / month",
      "No daily cap",
      "Priority AI response",
      "Realtime shared lists",
      "Advanced keyboard shortcuts",
      "Everything in Free",
    ],
    cta: "Coming soon",
    ctaDisabled: true,
    highlight: true,
    soon: true,
  },
  {
    name: "Max",
    price: "$19",
    cadence: "/ month",
    blurb: "For power users running their whole academic life on AI.",
    features: [
      "10,000 AI credits / month",
      "Largest reasoning models",
      "Smart scheduling across calendars",
      "Auto-breakdown unlimited",
      "Early access to new tools",
      "Everything in Pro",
    ],
    cta: "Coming soon",
    ctaDisabled: true,
    soon: true,
  },
];

function PlansPage() {
  const { user } = useAuth();
  const redeemFn = useServerFn(redeemPlanCode);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function redeem() {
    if (!code.trim()) return;
    setMsg(null); setErr(null);
    try {
      const r: any = await redeemFn({ data: { code } });
      setMsg(`Redeemed! Your plan is now ${String(r.plan || "updated").toUpperCase()}.`);
      setCode("");
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</span>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Simple plans. Real AI credits.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          1 credit = 1 AI action. Paid plans are unlocked with admin-issued codes.
        </p>
      </section>

      <section className="mx-auto max-w-xl px-6 pb-12">
        <div className="rounded-3xl glass p-5 text-center">
          <Ticket className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-2 font-display text-xl font-semibold">Redeem a plan code</h2>
          <p className="mt-1 text-sm text-muted-foreground">Got a code from an admin? Enter it here to unlock Pro or Max.</p>
          {user ? (
            <div className="mt-4 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="FOCUSLY-PRO" className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm uppercase" />
              <button onClick={redeem} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Redeem</button>
            </div>
          ) : (
            <Link to="/login" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Sign in to redeem</Link>
          )}
          {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-3xl border p-7 ${
              p.highlight
                ? "border-primary bg-gradient-to-br from-primary/5 via-card to-card shadow-lg"
                : "border-border bg-card"
            }`}
          >
            {p.soon && (
              <span className="absolute right-5 top-5 rounded-full bg-[color:var(--gold)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--gold)]">
                Coming soon
              </span>
            )}
            {p.highlight && (
              <Sparkles className="absolute left-5 top-5 h-4 w-4 text-primary" />
            )}
            <h3 className="mt-6 font-display text-2xl font-semibold">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              disabled={p.ctaDisabled}
              className={`mt-8 w-full rounded-full px-5 py-2.5 text-sm font-medium transition ${
                p.ctaDisabled
                  ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          Questions? <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Read our legal docs</a>.
        </div>
      </footer>
    </div>
  );
}
