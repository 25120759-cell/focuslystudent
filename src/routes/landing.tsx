import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, Brain, CalendarClock, Target, MessageCircle, ArrowRight,
  WifiOff, Trophy, Clock, BookOpen, Users, Crown, Check, ChevronRight,
  Eye, FileText, ImageIcon,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/landing")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Focusly — A calmer way to get schoolwork done" },
      { name: "description", content: "Plan, focus, and finish your schoolwork with an offline-first AI study app. Calm by design, powerful when you need it." },
      { property: "og:title", content: "Focusly — A calmer way to get schoolwork done" },
      { property: "og:description", content: "Offline-first AI study app: natural-language tasks, smart scheduling, focus timer, deep AI study aids, and gamified rewards." },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ backgroundColor: "#E8E4D8" }}>
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 600px at 10% -10%, rgba(15,27,45,0.08), transparent 60%), radial-gradient(800px 400px at 110% 30%, rgba(242,200,121,0.18), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-28 md:pt-28 md:pb-36 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: "rgba(15,27,45,0.06)", color: "#0F1B2D" }}
            >
              <Sparkles className="h-3 w-3" style={{ color: "#1E3A5F" }} /> Calmly engineered for students
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]"
              style={{ color: "#0F1B2D" }}
            >
              School, <em className="not-italic" style={{ color: "#1E3A5F" }}>without</em> the chaos.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 max-w-xl text-base md:text-lg leading-relaxed"
              style={{ color: "rgba(15,27,45,0.7)" }}
            >
              Focusly is the study app that turns "essay due next Tuesday" into a real plan — broken into
              steps, scheduled around your day, and waiting for you offline.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium shadow-sm hover:opacity-95"
                style={{ backgroundColor: "#0F1B2D", color: "#E8E4D8" }}
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium border"
                style={{ borderColor: "rgba(15,27,45,0.15)", color: "#0F1B2D" }}
              >
                Sign in
              </Link>
            </motion.div>
            <p className="mt-4 text-xs" style={{ color: "rgba(15,27,45,0.55)" }}>
              Free forever · 100 AI credits / month included
            </p>
          </div>

          {/* Editorial hero card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem]" style={{ background: "linear-gradient(135deg, rgba(242,200,121,0.3), rgba(30,58,95,0.05))" }} />
            <div
              className="rounded-[2rem] p-7 shadow-xl"
              style={{ backgroundColor: "#FFFDF7", border: "1px solid rgba(15,27,45,0.08)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#1E3A5F" }}>Today's plan</span>
                <span className="text-xs" style={{ color: "rgba(15,27,45,0.5)" }}>Tue · Mar 4</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { time: "16:00", title: "Essay outline", dur: "45m", done: true },
                  { time: "17:00", title: "Calculus practice set", dur: "30m", done: true },
                  { time: "19:30", title: "History flashcards review", dur: "20m", done: false },
                  { time: "20:00", title: "Read Ch. 4 — Macbeth", dur: "40m", done: false },
                ].map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: t.done ? "rgba(30,58,95,0.05)" : "#E8E4D8" }}
                  >
                    <div
                      className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: t.done ? "#1E3A5F" : "transparent", border: t.done ? "none" : "1.5px solid rgba(15,27,45,0.3)" }}
                    >
                      {t.done && <Check className="h-3 w-3" style={{ color: "#E8E4D8" }} />}
                    </div>
                    <span className="text-xs font-mono w-10" style={{ color: "rgba(15,27,45,0.6)" }}>{t.time}</span>
                    <span className={`flex-1 text-sm ${t.done ? "line-through" : ""}`} style={{ color: t.done ? "rgba(15,27,45,0.5)" : "#0F1B2D" }}>{t.title}</span>
                    <span className="text-[10px]" style={{ color: "rgba(15,27,45,0.4)" }}>{t.dur}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(15,27,45,0.08)" }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(15,27,45,0.6)" }}>
                  <Sparkles className="h-3 w-3" style={{ color: "#F2C879" }} /> AI scheduled this around your timetable
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-y" style={{ borderColor: "rgba(15,27,45,0.08)", backgroundColor: "#FFFDF7" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1E3A5F" }}>Three quiet superpowers</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight" style={{ color: "#0F1B2D" }}>
              Less noise. More done.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: MessageCircle, t: "Type, don't form-fill", b: "Drop a sentence in. Focusly parses dates, times, and categories. No dropdowns." },
              { icon: Brain, t: "Plan stays adapted", b: "Plans reshuffle when your schedule changes. You always know what to do next." },
              { icon: WifiOff, t: "Always with you, even offline", b: "Tasks, notes, flashcards, and quizzes are cached locally and synced when you reconnect." },
            ].map((p) => (
              <div key={p.t} className="group">
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#E8E4D8", color: "#1E3A5F" }}
                >
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold" style={{ color: "#0F1B2D" }}>{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(15,27,45,0.65)" }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURE SHOWCASE */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-14 items-start">
          <div className="md:sticky md:top-24">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1E3A5F" }}>AI study aids</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight" style={{ color: "#0F1B2D" }}>
              Notes in. Study aids out.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(15,27,45,0.65)" }}>
              Paste your lecture notes or textbook excerpt. Focusly returns a summary, flashcards, and a quiz
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
                className="rounded-2xl p-5 flex gap-4"
                style={{ backgroundColor: "#FFFDF7", border: "1px solid rgba(15,27,45,0.08)" }}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#E8E4D8", color: "#1E3A5F" }}>
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold" style={{ color: "#0F1B2D" }}>{f.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: "rgba(15,27,45,0.65)" }}>{f.b}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS — emphasizes Max-only capabilities */}
      <section style={{ backgroundColor: "#0F1B2D", color: "#E8E4D8" }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F2C879" }}>Choose your tier</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">Power, when you need it.</h2>
            <p className="mt-4 text-base" style={{ color: "rgba(232,228,216,0.7)" }}>
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
              price="$5"
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
              price="$12"
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
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              style={{ backgroundColor: "#F2C879", color: "#0F1B2D" }}
            >
              Compare all plans <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-[2rem] p-10 md:p-14" style={{ backgroundColor: "#FFFDF7", border: "1px solid rgba(15,27,45,0.08)" }}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1E3A5F" }}>Stay in the loop</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold" style={{ color: "#0F1B2D" }}>Study isn't a solo sport.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(15,27,45,0.65)" }}>
                Post wins, message classmates, collect cards from your study streak, and turn points into
                real-world rewards.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Users, label: "Social feed" },
                { icon: Trophy, label: "Collectible cards" },
                { icon: Clock, label: "Focus timer + chimes" },
                { icon: BookOpen, label: "Shared lists" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ backgroundColor: "#E8E4D8" }}>
                  <c.icon className="h-4 w-4" style={{ color: "#1E3A5F" }} />
                  <span className="text-sm font-medium" style={{ color: "#0F1B2D" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-28 text-center">
        <h2 className="font-display text-4xl md:text-5xl font-semibold" style={{ color: "#0F1B2D" }}>
          Close the tabs. Open Focusly.
        </h2>
        <p className="mt-4 text-base" style={{ color: "rgba(15,27,45,0.65)" }}>Free to start. Three minutes to set up. Quieter studying from today.</p>
        <Link
          to="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "#0F1B2D", color: "#E8E4D8" }}
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t" style={{ borderColor: "rgba(15,27,45,0.08)" }}>
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm" style={{ color: "rgba(15,27,45,0.55)" }}>
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

function PlanCard({ name, price, tagline, features, accent, max, maxOnly }: {
  name: string; price: string; tagline: string; features: string[];
  accent?: boolean; max?: boolean;
  maxOnly?: { icon: any; label: string }[];
}) {
  const bg = max ? "#F2C879" : accent ? "#1E3A5F" : "rgba(232,228,216,0.08)";
  const fg = max ? "#0F1B2D" : "#E8E4D8";
  const mute = max ? "rgba(15,27,45,0.65)" : "rgba(232,228,216,0.65)";
  const border = max ? "transparent" : "rgba(232,228,216,0.12)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="rounded-3xl p-7 relative"
      style={{ backgroundColor: bg, color: fg, border: `1px solid ${border}` }}
    >
      {max && (
        <div className="absolute -top-3 right-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ backgroundColor: "#0F1B2D", color: "#F2C879" }}>
          Most powerful
        </div>
      )}
      <div className="flex items-center gap-2">
        {max && <Crown className="h-4 w-4" />}
        <h3 className="font-display text-xl font-semibold">{name}</h3>
      </div>
      <p className="text-xs mt-1" style={{ color: mute }}>{tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">{price}</span>
        <span className="text-xs" style={{ color: mute }}>/mo</span>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><Check className="h-4 w-4 flex-shrink-0 mt-0.5" /> {f}</li>
        ))}
      </ul>
      {maxOnly && (
        <div className="mt-5 pt-5 border-t space-y-2" style={{ borderColor: "rgba(15,27,45,0.15)" }}>
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
