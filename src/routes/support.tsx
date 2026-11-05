import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send, MessageCircle, BookOpen, Clock, Trophy, Settings, Brain, X, Bug, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { aiCredits, aiSupport } from "@/lib/ai.functions";


export const Route = createFileRoute("/support")({
  ssr: false,
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support — Cogni" },
      { name: "description", content: "Help & docs for Cogni: study clock, assignments, AI assistant, rewards, cards, social, and settings." },
      { property: "og:title", content: "Support — Cogni" },
      { property: "og:description", content: "Guides for the study clock, assignments, AI assistant, cards, social, and settings — plus a bug report link." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/support" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Support — Cogni" },
      { name: "twitter:description", content: "Guides for the study clock, assignments, AI assistant, cards, social, and settings." },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/support" }],
  }),
});

const SECTIONS = [
  { icon: Clock, title: "Getting started", body: "Sign in with Google or email. The dashboard is the Study Clock by default — open the bottom pill to switch to Timetable or Files." },
  { icon: Clock, title: "Study Clock", body: "A Pomodoro timer with offline chimes and a fullscreen distraction-free mode. Customize study/break minutes in Settings." },
  { icon: Brain, title: "AI assistant & credits", body: "Open the floating ✦ button or press ⌘K. Free plan: 10 credits/day, 100/month. Pro: 100/day, 1000/month. Max: 500/day, 10000/month. The assistant can create, update, complete, and delete tasks for you." },
  { icon: BookOpen, title: "Assignments", body: "Type a task naturally — 'read Hatchet ch 8 by Tue 9pm' — and Cogni parses the date. Click any assignment for its detail page with subtasks, notes, and edit/delete." },
  { icon: MessageCircle, title: "Social & Cards", body: "Post on the Social feed, message classmates, earn coins, open card packs, and trade with other users." },
  { icon: Trophy, title: "Rewards", body: "Complete assignments to earn points (+3 each). Spend them on real vouchers (Starbucks, McDonald's, Amazon). Late submissions cost -5." },
  { icon: Settings, title: "Settings", body: "Theme (light/dark), font size, language (English/Mandarin), and AI personality. All settings persist across refresh." },
  { icon: LifeBuoy, title: "Keyboard shortcuts", body: "⌘K — open AI assistant. Enter — submit. Esc — close panels." },
];

interface ChatMsg { role: "user" | "assistant"; content: string }

function SupportPage() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const supportFn = useServerFn(aiSupport);
  const creditsFn = useServerFn(aiCredits);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, loading]);
  useEffect(() => {
    if (!user) return;
    creditsFn().then((r: any) => setOutOfCredits(r.dayUsed >= r.dayLimit || r.monthUsed >= r.monthLimit)).catch(() => {});
  }, [user]);

  async function send() {
    if (!input.trim() || loading) return;
    if (!user) { setErr("Please sign in to use support chat."); return; }
    if (outOfCredits) { setErr("AI support is paused because your AI credits are out."); return; }
    const msg = input.trim();
    setInput(""); setErr(null);
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const r: any = await supportFn({ data: { history: messages.slice(-10), message: msg } });
      setMessages([...next, { role: "assistant", content: r.text || "..." }]);
      creditsFn().then((c: any) => setOutOfCredits(c.dayUsed >= c.dayLimit || c.monthUsed >= c.monthLimit)).catch(() => {});
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <PublicPage label="Support" title="A little clarity." description="Help with your study day, your account, and everything in between.">
      <div className="grid items-start gap-10 py-10 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28">
          <label htmlFor="guide-search" className="mb-3 block text-sm font-medium">Find an answer</label>
          <input id="guide-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides…" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm" />
          <div className="mt-7 border-t border-border pt-6">
            <h2 className="font-display text-xl">Still need a hand?</h2>
            <Button onClick={() => setOpen(true)} variant="outline" className="mt-4 w-full"><MessageCircle />Ask Cogni Support</Button>
            <Button asChild variant="ghost" className="mt-2 h-auto w-full justify-start whitespace-normal py-3"><a href="https://luraapps.base44.app/feedback" target="_blank" rel="noreferrer"><Bug />Report a glitch<ExternalLink /></a></Button>
          </div>
        </aside>
        <section aria-label="Support guides" className="min-w-0">
          {SECTIONS.filter(s => `${s.title} ${s.body}`.toLowerCase().includes(search.toLowerCase())).map(s => {
            const Icon = s.icon;
            return <details key={s.title} className="group border-b border-border py-6">
              <summary className="flex cursor-pointer list-none items-center gap-4"><Icon className="h-5 w-5 shrink-0 text-primary" /><h2 className="flex-1 font-display text-xl">{s.title}</h2><span aria-hidden className="text-xl text-muted-foreground group-open:rotate-180">⌄</span></summary>
              <p className="mt-4 pl-9 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </details>;
          })}
          {!SECTIONS.some(s => `${s.title} ${s.body}`.toLowerCase().includes(search.toLowerCase())) && <p role="status" className="py-8 text-sm text-muted-foreground">No guides match “{search}”. Try another search.</p>}
        </section>
      </div>

      {/* Floating support chat */}
      <Button
        aria-label="Open Cogni Support"
        title="Open Cogni Support"
        onClick={() => setOpen(true)}
        size="icon" className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-lg glass border border-border shadow-2xl flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display font-semibold text-sm flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /> Cogni Support</span>
              <Button variant="ghost" size="icon" aria-label="Close Cogni Support" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {messages.length === 0 && <p className="text-muted-foreground text-xs">Ask anything about how Cogni works. Off-topic questions will be redirected.</p>}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"} max-w-[85%] rounded-2xl px-3 py-2`}
                >
                  {m.role === "assistant" ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div> : m.content}
                </motion.div>
              ))}
              {loading && <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>}
              {err && <div role="alert" className="text-xs text-destructive">{err}</div>}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border p-2 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                aria-label="Support message" placeholder={outOfCredits ? "AI credits are out" : user ? "Ask about Cogni..." : "Sign in to chat"} disabled={!user || loading || outOfCredits}
                className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50" />
              <Button aria-label="Send support message" onClick={send} disabled={!user || loading || outOfCredits || !input.trim()}
                className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicPage>
  );
}
