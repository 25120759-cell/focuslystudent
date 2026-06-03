import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send, MessageCircle, BookOpen, Clock, Trophy, Settings, Brain, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { aiSupport } from "@/lib/ai.functions";

export const Route = createFileRoute("/support")({
  ssr: false,
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support — Focusly" },
      { name: "description", content: "Help & docs for Focusly: study clock, Toddle sync, assignments, AI assistant, rewards, and settings." },
    ],
  }),
});

const SECTIONS = [
  { icon: Clock, title: "Getting started", body: "Sign in with Google or email. The dashboard is the Study Clock by default — open the bottom pill to switch to Timetable, Toddle, or Files." },
  { icon: Clock, title: "Study Clock", body: "A Pomodoro timer with offline chimes and a fullscreen distraction-free mode. Customize study/break minutes in Settings." },
  { icon: BookOpen, title: "Toddle sync", body: "Open Toddle from the bottom pill, link your account, then pick a subject. Hit 'Analyse from Toddle' to get an AI action plan." },
  { icon: Brain, title: "AI assistant & credits", body: "Open the floating ✦ button or press ⌘K. Free plan: 10 credits/day, 100/month. Pro: 100/day, 1000/month. Max: 500/day, 10000/month. The assistant can create, update, complete, and delete tasks for you." },
  { icon: BookOpen, title: "Assignments", body: "Type a task naturally — 'read Hatchet ch 8 by Tue 9pm' — and Focusly parses the date. Click any assignment for its detail page with subtasks, notes, and edit/delete." },
  { icon: Trophy, title: "Rewards", body: "Complete assignments to earn points (+3 each). Spend them on real vouchers (Starbucks, McDonald's, Amazon). Late submissions cost -5." },
  { icon: Settings, title: "Settings", body: "Theme (light/dark), font size, language (English/Mandarin), and AI personality. All settings persist across refresh." },
  { icon: LifeBuoy, title: "Keyboard shortcuts", body: "⌘K — open AI assistant. Enter — submit. Esc — close panels." },
];

interface ChatMsg { role: "user" | "assistant"; content: string }

function SupportPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const supportFn = useServerFn(aiSupport);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    if (!user) { setErr("Please sign in to use support chat."); return; }
    const msg = input.trim();
    setInput(""); setErr(null);
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const r: any = await supportFn({ data: { history: messages.slice(-10), message: msg } });
      setMessages([...next, { role: "assistant", content: r.text || "..." }]);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/landing" className="font-display text-xl font-semibold tracking-tight">Focusly</Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/landing" className="rounded-full px-3 py-1.5 hover:bg-accent">Home</Link>
            <Link to="/updates" className="rounded-full px-3 py-1.5 hover:bg-accent">Updates</Link>
            <Link to="/plans" className="rounded-full px-3 py-1.5 hover:bg-accent">Plans</Link>
            <Link to={user ? "/app" : "/login"} className="ml-2 rounded-full bg-primary px-4 py-1.5 text-primary-foreground hover:opacity-90">
              {user ? "Open app" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Support</span>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-semibold tracking-tight">Focusly docs</h1>
        <p className="mt-3 text-muted-foreground">Browse the guides below, or chat with the free Support assistant — bottom-right.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                className="rounded-3xl glass p-5"
              >
                <Icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Floating support chat */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-primary p-4 text-primary-foreground shadow-lg"
      >
        <MessageCircle className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-3xl glass border border-border shadow-2xl flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display font-semibold text-sm flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /> Focusly Support</span>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {messages.length === 0 && <p className="text-muted-foreground text-xs">Ask anything about how Focusly works. Off-topic questions will be redirected.</p>}
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
              {err && <div className="text-xs text-destructive">{err}</div>}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border p-2 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={user ? "Ask about Focusly..." : "Sign in to chat"} disabled={!user || loading}
                className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50" />
              <button onClick={send} disabled={!user || loading}
                className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
