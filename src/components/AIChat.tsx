import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, ListTodo } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { aiChat, aiCredits } from "@/lib/ai.functions";
import { Link } from "@tanstack/react-router";

export function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ dayUsed: number; monthUsed: number; dayLimit: number; monthLimit: number } | null>(null);
  const chatFn = useServerFn(aiChat);
  const creditsFn = useServerFn(aiCredits);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    creditsFn().then(setCredits).catch(() => {});
  }, [open, user, creditsFn]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chat.length, loading]);

  async function send(useTools = true) {
    if (!input.trim() || loading) return;
    if (!user) { setError("Please sign in to use AI."); return; }
    const msg = input.trim();
    setInput("");
    setError(null);
    dispatch({ type: "PUSH_CHAT", msg: { role: "user", content: msg, ts: Date.now() } });
    setLoading(true);
    try {
      const r = await chatFn({
        data: {
          personality: state.settings.assistantPersonality,
          history: state.chat.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          message: msg,
          useTools,
        },
      });
      let content = r.text || "";
      for (const action of r.actions || []) {
        if (action.name === "create_action_plan" && action.args.title) {
          const id = `plan-${Date.now()}`;
          dispatch({ type: "ADD_ACTION_PLAN", plan: { id, title: action.args.title, steps: action.args.steps || [] } });
          content += `\n\n✅ Created action plan **${action.args.title}** — open it in Files.`;
        }
        if (action.name === "create_assignment" && action.args.title) {
          dispatch({
            type: "ADD_ASSIGNMENT",
            assignment: {
              id: `a-${Date.now()}`,
              title: action.args.title,
              description: action.args.description || "",
              due: action.args.due || new Date(Date.now() + 86400000).toISOString(),
              status: "Opened",
              resources: [],
            },
          });
          content += `\n\n✅ Added assignment **${action.args.title}**.`;
        }
      }
      if (!content.trim()) content = "Done.";
      dispatch({ type: "PUSH_CHAT", msg: { role: "assistant", content, ts: Date.now() } });
      creditsFn().then(setCredits).catch(() => {});
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform glass border-l border-border transition-transform ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display text-lg font-semibold">Ask AI for help</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {credits && (
          <div className="border-b border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Today: {credits.dayUsed}/{credits.dayLimit}</span>
            <span>Month: {credits.monthUsed}/{credits.monthLimit}</span>
            <Link to="/plans" className="text-primary underline">Upgrade</Link>
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
              <p>Hi! I can answer questions, create assignments, and generate action plans.</p>
              <p className="text-xs">Try: "Plan my history essay due Friday" or "Add reading Hatchet ch 8 by Tuesday".</p>
            </div>
          )}
          {state.chat.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(true))}
              placeholder={user ? "Type a question..." : "Sign in to chat"}
              disabled={!user || loading}
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm disabled:opacity-50"
            />
            <button
              onClick={() => send(true)}
              disabled={!user || loading}
              title="Send (AI may create tasks)"
              className="rounded-full border border-border bg-card p-2 hover:bg-accent disabled:opacity-50"
            >
              <ListTodo className="h-4 w-4" />
            </button>
            <button
              onClick={() => send(false)}
              disabled={!user || loading}
              className="rounded-full bg-primary p-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
