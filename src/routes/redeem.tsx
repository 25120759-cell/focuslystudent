import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { Ticket, Check, X, Sparkles, Crown, Loader2 } from "lucide-react";
import { z } from "zod";
import { redeemPlanCode } from "@/lib/plans.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";


const PLAN_DETAILS: Record<string, { name: string; price: string; tagline: string; perks: string[]; icon: any }> = {
  pro: {
    name: "Pro",
    price: "$6 / month",
    tagline: "10× more AI for serious students.",
    perks: ["1,000 AI credits / month", "No daily cap", "10 packs / day", "Priority AI response"],
    icon: Sparkles,
  },
  max: {
    name: "Max",
    price: "$19 / month",
    tagline: "Run your whole academic life on AI.",
    perks: ["10,000 AI credits / month", "50 packs / day", "Largest reasoning models", "Early access to new tools"],
    icon: Crown,
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
      { title: "Redeem your plan code — Cogni" },
      { name: "description", content: "Enter a Cogni redemption code to activate Pro or Max on your account." },
      { property: "og:title", content: "Redeem your plan code — Cogni" },
      { property: "og:description", content: "Enter a Cogni redemption code to activate Pro or Max on your account." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cognistudent.lovable.app/redeem" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Redeem your plan code — Cogni" },
      { name: "twitter:description", content: "Enter a Cogni redemption code to activate Pro or Max on your account." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://cognistudent.lovable.app/redeem" }],
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

  return <PublicPage label="Redeem" title="Your next chapter." description="Activate your Cogni plan with a redemption code issued by an admin.">
    <div className="grid gap-12 py-12 lg:grid-cols-[1fr_1.3fr]">
      <section aria-label="Selected plan" className="lg:border-r lg:border-border lg:pr-12">
        <Link to="/plans" className="text-sm text-muted-foreground underline underline-offset-4">← Compare plans</Link>
        <Icon className="mt-10 h-8 w-8 text-primary" />
        <h2 className="mt-4 font-display text-4xl">Cogni {details.name}</h2>
        <p className="mt-2 text-xl">{details.price}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{details.tagline}</p>
        <ul className="mt-7 space-y-4 text-sm">{details.perks.map(p => <li key={p} className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-primary" />{p}</li>)}</ul>
      </section>
      <section className="min-w-0 py-2">
        <Ticket className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-display text-3xl">Enter your code.</h2>
        <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">The plan will be activated on your account: <span className="font-medium text-foreground">{user?.email}</span>.</p>
        <form onSubmit={e => { e.preventDefault(); if (state !== "loading" && state !== "ok") void submit(); }} className="mt-8">
          <label htmlFor="plan-code" className="mb-2 block text-sm font-medium">Redemption code</label>
          <input id="plan-code" value={code} onChange={e => { setCode(e.target.value); if (state !== "idle") setState("idle"); }} placeholder="Enter your code" autoComplete="off" disabled={state === "loading" || state === "ok"} className="h-12 w-full rounded-md border border-input bg-card px-4 font-mono text-sm disabled:opacity-50" />
          <Button type="submit" disabled={state === "loading" || state === "ok" || !code.trim()} className="mt-4 h-11 w-full">{state === "loading" && <Loader2 className="animate-spin" />}{state === "loading" ? "Activating…" : state === "ok" ? "Activated" : "Activate plan"}</Button>
        </form>
        {(state === "ok" || state === "err") && <div role={state === "err" ? "alert" : "status"} className={`mt-5 flex items-start gap-3 border-t border-border pt-5 text-sm ${state === "err" ? "text-destructive" : "text-primary"}`}>{state === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}{message}</div>}
        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">Don't have a code? <a href="https://luraapps.base44.app/feedback" target="_blank" rel="noreferrer" className="underline underline-offset-4">Contact us</a>.</p>
      </section>
    </div>
  </PublicPage>;
}
