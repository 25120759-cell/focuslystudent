import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Send, MessageCircle, Trash2, Search, ArrowLeft, Users } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  listFeed, createFeedPost, deleteFeedPost,
  listConversations, openConversation, listMessages, sendMessage, searchUsers,
} from "@/lib/social.functions";

export const Route = createFileRoute("/_authenticated/social")({
  component: SocialPage,
  head: () => ({ meta: [{ title: "Social — Focusly" }] }),
});

interface FeedPost { id: string; user_id: string; body: string; like_count: number; created_at: string; author: string }
interface Conv { id: string; peer_id: string; peer_name: string; last_message_at: string }
interface Msg { id: string; sender_id: string; body: string; created_at: string }

function SocialPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"feed" | "dms">("feed");

  return (
    <div className="space-y-6 max-w-3xl mx-auto rise-in">
      <PageHeader
        eyebrow="The common room"
        icon={Users}
        title="Social"
        description="Share a win, ask for help, or message a classmate directly."
        actions={
          <div className="inline-flex rounded-full border border-border/70 p-1 text-xs">
            <button onClick={() => setTab("feed")} className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${tab === "feed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Feed</button>
            <button onClick={() => setTab("dms")} className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${tab === "dms" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Messages</button>
          </div>
        }
      />
      {tab === "feed" ? <Feed userId={user?.id ?? null} /> : <DMs userId={user?.id ?? null} />}
    </div>
  );
}

function Feed({ userId }: { userId: string | null }) {
  const listFn = useServerFn(listFeed);
  const createFn = useServerFn(createFeedPost);
  const delFn = useServerFn(deleteFeedPost);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r: any = await listFn(); setPosts(r.posts);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    try { await createFn({ data: { body: body.trim() } }); setBody(""); await load(); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className="rounded-3xl glass p-4">
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          maxLength={2000} placeholder="Share a study win, ask for tips..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{body.length}/2000</span>
          <motion.button whileTap={{ scale: 0.95 }} onClick={submit} disabled={loading || !body.trim()}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
            Post
          </motion.button>
        </div>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {posts.map((p) => (
            <motion.article key={p.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
              className="rounded-3xl glass p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{p.author}</span>
                <span>{new Date(p.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
              {p.user_id === userId && (
                <button onClick={async () => { await delFn({ data: { id: p.id } }); load(); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="inline h-3 w-3" /> Delete
                </button>
              )}
            </motion.article>
          ))}
        </AnimatePresence>
        {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No posts yet — be the first!</p>}
      </div>
    </>
  );
}

function DMs({ userId }: { userId: string | null }) {
  const listConvFn = useServerFn(listConversations);
  const openFn = useServerFn(openConversation);
  const listMsgFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendMessage);
  const searchFn = useServerFn(searchUsers);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; display_name: string | null }[]>([]);

  async function loadConvs() { const r: any = await listConvFn(); setConversations(r.conversations); }
  useEffect(() => { loadConvs(); }, []);

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    listMsgFn({ data: { conversation_id: active.id } }).then((r: any) => { if (!cancel) setMessages(r.messages); });
    const channel = supabase
      .channel(`conv-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${active.id}` },
        (payload: any) => { setMessages((m) => [...m, payload.new]); })
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(channel); };
  }, [active?.id, listMsgFn]);

  async function startConv(peerId: string) {
    const r: any = await openFn({ data: { peer_id: peerId } });
    await loadConvs();
    const c = (await listConvFn() as any).conversations.find((x: Conv) => x.id === r.id);
    if (c) setActive(c);
    setQ(""); setResults([]);
  }

  async function send() {
    if (!text.trim() || !active) return;
    const body = text.trim();
    setText("");
    await sendFn({ data: { conversation_id: active.id, body } });
  }

  async function doSearch() {
    if (!q.trim()) return setResults([]);
    const r: any = await searchFn({ data: { q: q.trim() } });
    setResults(r.users);
  }

  if (active) {
    return (
      <div className="rounded-3xl glass flex flex-col h-[60vh] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <button onClick={() => setActive(null)} className="rounded-full p-1 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></button>
          <span className="font-medium text-sm">{active.peer_name}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.body}
              </motion.div>
            ))}
          </AnimatePresence>
          {messages.length === 0 && <p className="text-center text-xs text-muted-foreground">No messages yet. Say hi 👋</p>}
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…" className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm" />
          <button onClick={send} className="rounded-full bg-primary p-2 text-primary-foreground"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-4">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" /> Find someone</label>
        <div className="mt-2 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search by display name" className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm" />
          <button onClick={doSearch} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Search</button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map((u) => (
              <button key={u.id} onClick={() => startConv(u.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
                <span>{u.display_name ?? "Student"}</span>
                <MessageCircle className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {conversations.map((c) => (
          <button key={c.id} onClick={() => setActive(c)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm hover:bg-accent">
            <span className="font-medium">{c.peer_name}</span>
            <span className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString()}</span>
          </button>
        ))}
        {conversations.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No conversations yet — search for someone above.</p>}
      </div>
    </div>
  );
}
