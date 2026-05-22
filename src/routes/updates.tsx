import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, LogIn, LogOut, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

interface Post { id: string; title: string; body: string; created_at: string; }

const SEED_POSTS: Post[] = [
  {
    id: "seed-launch",
    title: "Focusly v1 — hello, world.",
    body: "We're launching Focusly: a premium, offline-first study app with a focus timer, Toddle sync, a real calendar, a rewards system, and an AI assistant that does the boring planning for you.",
    created_at: new Date().toISOString(),
  },
  {
    id: "seed-credits",
    title: "AI credits, explained.",
    body: "Every Focusly account starts with 100 AI credits per month (max 10 per day). Pro and Max plans with 1,000 and 10,000 credits are coming soon.",
    created_at: new Date().toISOString(),
  },
];

function UpdatesPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("posts")
      .select("id,title,body,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false });
    setPosts(data?.length ? data : SEED_POSTS);
    setLoaded(true);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function submit() {
    if (!user) return;
    setErr(null);
    if (!title.trim() || !body.trim()) return setErr("Title and body required.");
    const { error } = await supabase
      .from("posts")
      .insert({ author_id: user.id, title: title.trim(), body: body.trim(), published: true });
    if (error) return setErr(error.message);
    setTitle(""); setBody(""); setComposing(false);
    load();
  }

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

        {isAdmin && (
          <div className="mt-8">
            {!composing ? (
              <button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Plus className="h-4 w-4" /> New post
              </button>
            ) : (
              <div className="rounded-3xl glass p-5 space-y-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your update..." rows={6}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                {err && <p className="text-xs text-destructive">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={submit} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Publish</button>
                  <button onClick={() => { setComposing(false); setErr(null); }} className="rounded-full border border-border bg-card px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 space-y-10">
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="rounded-3xl glass p-7">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
                  {p.id.startsWith("seed-") && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      <Sparkles className="h-2.5 w-2.5" /> Seed
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold">{p.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-16 flex justify-center gap-3">
          {user ? (
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out ({user.email})
            </button>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-accent">
              <LogIn className="h-3.5 w-3.5" /> Sign in to post
            </Link>
          )}
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
