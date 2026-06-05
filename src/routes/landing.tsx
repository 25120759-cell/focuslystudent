import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, Brain, CalendarClock, Target, MessageCircle,
  WifiOff, MapPin, Keyboard, Users, ArrowRight, Clock, BookOpen, Trophy,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/landing")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Focusly — The AI study app that thinks ahead" },
      { name: "description", content: "Plan, focus, and finish your schoolwork with an offline-first study app powered by AI, social tools, collectible cards, and gamified rewards." },
      { property: "og:title", content: "Focusly — The AI study app that thinks ahead" },
      { property: "og:description", content: "Offline-first AI study app: natural-language tasks, smart scheduling, focus timer, social tools, cards, and gamified rewards." },
    ],
  }),
});

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-6 py-20 ${className}`}>{children}</section>;
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl glass p-6 transition-transform hover:-translate-y-1">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      {/* Hero */}
      <Section className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Built for students who actually have a life
        </div>
        <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight md:text-7xl">
          The study app that<br />
          <span className="bg-gradient-to-r from-primary to-[color:var(--gold)] bg-clip-text text-transparent">
            thinks ahead.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Type tasks the way you'd say them. Focusly turns "essay due next Tuesday at noon" into a real
          plan — scheduled around your timetable, broken into steps, and ordered by what matters now.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/app" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Open Focusly <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/plans" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent">
            See plans
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Free forever. 100 AI credits / month included.</p>
      </Section>

      {/* AI Features */}
      <Section>
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">AI Superpowers</span>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Five ways AI does the boring part</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={MessageCircle} title="Natural language input" body='Type "remind me next Tuesday at noon" — Focusly parses dates, times, and categories. No forms, no dropdowns.' />
          <Feature icon={Brain} title="Auto-breakdown" body='Drop in a big task. AI splits it into a step-by-step checklist of micro-actions you can actually start.' />
          <Feature icon={CalendarClock} title="Dynamic scheduling" body="Tasks slot themselves into your free time around classes. Plans change? Focusly reshuffles, no burnout." />
          <Feature icon={Target} title="Smart prioritization" body="Your messy list gets re-ranked by urgency, importance, and blockers — so you always know what's next." />
          <Feature icon={Sparkles} title="Conversational coach" body="Ask anything about your schedule. Get summaries, check progress, or get a pep talk before a deadline." />
        </div>
      </Section>

      {/* Non-AI Features */}
      <Section className="border-t border-border/50">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Rock-solid basics</span>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">The non-AI stuff matters too</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={WifiOff} title="Robust offline mode" body="View, create, and check off tasks without internet. Syncs back automatically when you're online." />
          <Feature icon={MapPin} title="Location reminders" body='Get a nudge to "buy milk" the moment you drive past the store — not at some arbitrary time.' />
          <Feature icon={Keyboard} title="Keyboard shortcuts" body="Power users get full hotkey control. New task, complete, navigate — without touching the mouse." />
          <Feature icon={Users} title="Shared lists & realtime" body="Plan with study buddies. Assign tasks, see updates instantly, no refresh required." />
          <Feature icon={Clock} title="Focus timer + chimes" body="Pomodoro-style sessions with offline audio chimes and a full distraction-free fullscreen mode." />
          <Feature icon={BookOpen} title="Smart files" body="Keep notes, links, and study materials beside the work they belong to, without digging through tabs." />
        </div>
      </Section>

      {/* Rewards strip */}
      <Section>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-[color:var(--gold)]/10 p-10 md:p-14 text-center">
          <Trophy className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Studying that pays you back.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Earn points for completed assignments. Redeem them for real rewards — McDonald's,
            Starbucks, and more drop in as you level up.
          </p>
          <Link to="/app" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Start earning <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Focusly · A Lura app</span>
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
