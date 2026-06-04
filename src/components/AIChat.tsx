import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, X, ListTodo, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { aiChat, aiCredits } from "@/lib/ai.functions";
import { AICreditCard } from "./AICreditCard";
import { FocuslyAIWordmark } from "./FocuslyAILogo";

const ROUTES = ["/app", "/assignments", "/calender", "/rewards", "/social", "/cards", "/support"] as const;

export function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ dayUsed: number; monthUsed: number; dayLimit: number; monthLimit: number; plan: string } | null>(null);
  const chatFn = useServerFn(aiChat);
  const creditsFn = useServerFn(aiCredits);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    creditsFn().then(setCredits as any).catch(() => {});
  }, [open, user, creditsFn]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.chat.length, loading]);

  const outOfCredits = !!credits && (credits.dayUsed >= credits.dayLimit || credits.monthUsed >= credits.monthLimit);

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
      if (name === "redeem_reward" && args.voucher_id) {
        const map: any = { "starbucks-50": { id: "starbucks-50", name: "Starbucks $5", cost: 50, codePrefix: "SBX" }, "mcd-100": { id: "mcd-100", name: "McDonald's Meal", cost: 100, codePrefix: "MCD" }, "amazon-200": { id: "amazon-200", name: "Amazon $20", cost: 200, codePrefix: "AMZ" } };
        const v = map[args.voucher_id];
        if (v) { dispatch({ type: "REDEEM", voucher: v }); return `🎁 Redeemed ${v.name}.`; }
      }
      if (name === "set_setting" && args.key && args.value !== undefined) {
        dispatch({ type: "PATCH_SETTINGS", patch: { [args.key]: args.value } as any });
        return `⚙️ Set ${args.key} to ${args.value}.`;
      }
      if (name === "navigate" && args.route && (ROUTES as readonly string[]).includes(args.route)) {
        navigate({ to: args.route });
        return `➡️ Navigated to ${args.route}.`;
      }
    } catch (e: any) {
      return `⚠️ Couldn't run ${name}: ${e.message}`;
    }
    return "";
  }

  async function send(useTools = true) {
    if (!input.trim() || loading || outOfCredits) return;
    if (!user) { setError("Please sign in to use AI."); return; }
    const msg = input.trim();
    setInput(""); setError(null);
    dispatch({ type: "PUSH_CHAT", msg: { role: "user", content: msg, ts: Date.now() } });
    setLoading(true);
    try {
      const r = await chatFn({
        data: {
          personality: state.settings.assistantPersonality,
          history: state.chat.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          message: msg,
          useTools,
          context: buildContext(),
        },
      });
      let content = r.text || "";
      const results = (r.actions || []).map(applyAction).filter(Boolean);
      if (results.length) content += (content ? "\n\n" : "") + results.join("\n");
      if (!content.trim()) content = "Done.";
      dispatch({ type: "PUSH_CHAT", msg: { role: "assistant", content, ts: Date.now() } });
      creditsFn().then(setCredits as any).catch(() => {});
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      creditsFn().then(setCredits as any).catch(() => {});
    } finally { setLoading(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 240 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md glass border-l border-border"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <FocuslyAIWordmark className="text-base" />
              <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            {credits && (
              <div className="p-3 border-b border-border">
                <AICreditCard {...credits} />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!user && (
                <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                  <p className="mb-2">Sign in to chat with your AI study coach.</p>
                  <Link to="/login" className="text-primary underline text-xs">Sign in →</Link>
                </div>
              )}
              {user && state.chat.length === 0 && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Hi! I can do anything you can — create, edit, delete tasks, start your timer, redeem rewards, change settings, navigate, and more.</p>
                  <p className="text-xs">Try: "Plan my history essay due Friday", "delete the math one", or "start a 25 min timer".</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {state.chat.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 24, stiffness: 280 }}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"}`}
                  >
                    {m.role === "assistant" ? <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <span className="whitespace-pre-wrap">{m.content}</span>}
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
            <div className="border-t border-border p-3 space-y-2">
              {outOfCredits ? (
                <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <Lock className="h-3 w-3" /> AI is locked until you upgrade or daily limit resets.
                  <Link to="/plans" className="ml-auto rounded-full bg-destructive px-3 py-1 text-[10px] font-medium text-destructive-foreground">Upgrade</Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(true))}
                    placeholder={user ? "Type a question or ask me to do something..." : "Sign in to chat"}
                    disabled={!user || loading}
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm disabled:opacity-50"
                  />
                  <button onClick={() => send(false)} disabled={!user || loading} title="Plain answer (no actions)" className="rounded-full border border-border bg-card p-2 hover:bg-accent disabled:opacity-50">
                    <ListTodo className="h-4 w-4" />
                  </button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => send(true)} disabled={!user || loading} className="rounded-full bg-primary p-2 text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
