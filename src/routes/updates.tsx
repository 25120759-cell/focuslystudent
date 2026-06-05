import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, LogIn, LogOut, Plus, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { adminGeneratePost, generatePostSummary } from "@/lib/ai.functions";

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

interface Post { id: string; title: string; body: string; created_at: string; slug: string; summary: string | null }

function UpdatesPage() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const genFn = useServerFn(adminGeneratePost);
  const sumFn = useServerFn(generatePostSummary);

  if (path !== "/updates") return <Outlet />;

  async function load() {
    const { data } = await supabase
      .from("posts")
      .select("id,title,body,created_at,slug,summary")
      .eq("published", true)
      .order("created_at", { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoaded(true);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function aiDraft() {
    if (!aiPrompt.trim()) return;
    setGenerating(true); setErr(null);
    try {
      const r: any = await genFn({ data: { prompt: aiPrompt } });
      setTitle(r.title || ""); setBody(r.body || ""); setSummary(r.summary || "");
    } catch (e: any) { setErr(e.message); }
    finally { setGenerating(false); }
  }

  async function autoSummary() {
    if (!title.trim() || !body.trim()) return;
    setGenerating(true);
    try { const r: any = await sumFn({ data: { title, body } }); setSummary(r.summary); }
    catch (e: any) { setErr(e.message); }
    finally { setGenerating(false); }
  }

  async function submit() {
    if (!user) return;
    setErr(null);
    if (!title.trim() || !body.trim()) return setErr("Title and body required.");
    let finalSummary = summary;
    if (!finalSummary.trim()) {
      try { const r: any = await sumFn({ data: { title, body } }); finalSummary = r.summary; } catch {}
    }
    const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id, title: title.trim(), body: body.trim(), published: true, slug, summary: finalSummary,
    } as any);
    if (error) return setErr(error.message);
    setTitle(""); setBody(""); setSummary(""); setAiPrompt(""); setComposing(false);
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
            <Link to="/support" className="rounded-full px-3 py-1.5 hover:bg-accent">Support</Link>
            <Link to={user ? "/app" : "/login"} className="ml-2 rounded-full bg-primary px-4 py-1.5 text-primary-foreground hover:opacity-90">
              {user ? "Open app" : "Sign in"}
            </Link>
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
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                  <label className="text-xs font-medium text-primary flex items-center gap-1"><Wand2 className="h-3 w-3" /> Generate with AI</label>
                  <div className="flex gap-2">
                    <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="What's the update about? e.g. 'Calendar got drag-and-drop'"
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                    <button onClick={aiDraft} disabled={generating || !aiPrompt.trim()}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Draft
                    </button>
                  </div>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (auto-generated if blank)"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your update (markdown supported)..." rows={8}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                {err && <p className="text-xs text-destructive">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={submit} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Publish</button>
                  <button onClick={autoSummary} disabled={generating} className="rounded-full border border-border bg-card px-4 py-2 text-sm">Auto-summary</button>
                  <button onClick={() => { setComposing(false); setErr(null); }} className="rounded-full border border-border bg-card px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 space-y-6">
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <AnimatePresence>
              {posts.map((p, i) => (
                <motion.article
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="rounded-3xl glass p-7"
                >
                  <Link to="/updates/$slug" params={{ slug: p.slug }} className="block group">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-semibold group-hover:text-primary transition-colors">{p.title}</h2>
                    {p.summary && <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>}
                    <span className="mt-3 inline-block text-xs text-primary">Read more →</span>
                  </Link>
                </motion.article>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-16 flex justify-center gap-3">
          {user ? (
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out ({user.email})
            </button>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-accent">
              <LogIn className="h-3.5 w-3.5" /> Sign in
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
