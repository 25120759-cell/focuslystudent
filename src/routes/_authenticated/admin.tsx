import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminListUsers, adminSetPlan } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/landing" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/app" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Focusly" }] }),
});

interface UserRow { id: string; display_name: string | null; plan: string; monthly_credit_override: number | null; created_at: string }

function AdminPage() {
  const listFn = useServerFn(adminListUsers);
  const setPlanFn = useServerFn(adminSetPlan);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { const r: any = await listFn(); setUsers(r.users); }
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Admin console
        </h1>
        <Link to="/updates" className="text-xs text-muted-foreground hover:text-foreground underline">→ Compose post</Link>
      </div>
      <p className="text-sm text-muted-foreground">Hidden page. Change plans, then jump to <Link to="/updates" className="text-primary underline">Updates</Link> to publish AI-drafted posts.</p>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="rounded-3xl glass overflow-hidden">
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
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Loading…</td></tr>
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
    </motion.div>
  );
}
