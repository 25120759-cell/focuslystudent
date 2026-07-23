import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer2, Sparkles } from "lucide-react";

// Global agent controller — the AI chat enqueues actions here and the overlay
// animates a visible pointer, then dispatches real DOM events.

export type AgentAction =
  | { type: "click"; selector: string; label?: string }
  | { type: "type"; selector: string; text: string; label?: string }
  | { type: "hover"; selector: string; label?: string }
  | { type: "navigate"; route: string; label?: string }
  | { type: "wait"; ms: number; label?: string }
  | { type: "say"; text: string };

type Listener = (s: { x: number; y: number; visible: boolean; label: string | null; busy: boolean }) => void;

class AgentController {
  private queue: AgentAction[] = [];
  private running = false;
  private listeners = new Set<Listener>();
  private navigateFn: ((path: string) => void) | null = null;
  x = window?.innerWidth ? window.innerWidth / 2 : 400;
  y = window?.innerHeight ? window.innerHeight / 2 : 300;
  visible = false;
  label: string | null = null;
  busy = false;

  setNavigate(fn: (path: string) => void) { this.navigateFn = fn; }
  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  private emit() { this.listeners.forEach((l) => l({ x: this.x, y: this.y, visible: this.visible, label: this.label, busy: this.busy })); }

  enqueue(actions: AgentAction[]) {
    this.queue.push(...actions);
    if (!this.running) this.run();
  }
  clear() { this.queue = []; this.running = false; this.visible = false; this.label = null; this.busy = false; this.emit(); }

  private wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  private async moveTo(x: number, y: number) {
    this.x = x; this.y = y; this.emit();
    await this.wait(650);
  }

  private findEl(selector: string): HTMLElement | null {
    // support "text=Foo" shorthand for button/link with visible text
    if (selector.startsWith("text=")) {
      const needle = selector.slice(5).trim().toLowerCase();
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role=button]"));
      return nodes.find((n) => (n.innerText || "").trim().toLowerCase().includes(needle)) ?? null;
    }
    try { return document.querySelector<HTMLElement>(selector); } catch { return null; }
  }

  private async run() {
    this.running = true;
    this.visible = true; this.busy = true; this.emit();
    while (this.queue.length) {
      const a = this.queue.shift()!;
      try {
        if (a.type === "say") { this.label = a.text; this.emit(); await this.wait(1200); this.label = null; this.emit(); continue; }
        if (a.type === "wait") { this.label = a.label ?? "Waiting…"; this.emit(); await this.wait(a.ms); continue; }
        if (a.type === "navigate") {
          this.label = a.label ?? `Navigate ${a.route}`; this.emit();
          this.navigateFn?.(a.route);
          await this.wait(700);
          continue;
        }
        const el = this.findEl(a.selector);
        if (!el) { this.label = `Couldn't find ${a.selector}`; this.emit(); await this.wait(900); continue; }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await this.wait(300);
        const r = el.getBoundingClientRect();
        this.label = a.label ?? a.type; this.emit();
        await this.moveTo(r.left + r.width / 2, r.top + r.height / 2);
        if (a.type === "hover") {
          el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
          await this.wait(500);
        } else if (a.type === "click") {
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          (el as HTMLElement).click();
          await this.wait(400);
        } else if (a.type === "type") {
          (el as HTMLInputElement | HTMLTextAreaElement).focus();
          const input = el as HTMLInputElement | HTMLTextAreaElement;
          const setter = Object.getOwnPropertyDescriptor(
            input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            "value",
          )?.set;
          for (let i = 0; i < a.text.length; i++) {
            const next = (input.value ?? "") + a.text[i];
            setter?.call(input, next);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            await this.wait(30);
          }
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch (e) {
        console.error("[agent]", e);
      }
    }
    this.busy = false; this.label = null; this.emit();
    await this.wait(1500);
    this.visible = false; this.emit();
    this.running = false;
  }
}

let _controller: AgentController | null = null;
export function getAgentController() {
  if (typeof window === "undefined") return null;
  if (!_controller) _controller = new AgentController();
  return _controller;
}

export function AgentCursorOverlay() {
  const [s, setS] = useState({ x: 400, y: 300, visible: false, label: null as string | null, busy: false });
  useEffect(() => {
    const c = getAgentController();
    if (!c) return;
    return c.subscribe(setS);
  }, []);
  return (
    <AnimatePresence>
      {s.visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, x: s.x, y: s.y }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", damping: 20, stiffness: 180 }}
          style={{ left: 0, top: 0 }}
          className="pointer-events-none fixed z-[100] -translate-x-1 -translate-y-1"
        >
          <div className="relative">
            <motion.div
              animate={s.busy ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="absolute -inset-3 rounded-full bg-primary/30 blur-md"
            />
            <MousePointer2 className="relative h-6 w-6 fill-primary text-primary-foreground drop-shadow-lg" />
            {s.label && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-6 top-4 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-lg flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> {s.label}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
