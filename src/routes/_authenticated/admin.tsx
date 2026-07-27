import { RouteError, SkeletonRows, EmptyState } from "@/components/app/States";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Loader2, Ticket, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminListUsers, adminSetPlan } from "@/lib/ai.functions";
import { adminCreatePlanCode, adminListPlanCodes, adminTogglePlanCode } from "@/lib/plans.functions";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/admin")({
  errorComponent: RouteError,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/landing" });
    const email = u.user.email?.toLowerCase();
    if (email === "afhaigh76@gmail.com" || email === "25120759@sunwayeducation.info") return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/app" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Focusly" }] }),
});

interface UserRow { id: string; display_name: string | null; plan: string; monthly_credit_override: number | null; created_at: string }
interface CodeRow { id: string; code: string; plan: string; monthly_credit_override: number | null; max_redemptions: number; redeemed_count: number; active: boolean; expires_at: string | null; created_at: string }

function AdminPage() {
  const listFn = useServerFn(adminListUsers);
  const setPlanFn = useServerFn(adminSetPlan);
  const listCodesFn = useServerFn(adminListPlanCodes);
  const createCodeFn = useServerFn(adminCreatePlanCode);
  const toggleCodeFn = useServerFn(adminTogglePlanCode);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [plan, setPlan] = useState<"pro" | "max">("pro");
  const [customCode, setCustomCode] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState(1);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [r, c]: any[] = await Promise.all([listFn(), listCodesFn()]);
      setUsers(r.users);
      setCodes(c.codes);
    }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function change(userId: string, plan: "free" | "pro" | "max") {
    setChanging(userId);
    try {
      await setPlanFn({ data: { user_id: userId, plan } });
      setUsers((us) => us.map((u) => u.id === userId ? { ...u, plan } : u));
    } catch (e: any) { setErr(e.message); }
    finally { setChanging(null); }
  }

  async function createCode() {
    setErr(null);
    try {
      await createCodeFn({ data: { plan, code: customCode || undefined, max_redemptions: maxRedemptions } });
      setCustomCode("");
      setMaxRedemptions(1);
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 rise-in">
      <PageHeader
        eyebrow="Staff only"
        icon={Shield}
        title="Admin"
        accent="console"
        description="Change plans, mint redeem codes, then publish AI-drafted posts from Updates."
        actions={
          <Link to="/updates" className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent/40">
            Compose post →
          </Link>
        }
      />

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="paper-raised overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Override</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={4} cols={4} />
            ) : users.map((u) => (
              <motion.tr
                key={u.id}
                animate={{ backgroundColor: changing === u.id ? "rgba(99,102,241,0.08)" : "transparent" }}
                className="border-t border-border"
              >
                <td className="p-3">
                  <div className="font-medium">{u.display_name || "—"}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 8)}</div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <select
                    value={u.plan}
                    onChange={(e) => change(u.id, e.target.value as any)}
                    disabled={changing === u.id}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="max">Max</option>
                  </select>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{u.monthly_credit_override ?? "—"}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="paper-raised p-5 space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" /> Plan redeem codes</h2>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px_auto]">
          <input value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="Optional custom code" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <select value={plan} onChange={(e) => setPlan(e.target.value as "pro" | "max")} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="pro">Pro</option>
            <option value="max">Max</option>
          </select>
          <input type="number" min={1} max={10000} value={maxRedemptions} onChange={(e) => setMaxRedemptions(Math.max(1, Number(e.target.value) || 1))} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={createCode} className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4" /> Create</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-2">Code</th><th className="p-2">Plan</th><th className="p-2">Used</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-2 font-mono text-xs">{c.code}</td>
                  <td className="p-2 capitalize">{c.plan}</td>
                  <td className="p-2 text-xs text-muted-foreground">{c.redeemed_count}/{c.max_redemptions}</td>
                  <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.active ? "bg-tt-break" : "bg-muted text-muted-foreground"}`}>{c.active ? "Active" : "Off"}</span></td>
                  <td className="p-2"><button onClick={async () => { await toggleCodeFn({ data: { id: c.id, active: !c.active } }); await load(); }} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">{c.active ? "Disable" : "Enable"}</button></td>
                </tr>
              ))}
              {loading && <SkeletonRows rows={3} cols={5} />}
              {!loading && codes.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No codes yet — create one above to hand out a plan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
