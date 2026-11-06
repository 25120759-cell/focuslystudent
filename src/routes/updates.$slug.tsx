import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/updates/$slug")({
  ssr: false,
  component: PostPage,
  head: ({ params }) => {
    const url = `https://cognistudent.lovable.app/updates/${params.slug}`;
    const title = `${params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — Cogni Updates`;
    const description = "Read the latest Cogni release note: what changed, what's new, and what's next for the study app.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            url,
            publisher: { "@type": "Organization", name: "Cogni" },
          }),
        },
      ],
    };
  },
});

interface Post { id: string; title: string; body: string; created_at: string; summary: string | null; cover_url: string | null }

function PostPage() {
  const { slug } = Route.useParams();
  const reduce = useReducedMotion();
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false); setErr(null);
    (supabase as any)
      .from("posts")
      .select("id,title,body,created_at,summary,cover_url")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (error) setErr(error.message);
        setPost((data as Post) ?? null);
        setLoaded(true);
      });
  }, [slug]);

  if (!loaded) return <PublicPage label="Updates" title="Cogni journal." description="Releases and refinements from Cogni For Students."><div aria-label="Loading update" className="mx-auto max-w-3xl py-12"><div className="skeleton h-72 rounded-md" /><div className="skeleton mt-8 h-5 w-3/4 rounded" /><div className="skeleton mt-4 h-5 w-full rounded" /></div></PublicPage>;
  if (!post) return <PublicPage label="Updates" title={err ? "Unable to load this update." : "Update not found."} description={err ? "Please try again in a moment." : "This update may have been removed, or the link may be incorrect."}><Button asChild variant="outline" className="mt-10"><Link to="/updates"><ArrowLeft />All updates</Link></Button></PublicPage>;
  const minutes = Math.max(1, Math.round(post.body.split(/\s+/).length / 220));
  return <PublicPage label="Release journal" title={post.title} description={post.summary || "The latest from Cogni For Students."}>
    <motion.article initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="pt-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <Button asChild variant="ghost" className="px-0"><Link to="/updates"><ArrowLeft />All updates</Link></Button>
        <div className="flex flex-wrap gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Calendar className="size-3.5" /><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time></span><span className="flex items-center gap-2"><Clock className="size-3.5" />{minutes} min read</span></div>
      </div>
      {post.cover_url && <img src={post.cover_url} alt={post.title} width={1024} height={512} className="mb-12 aspect-[2/1] w-full rounded-md object-cover" />}
      <div className="public-article mx-auto max-w-3xl"><ReactMarkdown>{post.body}</ReactMarkdown></div>
      <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <Button asChild variant="outline"><Link to="/updates"><ArrowLeft />More updates</Link></Button>
        <Button asChild><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://cognistudent.lovable.app/updates/${slug}`)}`} target="_blank" rel="noreferrer">Share on X</a></Button>
      </div>
    </motion.article>
  </PublicPage>;
}
