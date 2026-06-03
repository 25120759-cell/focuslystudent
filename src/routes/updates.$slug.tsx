import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/updates/$slug")({
  ssr: false,
  component: PostPage,
});

interface Post { id: string; title: string; body: string; created_at: string; summary: string | null }

function PostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("posts").select("id,title,body,created_at,summary").eq("slug", slug).eq("published", true).maybeSingle()
      .then(({ data }) => { setPost((data as Post) ?? null); setLoaded(true); });
  }, [slug]);

  if (loaded && !post) return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="font-display text-3xl">Post not found</h1>
        <Link to="/updates" className="mt-4 inline-block text-primary underline">← All updates</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/landing" className="font-display text-xl font-semibold tracking-tight">Focusly</Link>
          <Link to="/updates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> All updates
          </Link>
        </div>
      </header>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl px-6 py-16"
      >
        {post && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <time>{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
            </div>
            <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">{post.title}</h1>
            {post.summary && <p className="mt-4 text-lg text-muted-foreground">{post.summary}</p>}
            <div className="prose prose-sm md:prose-base mt-8 max-w-none dark:prose-invert">
              <ReactMarkdown>{post.body}</ReactMarkdown>
            </div>
          </>
        )}
        {!loaded && <p className="text-muted-foreground">Loading...</p>}
      </motion.article>
    </div>
  );
}
