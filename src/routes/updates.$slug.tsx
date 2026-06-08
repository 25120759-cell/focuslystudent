import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/updates/$slug")({
  ssr: false,
  component: PostPage,
});

interface Post { id: string; title: string; body: string; created_at: string; summary: string | null; cover_url: string | null }

function PostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false); setErr(null);
    supabase
      .from("posts")
      .select("id,title,body,created_at,summary,cover_url")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setPost((data as Post) ?? null);
        setLoaded(true);
      });
  }, [slug]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="h-72 w-full animate-pulse rounded-3xl bg-muted/40" />
          <div className="mt-8 h-10 w-3/4 animate-pulse rounded-md bg-muted/40" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-muted/30" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl font-semibold">Post not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {err || "It may have been removed, or the link is mistyped."}
          </p>
          <Link to="/updates" className="mt-6 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to all updates
          </Link>
        </div>
      </div>
    );
  }

  const minutes = Math.max(1, Math.round(post.body.split(/\s+/).length / 220));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <motion.article
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl px-6 py-12"
      >
        <Link to="/updates" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All updates
        </Link>

        {post.cover_url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-3xl border border-border"
          >
            <img
              src={post.cover_url}
              alt={post.title}
              width={1024}
              height={512}
              className="aspect-[2/1] w-full object-cover"
            />
          </motion.div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
            <time>{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
          </span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {minutes} min read</span>
        </div>

        <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-tight">{post.title}</h1>
        {post.summary && <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{post.summary}</p>}

        <div className="prose prose-base md:prose-lg mt-10 max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-8">
          <Link to="/updates" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-accent">
            <ArrowLeft className="h-3.5 w-3.5" /> More updates
          </Link>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
            target="_blank" rel="noreferrer"
            className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
          >
            Share on X
          </a>
        </div>
      </motion.article>
    </div>
  );
}
