import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Ticket, Check, X, Sparkles, Crown, Loader2 } from "lucide-react";
import { z } from "zod";
import { redeemPlanCode } from "@/lib/plans.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";


const PLAN_DETAILS: Record<string, { name: string; price: string; tagline: string; perks: string[]; icon: any; color: string }> = {
  pro: {
    name: "Pro",
    price: "$6 / month",
    tagline: "10× more AI for serious students.",
    perks: ["1,000 AI credits / month", "No daily cap", "10 packs / day", "Priority AI response"],
    icon: Sparkles,
    color: "from-primary to-[color:var(--gold)]",
  },
  max: {
    name: "Max",
    price: "$19 / month",
    tagline: "Run your whole academic life on AI.",
    perks: ["10,000 AI credits / month", "50 packs / day", "Largest reasoning models", "Early access to new tools"],
    icon: Crown,
    color: "from-amber-400 via-orange-500 to-pink-600",
  },
};

export const Route = createFileRoute("/redeem")({
  ssr: false,
  validateSearch: (s) => z.object({ plan: z.enum(["pro", "max"]).optional().default("pro") }).parse(s),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login", search: { redirect: `/redeem?plan=${search.plan}` } as any });
    }
  },
  component: RedeemPage,
  head: () => ({
    meta: [
      { title: "Redeem your plan code — Focusly" },
      { name: "description", content: "Enter a Focusly redemption code to activate Pro or Max on your account." },
      { property: "og:title", content: "Redeem your plan code — Focusly" },
      { property: "og:description", content: "Enter a Focusly redemption code to activate Pro or Max on your account." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://focuslystudent.lovable.app/redeem" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Redeem your plan code — Focusly" },
      { name: "twitter:description", content: "Enter a Focusly redemption code to activate Pro or Max on your account." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://focuslystudent.lovable.app/redeem" }],
  }),
});

function RedeemPage() {
  const { plan } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const redeemFn = useServerFn(redeemPlanCode);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  const details = PLAN_DETAILS[plan];
  const Icon = details.icon;

  async function submit() {
    if (!code.trim()) return;
    setState("loading"); setMessage("");
    try {
      const r: any = await redeemFn({ data: { code: code.trim() } });
      const grantedPlan = String(r.plan || plan).toUpperCase();
      setState("ok");
      setMessage(`Your plan is now ${grantedPlan}. Welcome aboard.`);
      setCode("");
      setTimeout(() => navigate({ to: "/app" }), 1800);
    } catch (e: any) {
      setState("err");
      setMessage(e.message || "Could not redeem that code.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl px-6 py-16"
      >
        <Link to="/plans" className="text-xs text-muted-foreground hover:text-foreground">← Back to plans</Link>

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 22 }}
          className={`mt-6 rounded-3xl border border-border bg-gradient-to-br ${details.color} p-8 text-white shadow-xl relative overflow-hidden`}
        >
          <motion.div
            aria-hidden
            className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 6 }}
          />
          <div className="flex items-center gap-3 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Focusly</p>
              <h1 className="font-display text-3xl font-semibold">{details.name}</h1>
            </div>
            <span className="ml-auto rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur">{details.price}</span>
          </div>
          <p className="mt-4 text-white/90 relative">{details.tagline}</p>
          <ul className="mt-4 grid gap-2 text-sm relative">
            {details.perks.map((p) => (
              <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4" /> {p}</li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-6 rounded-3xl border border-border bg-card p-6"
        >
          <Ticket className="h-6 w-6 text-primary" />
          <h2 className="mt-2 font-display text-xl font-semibold">Enter your redemption code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment is handled separately. Once an admin sends you a code, paste it below to activate the plan on this account ({user?.email}).
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); if (state !== "idle") setState("idle"); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="FOCUSLY-XXXXXX"
              autoFocus
              disabled={state === "loading"}
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm uppercase tracking-wider font-mono disabled:opacity-50"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={submit}
              disabled={state === "loading" || !code.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              {state === "loading" ? "Redeeming…" : "Redeem"}
            </motion.button>
          </div>

          {state === "ok" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </motion.div>
          )}
          {state === "err" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </motion.div>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground">
            Don't have a code? <a href="https://luraapps.base44.app/feedback" target="_blank" rel="noreferrer" className="underline">Contact us</a>.
          </p>
        </motion.div>
      </motion.section>
    </div>
  );
}
