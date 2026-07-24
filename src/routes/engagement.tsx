import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, MessageCircle, Sparkles, ArrowRight, Trophy, Layers } from "lucide-react";
import eclipseArt from "@/assets/eclipse-card.jpg";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/engagement")({
  ssr: false,
  component: EngagementPage,
  head: () => ({
    meta: [
      { title: "Community & Cards — Focusly" },
      { name: "description", content: "Focusly is more than tasks. Chat with other students, post wins to the feed, and collect 500 study-themed trading cards." },
      { property: "og:title", content: "Community & Cards — Focusly" },
      { property: "og:description", content: "Post wins, DM classmates, and open packs of a 500-card study-themed TCG." },
    ],
  }),
});

function EngagementPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%),radial-gradient(800px_400px_at_110%_20%,color-mix(in_oklab,var(--gold)_28%,transparent),transparent_60%)]"
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3 w-3" /> Community & Cards
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mt-6 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]"
          >
            Studying, but make it <em className="not-italic text-primary">social</em>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground"
          >
            Focusly isn't just a planner. Post wins, chat with classmates, and collect 500 study-themed trading cards — including one you'll almost never see.
          </motion.p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
              Join Focusly <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/landing" className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-accent/40">
              See the study tools
            </Link>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-y border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Three ways to belong</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">
              Study alone. Belong together.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: Users, t: "Social feed", b: "Post study wins, ask for help, cheer each other on. A timeline made for students, not influencers." },
              { icon: MessageCircle, t: "Direct messages", b: "Real-time DMs with classmates. Plan study sessions, swap notes, send card trade offers." },
              { icon: Layers, t: "500-card TCG", b: "Open packs with coins you earn from studying. Sell duplicates. Trade for cards you need." },
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

      {/* Eclipse showcase — editorial dark band */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--gold)]">1 in 1,000,000</span>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">Meet The Eclipse.</h2>
              <p className="mt-5 max-w-md text-base leading-relaxed opacity-75">
                A single mythic card hidden in the entire game. The odds say you'll never pull it. But every pack you open is a chance.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-medium text-foreground hover:opacity-90">
                  Start opening packs <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="mx-auto w-64 aspect-[3/4] rounded-2xl overflow-hidden ring-2 ring-[color:var(--gold)] shadow-[0_0_60px_-5px] shadow-[color:var(--gold)]/50 relative"
            >
              <img src={eclipseArt} alt="The Eclipse card" loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute inset-0 flex flex-col justify-between p-3 text-white">
                <span className="rounded-full bg-[color:var(--gold)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground w-fit">✦ Eclipse</span>
                <div>
                  <div className="font-display font-semibold">The Eclipse</div>
                  <div className="text-[10px] opacity-80">⚡ 100 · ◎ 100</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Trophy className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">Studying that gives back.</h2>
        <p className="mt-4 text-base text-muted-foreground">
          Complete assignments → earn coins → open packs → trade cards. Every focused hour pays you something real.
        </p>
        <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-sm">
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Focusly · A Lura app</span>
          <div className="flex gap-4">
            <Link to="/landing" className="hover:text-foreground">Home</Link>
            <Link to="/plans" className="hover:text-foreground">Plans</Link>
            <Link to="/updates" className="hover:text-foreground">Updates</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
