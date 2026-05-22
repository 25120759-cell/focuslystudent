import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, LogIn } from "lucide-react";

export const Route = createFileRoute("/updates")({
  ssr: false,
  component: UpdatesPage,
  head: () => ({
    meta: [
      { title: "Updates — Focusly" },
      { name: "description", content: "Release notes and product updates for Focusly." },
      { property: "og:title", content: "Updates — Focusly" },
      { property: "og:description", content: "Release notes and product updates for Focusly." },
    ],
  }),
});

// Seed posts — once Cloud is enabled these come from the database.
const POSTS = [
  {
    id: "launch",
    date: "2026-05-22",
    title: "Focusly v1 — hello, world.",
    body:
      "We're launching Focusly: a premium, offline-first study app with a focus timer, Toddle sync, a real calendar, a rewards system, and an AI assistant that does the boring planning for you. This is just the start — auto-breakdown, smart prioritization, and shared lists are coming next.",
  },
  {
    id: "ai-credits",
    date: "2026-05-22",
    title: "AI credits, explained.",
    body:
      "Every Focusly account starts with 100 AI credits per month (max 10 per day). 1 credit = 1 AI action — a task parse, a breakdown, a prioritization pass, or a chat reply. Pro and Max plans with 1,000 and 10,000 credits are coming soon.",
  },
];

function UpdatesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/landing" className="font-display text-xl font-semibold tracking-tight">Focusly</Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/landing" className="rounded-full px-3 py-1.5 hover:bg-accent">Home</Link>
            <Link to="/plans" className="rounded-full px-3 py-1.5 hover:bg-accent">Plans</Link>
            <Link to="/" className="ml-2 rounded-full bg-primary px-4 py-1.5 text-primary-foreground hover:opacity-90">Open app</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Changelog</span>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Updates</h1>
        <p className="mt-3 text-muted-foreground">What's new, what's next, and what we're fixing.</p>

        <div className="mt-12 space-y-10">
          {POSTS.map((p) => (
            <article key={p.id} className="rounded-3xl glass p-7">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={p.date}>{new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <button
            disabled
            title="Sign-in for admins coming with auth"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in to post
          </button>
        </div>
      </section>

      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-3xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Focusly · A Lura app
        </div>
      </footer>
    </div>
  );
}
