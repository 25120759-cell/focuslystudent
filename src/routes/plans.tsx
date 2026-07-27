import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Zap, Infinity as Infi, Brain, Eye, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/plans")({
  ssr: false,
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "Plans & Pricing — Focusly" },
      { name: "description", content: "Free is a real full-featured plan. Pro and Max just give you more AI, more packs, and smarter models." },
      { property: "og:title", content: "Plans & Pricing — Focusly" },
      { property: "og:description", content: "Free is fully-featured. Pro and Max only scale AI credits, daily limits, and model power." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://focuslystudent.lovable.app/plans" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Plans & Pricing — Focusly" },
      { name: "twitter:description", content: "Free is fully-featured. Pro and Max only scale AI credits, daily limits, and model power." },
    ],
    links: [{ rel: "canonical", href: "https://focuslystudent.lovable.app/plans" }],
  }),
});

const FREE_INCLUDES = [
  "Every study tool: assignments, calendar, timetable, focus clock, Focusly Docs, files",
  "Social feed, direct messages, and the full 500-card collectible game",
  "AI chat, AI study notes, AI assignment breakdown — all included",
  "Offline-first — everything you make is saved on your device too",
  "Authorship reports on your docs — proof you wrote it, not AI",
];

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    cadence: "forever, no card",
    blurb: "The whole app — genuinely. Free just has a smaller AI allowance.",
    perks: [
      "100 AI actions per month",
      "Up to 10 AI actions per day",
      "3 card packs per day",
      "Standard AI model",
      "All features unlocked",
    ],
    limits: "AI stops responding once you hit your daily or monthly limit. Everything else keeps working.",
    cta: "Open Focusly",
    href: "/app",
    icon: Zap,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$6",
    cadence: "/ month",
    blurb: "For students who lean on AI daily. 10× the credits, no daily cap.",
    perks: [
      "1,000 AI actions per month",
      "No daily limit — burst as much as you need",
      "10 card packs per day",
      "Priority queue on the AI",
      "Longer AI inputs (up to 20k characters)",
      "Everything Free includes",
    ],
    limits: "Same features as Free — you just get much more AI throughput.",
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
    perks: [
      "10,000 AI actions per month",
      "50 card packs per day",
      "Smartest reasoning model (deep thinking)",
      "Vision — upload photos of homework and notes",
      "AI research agent (multi-step web-style research)",
      "AI grader — rubric feedback on your writing",
      "Smart auto-scheduling across your calendar",
      "Everything Pro includes",
    ],
    limits: "Same features as Pro plus Max-only AI powers (grader, research agent, vision, auto-schedule).",
    cta: "Go Max",
    href: "/redeem?plan=max",
    icon: Crown,
  },
];

const SCALES = [
  { icon: Infi, title: "How much AI you can use", desc: "Free = 100/month, Pro = 1,000, Max = 10,000. 1 credit = 1 AI reply, note, breakdown, or image." },
  { icon: Brain, title: "How smart the AI is", desc: "Free & Pro use a fast standard model. Max uses the deepest reasoning model for tougher questions." },
  { icon: Eye, title: "What the AI can see", desc: "Max unlocks vision — snap a photo of a whiteboard or worksheet and the AI reads it." },
  { icon: Layers, title: "How many packs you can open", desc: "Free 3/day, Pro 10/day, Max 50/day. All cards are cosmetic — no plan gives an advantage." },
];

function PlansPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(1000px_520px_at_-10%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%),radial-gradient(700px_400px_at_110%_10%,color-mix(in_oklab,var(--gold)_24%,transparent),transparent_60%)]"
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-4xl px-6 pt-20 pb-8 md:pt-24 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</span>
          <h1 className="mt-3 font-display text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Every feature is <em className="not-italic text-primary">free</em>. AI just scales.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            You never lose a feature by staying on Free — you only run out of AI credits sooner. Pro and Max buy more credits, faster models, and higher daily caps. That's it.
          </p>
        </motion.div>
      </section>


      {/* What Free actually includes */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mx-auto max-w-4xl px-6 pb-10"
      >
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-7">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">What Free really includes</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Not a demo. Not a trial. This is the whole app.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {FREE_INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Plans */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-3">
        {PLANS.map((p, i) => {
          const Icon = p.icon;
          const href = !user && p.key !== "free" ? `/login?redirect=${encodeURIComponent(p.href)}` : p.href;

          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", damping: 24 }}
              whileHover={{ y: -4 }}
              className={`relative flex flex-col rounded-3xl border p-7 ${
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
                <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.perks.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                {p.limits}
              </p>
              <Link
                to={href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${
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

      {/* What actually scales */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-semibold">What actually changes on paid plans</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          Four things scale — and none of them lock a feature away from Free users.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SCALES.map((s, i) => {
            const I = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <I className="h-5 w-5 text-primary" />
                <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ short */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-semibold">Common questions</h2>
        <div className="mt-6 space-y-3">
          <Faq q="Does Free ever expire or turn into a trial?" a="No. Free is a permanent plan. You never lose features — only AI credits refill monthly." />
          <Faq q="What counts as one AI credit?" a="One reply from the AI chat, one generated study note pack, one assignment breakdown, or one AI-generated image on Docs." />
          <Faq q="How do I actually upgrade?" a="Payments aren't in the app yet — Pro and Max are activated with a redemption code from an admin. Click Go Pro or Go Max and paste the code on the /redeem page." />
          <Faq q="What happens when I run out of credits?" a="AI features pause with a red banner. Every other part of Focusly keeps working — timetable, docs, cards, social, files. AI resets each day and each month." />
        </div>
      </section>

      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          Questions? <a href="https://luraapps.base44.app/feedback" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Contact us</a> · <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Legal</a>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer list-none font-medium flex items-center justify-between">
        <span>{q}</span>
        <span className="text-muted-foreground group-open:rotate-180 transition">⌄</span>
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}
