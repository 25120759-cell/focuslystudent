import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Plus, Wand2, Loader2, ImageIcon, Trash2, ArrowUpRight, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { adminGeneratePost, generatePostSummary, adminGeneratePostImage, adminDeletePost } from "@/lib/ai.functions";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/updates")({
  ssr: false,
  component: UpdatesPage,
  head: () => ({
    meta: [
      { title: "Updates — Cogni" },
      { name: "description", content: "Release notes and product updates for Cogni." },
      { property: "og:title", content: "Updates — Cogni" },
      { property: "og:description", content: "Release notes and product updates for Cogni." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/updates" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Updates — Cogni" },
      { name: "twitter:description", content: "Release notes and product updates for Cogni." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/updates" }],
  }),
});

interface Post { id: string; title: string; body: string; created_at: string; slug: string; summary: string | null; cover_url: string | null }

function UpdatesPage() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isAdmin } = useAuth();
  const reduce = useReducedMotion();
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const genFn = useServerFn(adminGeneratePost);
  const sumFn = useServerFn(generatePostSummary);
  const imgFn = useServerFn(adminGeneratePostImage);
  const delFn = useServerFn(adminDeletePost);

  async function load() {
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id,title,body,created_at,slug,summary,cover_url")
      .eq("published", true)
      .order("created_at", { ascending: false });
    setLoadError(Boolean(error));
    setPosts((data as Post[]) ?? []);
    setLoaded(true);
  }

  useEffect(() => { load(); }, [user?.id]);

  if (path !== "/updates") return <Outlet />;

  async function aiDraft() {
    if (!aiPrompt.trim()) return;
    setGenerating(true); setErr(null);
    try {
      const r: any = await genFn({ data: { prompt: aiPrompt } });
      setTitle(r.title || ""); setBody(r.body || ""); setSummary(r.summary || "");
      if (!imagePrompt) setImagePrompt(r.title || aiPrompt);
    } catch (e: any) { setErr(e.message); }
    finally { setGenerating(false); }
  }

  async function genImage() {
    const prompt = imagePrompt.trim() || title.trim() || aiPrompt.trim();
    if (!prompt) return setErr("Add a title or image prompt first.");
    setGenImg(true); setErr(null);
    try {
      const r: any = await imgFn({ data: { prompt, title: title.trim() || prompt } });
      setCoverUrl(r.url);
    } catch (e: any) { setErr(e.message); }
    finally { setGenImg(false); }
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
      author_id: user.id, title: title.trim(), body: body.trim(), published: true, slug, summary: finalSummary, cover_url: coverUrl || null,
    } as any);
    if (error) return setErr(error.message);
    setTitle(""); setBody(""); setSummary(""); setAiPrompt(""); setImagePrompt(""); setCoverUrl(""); setComposing(false);
    load();
  }

  async function removePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await delFn({ data: { id } });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  }

  const filtered = posts.filter((post) => `${post.title} ${post.summary || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <PublicPage label="Updates" title="Cogni updates." description="The latest releases, refinements, and news from Cogni For Students.">
    <div className="grid gap-10 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
      <aside className="space-y-6">
        <div><p className="workspace-kicker">Release journal</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">A clearer place to study. A little better with every release.</p></div>
        <label className="flex items-center gap-2 border-b border-border py-3"><Search className="size-4 shrink-0 text-muted-foreground" /><input aria-label="Search updates" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search updates" className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
        <Button asChild variant="ghost" className="justify-start px-0"><Link to="/support">Visit support <ArrowUpRight /></Link></Button>
      </aside>
      <section className="min-w-0" aria-label="Release notes">
        {isAdmin && (
          <div className="mt-8">
            {!composing ? (
              <Button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Plus className="h-4 w-4" /> New post
              </Button>
            ) : (
              <div className="border-y border-border py-8 space-y-3">
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                  <label className="text-xs font-medium text-primary flex items-center gap-1"><Wand2 className="h-3 w-3" /> Draft with AI</label>
                  <div className="flex gap-2">
                    <input aria-label="AI draft prompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="What's the update about?"
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <Button onClick={aiDraft} disabled={generating || !aiPrompt.trim()}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Draft
                    </Button>
                  </div>
                </div>

                <input aria-label="Post title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <input aria-label="Post summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (auto-generated if blank)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                  <label className="text-xs font-medium text-primary flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Cover image (AI)</label>
                  <div className="flex gap-2">
                    <input aria-label="Cover image prompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="e.g. abstract calendar grid, gradient palette"
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <Button onClick={genImage} disabled={genImg}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">
                      {genImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} Generate
                    </Button>
                  </div>
                  {coverUrl && (
                    <img src={coverUrl} alt="" loading="lazy" width={1024} height={576} className="aspect-video w-full rounded-lg object-cover" />
                  )}
                </div>

                <textarea aria-label="Update body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your update (markdown supported)..." rows={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                {err && <p className="text-xs text-destructive">{err}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={submit} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Publish</Button>
                  <Button onClick={autoSummary} disabled={generating} className="rounded-md border border-border bg-card px-4 py-2 text-sm">Auto-summary</Button>
                  <Button onClick={() => { setComposing(false); setErr(null); }} className="rounded-md border border-border bg-card px-4 py-2 text-sm">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}


        <div aria-live="polite">
          {!loaded ? <div className="space-y-10" aria-label="Loading updates">{[0,1,2].map((i) => <div key={i} className="border-b border-border pb-8"><div className="skeleton h-4 w-32 rounded" /><div className="skeleton mt-5 h-9 w-3/4 rounded" /><div className="skeleton mt-4 h-4 w-full rounded" /></div>)}</div>
          : loadError ? <div className="py-12"><h2 className="font-display text-2xl">Updates couldn't load.</h2><Button variant="outline" className="mt-4" onClick={() => { setLoaded(false); load(); }}>Try again</Button></div>
          : filtered.length === 0 ? <div className="py-16"><h2 className="font-display text-3xl">{search ? "No matching updates." : "A new chapter is coming."}</h2><p className="mt-3 text-muted-foreground">{search ? "Try another search." : "Our next release note will appear here."}</p>{search && <Button variant="link" className="mt-4 px-0" onClick={() => setSearch("")}>Clear search</Button>}</div>
          : <AnimatePresence>{filtered.map((post) => <motion.article key={post.id} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="group border-b border-border py-8 first:pt-0">
            <div className="flex items-center justify-between gap-4"><time dateTime={post.created_at} className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="size-3.5" />{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
              {isAdmin && <Button variant="ghost" size="icon" aria-label={`Delete ${post.title}`} title="Delete post" onClick={() => removePost(post.id, post.title)}><Trash2 /></Button>}
            </div>
            <Link to="/updates/$slug" params={{ slug: post.slug }} className="mt-5 block focus-visible:outline-ring">
              {post.cover_url && <img src={post.cover_url} alt={post.title} loading="lazy" width={1024} height={512} className="mb-6 aspect-[2/1] w-full rounded-md object-cover" />}
              <h2 className="flex items-start justify-between gap-5 font-display text-3xl font-medium leading-tight sm:text-4xl"><span className="min-w-0 break-words">{post.title}</span><ArrowUpRight className="mt-1 size-6 shrink-0 transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:translate-x-1" /></h2>
              {post.summary && <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{post.summary}</p>}
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">Read update <ArrowRight className="size-4" /></span>
            </Link>
          </motion.article>)}</AnimatePresence>}
        </div>
      </section>
    </div>
  </PublicPage>;
}
