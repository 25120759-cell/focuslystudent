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
      { property: "og:description", content: "Focusly is more than tasks. Chat with other students, post wins to the feed, and collect 500 study-themed trading cards." },
    ],
  }),
});

function EngagementPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Now live
        </span>
        <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold tracking-tight">
          Studying, but make it <span className="bg-gradient-to-r from-primary to-[color:var(--gold)] bg-clip-text text-transparent">social.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-muted-foreground md:text-lg">
          Focusly isn't just a planner anymore. Post wins, chat with other students, and collect 500 study-themed trading cards — including one you'll almost never see.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Join Focusly <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/landing" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent">
            See the study tools
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 grid gap-4 md:grid-cols-3">
        <Feature icon={Users} title="Social feed" body="Post study wins, ask for help, and cheer each other on. A timeline made for students, not influencers." />
        <Feature icon={MessageCircle} title="Direct messages" body="Real-time DMs with classmates. Plan study sessions, swap notes, send card trade offers." />
        <Feature icon={Layers} title="500-card TCG" body="Open packs with coins you earn from studying. Sell duplicates. Trade for cards you need." />
      </section>

      {/* Eclipse showcase */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-violet-950 via-card to-amber-950/30 p-8 md:p-12 overflow-hidden relative">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">1 in 1,000,000</span>
              <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold">Meet The Eclipse.</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                A single mythic card hidden in the entire game. The odds say you'll never pull it. But every pack you open is a chance.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-black hover:opacity-90">
                  Start opening packs <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="mx-auto w-56 aspect-[3/4] rounded-2xl overflow-hidden ring-2 ring-amber-400 shadow-[0_0_60px_-5px] shadow-amber-500/60 relative"
            >
              <img src={eclipseArt} alt="The Eclipse card" loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute inset-0 flex flex-col justify-between p-3 text-white">
                <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider w-fit">✦ Eclipse</span>
                <div>
                  <div className="font-display font-semibold">The Eclipse</div>
                  <div className="text-[10px] opacity-80">⚡ 100 · ◎ 100</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <Trophy className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
        <h2 className="mt-3 font-display text-3xl font-semibold">Studying that gives back.</h2>
        <p className="mt-3 text-muted-foreground">Complete assignments → earn coins → open packs → trade cards. Every focused hour pays you something real.</p>
        <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Focusly · A Lura app</div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-3xl glass p-6">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </motion.div>
  );
}
