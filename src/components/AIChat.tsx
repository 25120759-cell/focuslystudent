import { useState } from "react";
import { Sparkles, Send, X, ListTodo } from "lucide-react";
import { useStore } from "@/lib/store";
import { askGemini } from "@/lib/gemini";
import { Link } from "@tanstack/react-router";

export function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(asPlan = false) {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setError(null);
    dispatch({ type: "PUSH_CHAT", msg: { role: "user", content: msg, ts: Date.now() } });
    setLoading(true);
    try {
      const r = await askGemini({
        apiKey: state.settings.geminiKey,
        personality: state.settings.assistantPersonality,
        history: state.chat.map((m) => ({ role: m.role, content: m.content })),
        message: msg,
        asActionPlan: asPlan,
      });
      let content = r.text;
      if (r.actionPlan) {
        const id = `plan-${Date.now()}`;
        dispatch({
          type: "ADD_ACTION_PLAN",
          plan: { id, title: r.actionPlan.title, steps: r.actionPlan.steps },
        });
        content = `Created **${r.actionPlan.title}** — open it in Files.`;
      }
      dispatch({ type: "PUSH_CHAT", msg: { role: "assistant", content, ts: Date.now() } });
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {state.chat.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Hi! Ask me about your homework, or click "Plan" to generate a structured action plan that lands in your Files.
            </p>
          )}
          {state.chat.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground">Thinking…</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
          {state.chat.some((m) => m.content.includes("Files")) && (
            <Link to="/" className="text-xs underline text-primary">Go to Files →</Link>
          )}
        </div>
        <div className="border-t border-border p-3 space-y-2">
          {!state.settings.geminiKey && (
            <p className="text-xs text-muted-foreground">Add your Gemini key in Settings to enable AI.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(false))}
              placeholder="Type a question..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm"
            />
            <button
              onClick={() => send(true)}
              title="Generate action plan"
              className="rounded-full border border-border bg-card p-2 hover:bg-accent"
            >
              <ListTodo className="h-4 w-4" />
            </button>
            <button
              onClick={() => send(false)}
              className="rounded-full bg-primary p-2 text-primary-foreground hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
