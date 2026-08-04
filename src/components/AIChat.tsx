import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, X, ListTodo, Lock, Plus, MessageSquare, Trash2, ImagePlus, Crown, PanelLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { aiChat, aiCredits } from "@/lib/ai.functions";
import {
  listThreads,
  createThread,
  deleteThread,
  listThreadMessages,
  appendThreadMessage,
  signChatImage,
  type ThreadRow,
} from "@/lib/chat.functions";
import { AICreditCard } from "./AICreditCard";
import { FocuslyAIWordmark } from "./FocuslyAILogo";
import { getAgentController, type AgentAction } from "./AgentCursor";

const ROUTES = ["/app", "/assignments", "/calender", "/social", "/cards", "/support"] as const;

type Msg = { id: string; role: "user" | "assistant"; content: string; imagePath?: string | null };

export function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ dayUsed: number; monthUsed: number; dayLimit: number; monthLimit: number; plan: string; capabilities?: { allow_vision?: boolean } } | null>(null);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [attachment, setAttachment] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chatFn = useServerFn(aiChat);
  const creditsFn = useServerFn(aiCredits);
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const deleteThreadFn = useServerFn(deleteThread);
  const listMsgsFn = useServerFn(listThreadMessages);
  const appendMsgFn = useServerFn(appendThreadMessage);
  const signFn = useServerFn(signChatImage);

  const canVision = !!credits?.capabilities?.allow_vision;
  const outOfCredits = !!credits && (credits.dayUsed >= credits.dayLimit || credits.monthUsed >= credits.monthLimit);

  /* ---------------- data loading ---------------- */

  const refreshCredits = useCallback(() => {
    creditsFn().then((c) => setCredits(c as any)).catch(() => {});
  }, [creditsFn]);

  const loadThreads = useCallback(async () => {
    const r = await listThreadsFn();
    setThreads(r.threads);
    return r.threads;
  }, [listThreadsFn]);

  const openThread = useCallback(
    async (id: string) => {
      setThreadId(id);
      setThreadsOpen(false);
      setHistoryLoading(true);
      try {
        const r = await listMsgsFn({ data: { threadId: id } });
        setMessages(r.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, imagePath: m.image_url })));
      } catch (e: any) {
        setError(e.message ?? "Could not load that chat.");
      } finally {
        setHistoryLoading(false);
      }
    },
    [listMsgsFn],
  );

  const startNewChat = useCallback(async () => {
    try {
      const r = await createThreadFn({ data: {} });
      setThreads((t) => [r.thread, ...t]);
      setThreadId(r.thread.id);
      setMessages([]);
      setThreadsOpen(false);
      setAttachment(null);
      requestAnimationFrame(() => inputRef.current?.focus());
      return r.thread.id;
    } catch (e: any) {
      setError(e.message ?? "Could not start a new chat.");
      return null;
    }
  }, [createThreadFn]);

  // Bootstrap when the panel opens
  useEffect(() => {
    if (!open || !user) return;
    refreshCredits();
    let cancelled = false;
    (async () => {
      try {
        const t = await loadThreads();
        if (cancelled) return;
        if (!threadId) {
          if (t.length) await openThread(t[0]!.id);
          else await startNewChat();
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Could not load your chats.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  // Resolve signed URLs for stored images
  useEffect(() => {
    const missing = messages.map((m) => m.imagePath).filter((p): p is string => !!p && !imageUrls[p]);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      for (const path of Array.from(new Set(missing))) {
        try {
          const r = await signFn({ data: { path } });
          if (!cancelled) setImageUrls((m) => ({ ...m, [path]: r.url }));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  /* ---------------- actions ---------------- */

  function buildContext() {
    const recent = state.assignments.slice(0, 8).map((a) => `- [${a.id}] ${a.title} (${a.status}, due ${a.due})`).join("\n");
    return `Assignments (id, title, status, due):\n${recent || "(none)"}\nVouchers: starbucks-50, mcd-100, amazon-200`;
  }

  function applyAction(action: { name: string; args: any }): string {
    const { name, args } = action;
    try {
      if (name === "create_assignment" && args.title) {
        dispatch({ type: "ADD_ASSIGNMENT", assignment: { id: `a-${Date.now()}`, title: args.title, description: args.description || "", due: args.due || new Date(Date.now() + 86400000).toISOString(), status: "Opened", resources: [] } });
        return `✅ Added **${args.title}**.`;
      }
      if (name === "update_assignment" && args.id) {
        dispatch({ type: "UPDATE_ASSIGNMENT", id: args.id, patch: args });
        return `✏️ Updated assignment.`;
      }
      if (name === "delete_assignment" && args.id) {
        dispatch({ type: "DELETE_ASSIGNMENT", id: args.id });
        return `🗑️ Deleted assignment.`;
      }
      if (name === "complete_assignment" && args.id) {
        dispatch({ type: "COMPLETE_ASSIGNMENT", id: args.id });
        return `✅ Marked complete.`;
      }
      if (name === "add_subtask" && args.assignment_id && args.title) {
        const a = state.assignments.find((x) => x.id === args.assignment_id);
        const sub = { id: `s-${Date.now()}`, title: args.title, done: false };
        const subs = [...(a?.subtasks ?? []), sub];
        dispatch({ type: "UPDATE_ASSIGNMENT", id: args.assignment_id, patch: { subtasks: subs } });
        return `➕ Added subtask "${args.title}".`;
      }
      if (name === "create_action_plan" && args.title) {
        const id = `plan-${Date.now()}`;
        dispatch({ type: "ADD_ACTION_PLAN", plan: { id, title: args.title, steps: args.steps || [] } });
        return `📋 Created plan **${args.title}**.`;
      }
      if (name === "start_timer") {
        const m = args.minutes || state.settings.studyDuration;
        dispatch({ type: "TIMER_SET", patch: { timeLeft: m * 60, isRunning: true, isPaused: false, isBreak: false } });
        return `⏱️ Started ${m}-minute timer.`;
      }
      if (name === "stop_timer") {
        dispatch({ type: "TIMER_SET", patch: { isRunning: false, isPaused: false } });
        return `⏸️ Timer stopped.`;
      }
      if (name === "set_setting" && args.key && args.value !== undefined) {
        dispatch({ type: "PATCH_SETTINGS", patch: { [args.key]: args.value } as any });
        return `⚙️ Set ${args.key} to ${args.value}.`;
      }
      if (name === "navigate" && args.route && (ROUTES as readonly string[]).includes(args.route)) {
        navigate({ to: args.route });
        return `➡️ Navigated to ${args.route}.`;
      }
      const agent = getAgentController();
      if (agent) {
        agent.setNavigate((path: string) => navigate({ to: path as any }));
        if (name === "agent_click") { agent.enqueue([{ type: "click", selector: args.selector, label: args.label } as AgentAction]); return `🖱️ Clicking ${args.label ?? args.selector}.`; }
        if (name === "agent_type") { agent.enqueue([{ type: "type", selector: args.selector, text: args.text, label: args.label } as AgentAction]); return `⌨️ Typing into ${args.label ?? args.selector}.`; }
        if (name === "agent_hover") { agent.enqueue([{ type: "hover", selector: args.selector, label: args.label } as AgentAction]); return `👉 Hovering ${args.label ?? args.selector}.`; }
        if (name === "agent_navigate" && args.route) { agent.enqueue([{ type: "navigate", route: args.route, label: args.label } as AgentAction]); return `➡️ ${args.label ?? "Going to " + args.route}.`; }
        if (name === "agent_say" && args.text) { agent.enqueue([{ type: "say", text: args.text } as AgentAction]); return ""; }
      }
    } catch (e: any) {
      return `⚠️ Couldn't run ${name}: ${e.message}`;
    }
    return "";
  }

  async function pickImage(file: File) {
    if (!user) return;
    if (!canVision) { setError("Attaching photos is a Max plan feature."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Images must be under 8MB."); return; }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-uploads").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const r = await signFn({ data: { path } });
      setAttachment({ path, preview: r.url });
      setImageUrls((m) => ({ ...m, [path]: r.url }));
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function send(useTools = true) {
    if ((!input.trim() && !attachment) || loading || outOfCredits) return;
    if (!user) { setError("Please sign in to use AI."); return; }

    let tid = threadId;
    if (!tid) tid = await startNewChat();
    if (!tid) return;

    const msg = input.trim() || "What's in this image?";
    const pendingImage = attachment;
    const isFirst = messages.length === 0;
    setInput("");
    setAttachment(null);
    setError(null);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: msg, imagePath: pendingImage?.path ?? null }]);
    setLoading(true);

    try {
      await appendMsgFn({ data: { threadId: tid, role: "user", content: msg, imagePath: pendingImage?.path ?? null, autoTitle: isFirst } });
      if (isFirst) loadThreads().catch(() => {});

      const r = await chatFn({
        data: {
          personality: state.settings.assistantPersonality,
          history: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          message: msg,
          useTools,
          context: buildContext(),
          ...(pendingImage ? { image_url: pendingImage.preview } : {}),
        },
      });

      let content = r.text || "";
      const results = (r.actions || []).map(applyAction).filter(Boolean);
      if (results.length) content += (content ? "\n\n" : "") + results.join("\n");
      if (!content.trim()) content = "Done.";

      setMessages((m) => [...m, { id: `local-a-${Date.now()}`, role: "assistant", content }]);
      appendMsgFn({ data: { threadId: tid!, role: "assistant", content } }).catch(() => {});
      refreshCredits();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      refreshCredits();
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function removeThread(id: string) {
    setThreads((t) => t.filter((x) => x.id !== id));
    try {
      await deleteThreadFn({ data: { id } });
    } catch { /* ignore */ }
    if (id === threadId) {
      const rest = threads.filter((x) => x.id !== id);
      if (rest.length) openThread(rest[0]!.id);
      else startNewChat();
    }
  }

  /* ---------------- render ---------------- */

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: 48, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 48, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed bottom-6 right-4 top-20 z-50 flex w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-3">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setThreadsOpen((o) => !o)}
                title="Chat history"
                className={`rounded-full p-1.5 transition-colors ${threadsOpen ? "bg-accent text-foreground" : "hover:bg-accent"}`}
              >
                <PanelLeft className="h-4 w-4" />
              </motion.button>
              <FocuslyAIWordmark className="text-base" />
              <div className="flex-1" />
              <motion.button whileTap={{ scale: 0.92 }} onClick={startNewChat} title="New chat" className="rounded-full p-1.5 hover:bg-accent">
                <Plus className="h-4 w-4" />
              </motion.button>
              <button onClick={onClose} title="Close" className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>

            {credits && (
              <div className="border-b border-border p-3">
                <AICreditCard {...(credits as any)} />
              </div>
            )}

            <div className="relative flex-1 overflow-hidden">
              {/* Thread drawer */}
              <AnimatePresence>
                {threadsOpen && (
                  <motion.div
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "-100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    className="absolute inset-y-0 left-0 z-10 w-64 border-r border-border bg-card/98 backdrop-blur-xl"
                  >
                    <div className="flex h-full flex-col">
                      <button
                        onClick={startNewChat}
                        className="m-2 flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        <Plus className="h-3.5 w-3.5" /> New chat
                      </button>
                      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                        {threads.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>}
                        {threads.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className={`group flex items-center gap-1 rounded-xl px-2 py-2 text-xs transition-colors ${
                              t.id === threadId ? "bg-accent text-foreground" : "hover:bg-accent/50 text-muted-foreground"
                            }`}
                          >
                            <button onClick={() => openThread(t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{t.title}</span>
                            </button>
                            <button
                              onClick={() => removeThread(t.id)}
                              title="Delete chat"
                              className="shrink-0 rounded-full p-1 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-full space-y-3 overflow-y-auto p-4">
                {!user && (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <p className="mb-2">Sign in to chat with your AI study coach.</p>
                    <Link to="/login" className="text-primary underline text-xs">Sign in →</Link>
                  </div>
                )}
                {user && !historyLoading && messages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-sm text-muted-foreground">
                    <p>Hi! I can do anything you can — create, edit, delete tasks, start your timer, change settings, navigate, and more.</p>
                    <p className="text-xs">Try: "Plan my history essay due Friday", "delete the math one", or "start a 25 min timer".</p>
                    {canVision && <p className="text-xs">Max plan: attach a photo of your notes and I'll read it.</p>}
                  </motion.div>
                )}
                {historyLoading && (
                  <div className="space-y-2">
                    <div className="skeleton h-10 w-2/3 rounded-2xl" />
                    <div className="skeleton ml-auto h-10 w-1/2 rounded-2xl" />
                    <div className="skeleton h-16 w-3/4 rounded-2xl" />
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", damping: 24, stiffness: 280 }}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"}`}
                    >
                      {m.imagePath && imageUrls[m.imagePath] && (
                        <img src={imageUrls[m.imagePath]} alt="Attached" className="mb-2 max-h-48 w-full rounded-xl object-cover" />
                      )}
                      {m.role === "assistant"
                        ? <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                        : <span className="whitespace-pre-wrap">{m.content}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>●</motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>●</motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>●</motion.span>
                    <span className="ml-2">Thinking…</span>
                  </div>
                )}
                {error && <div className="text-xs text-destructive">{error}</div>}
                <div ref={endRef} />
              </div>
            </div>

            <div className="space-y-2 border-t border-border p-3">
              <AnimatePresence>
                {attachment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <img src={attachment.preview} alt="Attachment preview" className="h-12 w-12 rounded-lg object-cover" />
                    <span className="text-xs text-muted-foreground">Photo attached</span>
                    <button onClick={() => setAttachment(null)} className="ml-auto rounded-full p-1 hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {outOfCredits ? (
                <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <Lock className="h-3 w-3" /> AI is locked until you upgrade or daily limit resets.
                  <Link to="/plans" className="ml-auto rounded-full bg-destructive px-3 py-1 text-[10px] font-medium text-destructive-foreground">Upgrade</Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => (canVision ? fileRef.current?.click() : setError("Attaching photos is a Max plan feature."))}
                    disabled={!user || uploading}
                    title={canVision ? "Attach a photo" : "Max plan feature"}
                    className="relative rounded-full border border-border bg-card p-2 transition hover:bg-accent disabled:opacity-50"
                  >
                    {uploading ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} className="block h-4 w-4 rounded-full border-2 border-border border-t-primary" /> : <ImagePlus className="h-4 w-4" />}
                    {!canVision && <Crown className="absolute -right-0.5 -top-0.5 h-3 w-3 text-[color:var(--gold)]" />}
                  </motion.button>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(true))}
                    placeholder={user ? "Type a question or ask me to do something..." : "Sign in to chat"}
                    disabled={!user || loading}
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm transition-shadow focus:shadow-md focus:outline-none disabled:opacity-50"
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => send(false)} disabled={!user || loading} title="Plain answer (no actions)" className="rounded-full border border-border bg-card p-2 hover:bg-accent disabled:opacity-50">
                    <ListTodo className="h-4 w-4" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} whileHover={{ y: -1 }} onClick={() => send(true)} disabled={!user || loading} className="rounded-full bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
