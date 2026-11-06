import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Sparkles, ArrowRight, Trophy, Layers } from "lucide-react";
import eclipseArt from "@/assets/eclipse-card.jpg";
import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/engagement")({
  ssr: false,
  component: EngagementPage,
  head: () => ({
    meta: [
      { title: "Community & Cards — Cogni" },
      { name: "description", content: "Cogni is more than tasks. Chat with other students, post wins to the feed, and collect 500 study-themed trading cards." },
      { property: "og:title", content: "Community & Cards — Cogni" },
      { property: "og:description", content: "Post wins, DM classmates, and open packs of a 500-card study-themed TCG." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/engagement" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Community & Cards — Cogni" },
      { name: "twitter:description", content: "Post wins, DM classmates, and open packs of a 500-card study-themed TCG." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/engagement" }],
  }),
});

function EngagementPage() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  return <PublicPage label="Community" title="Community & cards." description="Share the small wins, find your study people, and build a collection that's yours.">
    <section className="grid gap-10 py-12 md:grid-cols-[1fr_2fr] md:gap-16" aria-labelledby="community-heading">
      <div><p className="workspace-kicker">Better together</p><h2 id="community-heading" className="mt-4 font-display text-3xl font-medium leading-tight">Your people.<br />Your progress.</h2><Button asChild className="mt-6"><Link to={user ? "/social" : "/signup"}>{user ? "Open community" : "Join Cogni"}<ArrowRight /></Link></Button></div>
      <div className="divide-y divide-border">
        {[{ icon: Users, title: "A place for your wins", body: "A finished assignment. A tricky topic understood. Share your progress with other students.", number: "01" }, { icon: MessageCircle, title: "Keep the conversation going", body: "Catch up with classmates and make space for a study session together.", number: "02" }].map((item) => <motion.div key={item.title} initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex gap-5 py-7 first:pt-0"><span className="pt-1 text-xs text-muted-foreground">{item.number}</span><div className="min-w-0 flex-1"><item.icon className="mb-4 size-6 text-primary" /><h3 className="font-display text-2xl font-medium">{item.title}</h3><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{item.body}</p></div></motion.div>)}
      </div>
    </section>
    <section className="community-collection relative overflow-hidden bg-brand-night text-brand-ink" aria-labelledby="collection-heading">
      <div className="relative z-10 max-w-lg px-6 py-10 sm:px-10 sm:py-14">
        <p className="workspace-kicker text-brand-ink/70">The collection</p><h2 id="collection-heading" className="mt-5 font-display text-4xl font-medium leading-tight sm:text-5xl">A study break.<br />Worth collecting.</h2>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-brand-ink/75">500 study-themed cards. Open packs with your card coins, sell duplicates, and work towards your next discovery.</p>
        <Button asChild variant="secondary" className="mt-8"><Link to={user ? "/cards" : "/signup"}><Layers />{user ? "Open your collection" : "Start your collection"}</Link></Button>
      </div>
      <motion.figure initial={reduce ? false : { opacity: 0, y: 35, rotate: 5 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }} className="community-art">
        <img src={eclipseArt} alt="The Eclipse collectible card artwork" width={1024} height={1024} loading="lazy" className="aspect-square w-full rounded-md object-cover" />
        <figcaption className="mt-4 flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><Sparkles className="size-4 text-gold" />The Eclipse</span><span className="text-brand-ink/65">Eclipse tier</span></figcaption>
      </motion.figure>
    </section>
    <section className="grid gap-8 border-b border-border py-12 md:grid-cols-[1fr_2fr] md:gap-16"><div><Trophy className="size-6 text-primary" /><h2 className="mt-4 font-display text-3xl font-medium">Study comes first.</h2></div><div><p className="max-w-xl text-base leading-relaxed text-muted-foreground">Your assignments, notes, and focus time stay at the heart of Cogni. Community is there when you want company; your collection is there when it's time for a break.</p><Button asChild variant="link" className="mt-6 px-0"><Link to="/landing">Explore the study tools <ArrowRight /></Link></Button></div></section>
  </PublicPage>;
}
