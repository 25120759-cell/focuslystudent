import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import toastImg from "@/assets/update-toast.jpg";

const STORAGE_KEY = "focusly-seen-posts-v1";
const HIDDEN_PATHS = ["/updates", "/landing", "/plans", "/login", "/signup", "/support", "/engagement"];

interface LatestPost { id: string; title: string; slug: string; summary: string | null; created_at: string; cover_url: string | null }

export function NewPostToast() {
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [post, setPost] = useState<LatestPost | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || HIDDEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      setShow(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const { data } = await (supabase as any)
        .from("posts").select("id, title, slug, summary, created_at, cover_url")
        .eq("published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled || !data) return;
      const seen: string[] = (() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
      })();
      const days = (Date.now() - new Date(data.created_at).getTime()) / 86400000;
      if (days > 14) return;
      if (seen.includes(data.id)) return;
      setPost(data as LatestPost);
      // small delay so it doesn't fight page load
      timer = setTimeout(() => { if (!cancelled) setShow(true); }, 1200);
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [user, path]);

  function markSeen() {
    if (post) {
      try {
        const seen: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (!seen.includes(post.id)) seen.unshift(post.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seen.slice(0, 30)));
      } catch {}
    }
  }

  function dismiss() {
    markSeen();
    setShow(false);
  }

  function openPost() {
    if (!post) return;
    markSeen();
    setShow(false);
    navigate({ to: "/updates/$slug", params: { slug: post.slug } });
  }

  return (
    <AnimatePresence>
      {show && post && (
        <motion.div
          initial={{ opacity: 0, x: -40, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.9 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          className="fixed bottom-6 left-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="relative h-28 w-full overflow-hidden">
            <img src={post.cover_url || toastImg} alt={`Cover artwork for ${post.title}`} loading="lazy" width={512} height={256} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <Sparkles className="h-3 w-3" /> New update
            </span>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4">
            <h3 className="font-display text-sm font-semibold leading-snug line-clamp-2">{post.title}</h3>
            {post.summary && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.summary}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={openPost}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Learn more <ArrowRight className="h-3 w-3" />
              </button>
              <button onClick={dismiss} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
