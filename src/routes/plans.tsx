import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Zap, Infinity as Infi, Brain, Eye, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";


export const Route = createFileRoute("/plans")({
  ssr: false,
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "Plans & Pricing — Cogni" },
      { name: "description", content: "Free is a real full-featured plan. Pro and Max just give you more AI, more packs, and smarter models." },
      { property: "og:title", content: "Plans & Pricing — Cogni" },
      { property: "og:description", content: "Free is fully-featured. Pro and Max only scale AI credits, daily limits, and model power." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/plans" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Plans & Pricing — Cogni" },
      { name: "twitter:description", content: "Free is fully-featured. Pro and Max only scale AI credits, daily limits, and model power." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/plans" }],
  }),
});

const FREE_INCLUDES = [
  "Every study tool: assignments, calendar, timetable, focus clock, Cogni Docs, files",
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
    cta: "Open Cogni",
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
  return <PublicPage label="Plans" title="A plan for your pace." description="Start with Free. Choose Pro for more AI credits, or Max for advanced AI tools. Pro and Max are activated with an admin-issued code.">
    <section aria-label="Available plans" className="grid gap-5 py-10 lg:grid-cols-3">
      {PLANS.map(p => {
        const Icon = p.icon;
        const href = !user && p.key !== "free" ? `/login?redirect=${encodeURIComponent(p.href)}` : p.href;
        return <article key={p.key} className={`plan-item flex min-w-0 flex-col rounded-lg border bg-card p-6 ${p.highlight ? "border-primary" : "border-border"}`}>
          <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary" /><span className="workspace-kicker">{p.key === "free" ? "Start here" : p.key === "pro" ? "More room" : "Go further"}</span></div>
          <h2 className="mt-7 font-display text-3xl font-medium">{p.name}</h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-2"><span className="font-display text-5xl">{p.price}</span><span className="text-sm text-muted-foreground">{p.cadence}</span></p>
          <p className="mt-4 min-h-16 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
          <Button asChild variant={p.highlight ? "default" : "outline"} className="mt-6 w-full"><Link to={href}>{p.cta}</Link></Button>
          <ul className="mt-7 flex-1 space-y-3 border-t border-border pt-6 text-sm">{p.perks.map(f => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{f}</span></li>)}</ul>
          <p className="mt-7 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{p.limits}</p>
        </article>;
      })}
    </section>
    <section className="grid gap-8 border-t border-border py-12 md:grid-cols-[1fr_2fr]">
      <div><p className="workspace-kicker">The essentials</p><h2 className="mt-3 font-display text-3xl">Built into Free.</h2></div>
      <ul className="grid gap-5 sm:grid-cols-2">{FREE_INCLUDES.map(f => <li key={f} className="flex gap-3 text-sm leading-relaxed"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" />{f}</li>)}</ul>
    </section>
    <section className="grid gap-8 border-t border-border py-12 md:grid-cols-[1fr_2fr]">
      <h2 className="font-display text-3xl">What changes?</h2>
      <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">{SCALES.map(s => { const Icon = s.icon; return <div key={s.title}><Icon className="mb-3 h-5 w-5 text-primary" /><h3 className="font-display text-xl">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p></div>; })}</div>
    </section>
    <section className="grid gap-8 border-t border-border py-12 md:grid-cols-[1fr_2fr]">
      <h2 className="font-display text-3xl">A few answers.</h2>
      <div>
        <Faq q="Does Free expire?" a="No. Free is a permanent plan. Your monthly AI allowance refills each month." />
        <Faq q="What counts as an AI credit?" a="One AI reply, generated study note pack, assignment breakdown, or AI-generated image on Docs." />
        <Faq q="How do I upgrade?" a="Payments aren't in the app yet. An admin issues a redemption code to activate Pro or Max." />
        <Faq q="What happens when credits run out?" a="AI pauses until your allowance resets. Your timetable, docs, cards, social and files remain available." />
      </div>
    </section>
  </PublicPage>;
}

function Faq({ q, a }: { q: string; a: string }) {
  return <details className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium"><span>{q}</span><span aria-hidden className="text-xl text-muted-foreground group-open:rotate-180">⌄</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p></details>;
}
