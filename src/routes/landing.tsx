import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, Brain, CalendarClock, Target, MessageCircle, ArrowRight,
  WifiOff, Trophy, Clock, BookOpen, Users, Crown, Check, ChevronRight,
  Eye, FileText, ImageIcon,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { CogniIntro } from "@/components/CogniIntro";
import { CogniScrollStory } from "@/components/CogniScrollStory";

export const Route = createFileRoute("/landing")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Cogni — A calmer way to get schoolwork done" },
      { name: "description", content: "Plan, focus, and finish your schoolwork with an offline-first AI study app. Calm by design, powerful when you need it." },
      { property: "og:title", content: "Cogni — A calmer way to get schoolwork done" },
      { property: "og:description", content: "Offline-first AI study app: natural-language tasks, smart scheduling, focus timer, deep AI study aids, and a study-themed card game." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/landing" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cogni — A calmer way to get schoolwork done" },
      { name: "twitter:description", content: "Offline-first AI study app: natural-language tasks, smart scheduling, focus timer, deep AI study aids, and a study-themed card game." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/landing" }],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CogniIntro />
      <PublicHeader />

      <CogniScrollStory />

      {/* PILLARS */}
      <section className="border-y border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Three quiet superpowers</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">
              Less noise. More done.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: MessageCircle, t: "Type, don't form-fill", b: "Drop a sentence in. Cogni parses dates, times, and categories. No dropdowns." },
              { icon: Brain, t: "Plan stays adapted", b: "Plans reshuffle when your schedule changes. You always know what to do next." },
              { icon: WifiOff, t: "Always with you, even offline", b: "Tasks, notes, flashcards, and quizzes are cached locally and synced when you reconnect." },
            ].map((p) => (
              <div key={p.t} className="group">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURE SHOWCASE */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-14 items-start">
          <div className="md:sticky md:top-24">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">AI study aids</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">
              Notes in. Study aids out.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Paste your lecture notes or textbook excerpt. Cogni returns a summary, flashcards, and a quiz
              you can edit and regenerate by section.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: FileText, t: "Smart summary", b: "Plain-English summary plus the key points that matter for your exam." },
              { icon: Brain, t: "Auto flashcards", b: "Click-to-flip cards in batches of 8-15, sized to your plan." },
              { icon: Target, t: "Practice quiz", b: "Multiple-choice with explanations — regenerate any section if it misses the mark." },
              { icon: CalendarClock, t: "Assignment breakdown", b: "Big task in, micro-checklist plus a scheduled study plan out." },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/60 bg-card p-5 flex gap-4"
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-background text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{f.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.b}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--gold)]">Choose your tier</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">Power, when you need it.</h2>
            <p className="mt-4 text-base opacity-70">
              Free covers daily use. Pro adds more credits and longer inputs. Max unlocks deeper reasoning,
              long documents, vision input, and auto-scheduling to your calendar.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <PlanCard
              name="Free"
              price="$0"
              tagline="For getting started"
              features={[
                "10 AI requests / day",
                "100 / month",
                "Up to 4k chars per request",
                "All productivity tools",
              ]}
            />
            <PlanCard
              name="Pro"
              price="$6"
              tagline="For everyday studying"
              accent
              features={[
                "100 AI requests / day",
                "1,000 / month",
                "Up to 8k chars per request",
                "Full assistant + breakdowns",
              ]}
            />
            <PlanCard
              name="Max"
              price="$19"
              tagline="For serious students"
              max
              features={[
                "500 AI requests / day · 10k/mo",
                "Up to 20k chars per request",
                "Smarter reasoning model",
                "Vision: snap a photo of notes",
                "Deep study plans + auto-schedule",
              ]}
              maxOnly={[
                { icon: Crown, label: "Pro reasoning model" },
                { icon: ImageIcon, label: "Image / handwriting input" },
                { icon: Eye, label: "20k char long-doc mode" },
                { icon: CalendarClock, label: "Auto-schedule to calendar" },
              ]}
            />
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-medium text-foreground"
            >
              Compare all plans <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="border-y border-border/60 py-10 md:py-14">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Stay in the loop</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Study isn't a solo sport.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Post wins, message classmates, collect cards from your study streak, and open packs with coins
                you earn from focused work.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Users, label: "Social feed" },
                { icon: Trophy, label: "Collectible cards" },
                { icon: Clock, label: "Focus timer + chimes" },
                { icon: BookOpen, label: "AI study notes" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-xl bg-background px-4 py-2.5">
                  <c.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-28 text-center">
        <h2 className="font-display text-4xl md:text-5xl font-semibold">Close the tabs. Open Cogni.</h2>
        <p className="mt-4 text-base text-muted-foreground">Free to start. Three minutes to set up. Quieter studying from today.</p>
        <Link
          to="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-sm"
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Cogni · Part of the Cogni Suite</span>
          <div className="flex gap-4">
            <Link to="/engagement" className="hover:text-foreground">Community</Link>
            <Link to="/plans" className="hover:text-foreground">Plans</Link>
            <Link to="/updates" className="hover:text-foreground">Updates</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
            <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="hover:text-foreground">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ name, price, tagline, features, accent, max, maxOnly }: {
  name: string; price: string; tagline: string; features: string[];
  accent?: boolean; max?: boolean;
  maxOnly?: { icon: any; label: string }[];
}) {
  const wrapperCls = max
    ? "bg-[color:var(--gold)] text-foreground border-transparent"
    : accent
      ? "bg-primary text-primary-foreground border-transparent"
      : "bg-background/5 text-background border-background/10";
  const muteCls = max ? "text-foreground/70" : "opacity-70";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`rounded-3xl p-7 relative border ${wrapperCls}`}
    >
      {max && (
        <div className="absolute -top-3 right-6 rounded-full bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--gold)]">
          Most powerful
        </div>
      )}
      <div className="flex items-center gap-2">
        {max && <Crown className="h-4 w-4" />}
        <h3 className="font-display text-xl font-semibold">{name}</h3>
      </div>
      <p className={`text-xs mt-1 ${muteCls}`}>{tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">{price}</span>
        <span className={`text-xs ${muteCls}`}>/mo</span>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><Check className="h-4 w-4 flex-shrink-0 mt-0.5" /> {f}</li>
        ))}
      </ul>
      {maxOnly && (
        <div className="mt-5 pt-5 border-t border-foreground/15 space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold">Max-only</p>
          {maxOnly.map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-sm font-medium">
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
