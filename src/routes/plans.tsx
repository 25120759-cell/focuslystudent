import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";


export const Route = createFileRoute("/plans")({
  ssr: false,
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "Plans & Pricing — Focusly" },
      { name: "description", content: "Free, Pro, and Max plans for Focusly. Start with 100 AI credits per month, free forever." },
      { property: "og:title", content: "Plans & Pricing — Focusly" },
      { property: "og:description", content: "Free, Pro, and Max plans. 100 AI credits free monthly. Pro and Max activate via redemption code." },
    ],
  }),
});

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Everything you need to study smarter — no card required.",
    perks: ["100 AI credits / month", "Max 10 AI credits / day", "Full study clock + timetable", "Assignments, calendar, social, cards", "Offline-first storage", "Gamified rewards & redemptions"],
    cta: "Open Focusly",
    href: "/app",
    icon: Zap,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$6",
    cadence: "/ month",
    blurb: "10× more AI for serious students who plan ahead.",
    perks: ["1,000 AI credits / month", "No daily cap", "10 packs / day", "Priority AI response", "Everything in Free"],
    cta: "Go Pro",
    href: "/redeem?plan=pro",
    icon: Sparkles,
    highlight: true,
  },
  {
    key: "max",
    name: "Max",
    price: "$19",
    cadence: "/ month",
    blurb: "Power users running their whole academic life on AI.",
    perks: ["10,000 AI credits / month", "50 packs / day", "Largest reasoning models", "Smart scheduling across calendars", "Early access to new tools", "Everything in Pro"],
    cta: "Go Max",
    href: "/redeem?plan=max",
    icon: Crown,
  },
];

function PlansPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl px-6 pt-20 pb-10 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</span>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Simple plans. Real AI credits.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          1 credit = 1 AI action. Paid plans activate with a redemption code from an admin.
        </p>
      </motion.section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {PLANS.map((p, i) => {
          const Icon = p.icon;
          const price = p.price;
          const cadence = p.cadence;
          const href = !user && p.key !== "free" ? `/login?redirect=${encodeURIComponent(p.href)}` : p.href;

          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: "spring", damping: 24 }}
              whileHover={{ y: -4 }}
              className={`relative rounded-3xl border p-7 ${
                p.highlight
                  ? "border-primary bg-gradient-to-br from-primary/5 via-card to-card shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              )}
              <Icon className={`h-6 w-6 ${p.highlight ? "text-primary" : "text-muted-foreground"}`} />
              <h3 className="mt-3 font-display text-2xl font-semibold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <motion.span
                  key={price}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-semibold tracking-tight"
                >
                  {price}
                </motion.span>
                <span className="text-sm text-muted-foreground">{cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.perks.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={href}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : p.key === "free"
                      ? "border border-border bg-card hover:bg-accent"
                      : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {p.cta}
              </Link>
            </motion.div>
          );
        })}
      </section>

      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          Questions? <a href="https://luraapps.base44.app/feedback" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Contact us</a> · <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Legal</a>
        </div>
      </footer>
    </div>
  );
}
