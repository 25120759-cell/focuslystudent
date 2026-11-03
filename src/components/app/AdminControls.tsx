import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wrench, Megaphone, ShieldOff, Coins, Gauge, KeyRound, ScrollText, Power } from "lucide-react";
import {
  adminOverview, adminUpdateSettings, adminSuspend, adminUnsuspend,
  adminGrantCoins, adminSetCreditOverride, adminSetRole, adminDisableAllCodes,
} from "@/lib/admin.functions";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/app-controls";

interface UserLite { id: string; display_name: string | null }

const SWITCHES: { key: keyof AppSettings; label: string; hint: string }[] = [
  { key: "ai_enabled", label: "AI features", hint: "Chat, breakdowns, notes and tutor" },
  { key: "packs_enabled", label: "Card packs", hint: "Opening new packs" },
  { key: "trading_enabled", label: "Card trading", hint: "Selling and trading cards" },
  { key: "social_posting_enabled", label: "Social posting", hint: "New posts in the feed" },
  { key: "doc_sharing_enabled", label: "Doc sharing", hint: "Sharing Cogni Docs" },
];

/** Admin control centre: switches, banners, suspensions, balances and roles. No content editing. */
export function AdminControls({ users }: { users: UserLite[] }) {
  const overviewFn = useServerFn(adminOverview);
  const settingsFn = useServerFn(adminUpdateSettings);
  const suspendFn = useServerFn(adminSuspend);
  const unsuspendFn = useServerFn(adminUnsuspend);
  const coinsFn = useServerFn(adminGrantCoins);
  const creditFn = useServerFn(adminSetCreditOverride);
  const roleFn = useServerFn(adminSetRole);
  const codesFn = useServerFn(adminDisableAllCodes);

  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [susp, setSusp] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(100);
  const [credit, setCredit] = useState("");

  const name = (id: string) => users.find((u) => u.id === id)?.display_name || id.slice(0, 8);

  async function load() {
    try {
      const o: any = await overviewFn();
      setS({ ...DEFAULT_SETTINGS, ...(o.settings ?? {}) });
      setStats(o.stats ?? {}); setSusp(o.suspensions); setLog(o.log); setAdmins(o.adminIds);
    } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); await load(); } catch (e: any) { toast.error(e.message); }
  }
  const save = (patch: Partial<AppSettings>) => {
    setS((p) => ({ ...p, ...patch }));
    return run(() => settingsFn({ data: patch as any }), "Saved");
  };
  const need = () => { if (!target) { toast.error("Pick a user first."); return false; } return true; };

  const input = "rounded-xl border border-input bg-background px-3 py-2 text-sm";
  const btn = "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(stats).slice(0, 8).map(([k, v]) => (
          <div key={k} className="paper-raised p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{String(v)}</p>
          </div>
        ))}
      </div>

      <section className={`paper-raised p-5 space-y-3 ${s.maintenance_mode ? "ring-2 ring-destructive/40" : ""}`}>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Maintenance mode</h2>
        <p className="text-sm text-muted-foreground">Locks the app for everyone except admins. The sign-in page stays open.</p>
        <textarea value={s.maintenance_message} onChange={(e) => setS({ ...s, maintenance_message: e.target.value })} placeholder="Message people will see" className={`${input} w-full`} rows={2} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save({ maintenance_mode: !s.maintenance_mode, maintenance_message: s.maintenance_message })} className={`rounded-full px-4 py-2 text-sm font-medium ${s.maintenance_mode ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
            {s.maintenance_mode ? "Turn maintenance off" : "Turn maintenance on"}
          </button>
          <button onClick={() => save({ maintenance_message: s.maintenance_message })} className={btn}>Save message</button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="paper-raised p-5 space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Power className="h-5 w-5 text-primary" /> Feature switches</h2>
          {SWITCHES.map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span><span className="block text-sm font-medium">{f.label}</span><span className="text-xs text-muted-foreground">{f.hint}</span></span>
              <input type="checkbox" className="h-5 w-5 accent-primary" checked={Boolean(s[f.key])} onChange={(e) => save({ [f.key]: e.target.checked } as any)} />
            </label>
          ))}
          <label className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span><span className="block text-sm font-medium">Free daily AI limit</span><span className="text-xs text-muted-foreground">Blank = default</span></span>
            <input type="number" min={0} className={`${input} w-24`} value={s.free_daily_ai_limit ?? ""} onChange={(e) => setS({ ...s, free_daily_ai_limit: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => save({ free_daily_ai_limit: s.free_daily_ai_limit })} />
          </label>
        </section>

        <section className="paper-raised p-5 space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Site-wide banner</h2>
          <input value={s.banner_message} onChange={(e) => setS({ ...s, banner_message: e.target.value })} placeholder="e.g. New cards drop Friday" className={`${input} w-full`} />
          <div className="flex flex-wrap gap-2">
            <select value={s.banner_tone} onChange={(e) => setS({ ...s, banner_tone: e.target.value as any })} className={input}>
              <option value="info">Info</option><option value="warning">Warning</option><option value="success">Good news</option>
            </select>
            <button onClick={() => save({ banner_message: s.banner_message, banner_tone: s.banner_tone })} className={btn}>Publish banner</button>
            <button onClick={() => save({ banner_message: "" })} className={btn}>Clear</button>
          </div>
          <h3 className="pt-3 font-display text-lg font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Emergency</h3>
          <button onClick={() => confirm("Disable every active redeem code?") && run(() => codesFn(), "All codes disabled")} className={btn}>Disable all redeem codes</button>
        </section>
      </div>

      <section className="paper-raised p-5 space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><ShieldOff className="h-5 w-5 text-primary" /> Account actions</h2>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${input} w-full`}>
          <option value="">Choose a user…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.display_name || "Unnamed"} · {u.id.slice(0, 8)}{admins.includes(u.id) ? " · admin" : ""}</option>)}
        </select>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suspend</p>
            <div className="flex gap-2">
              <input type="number" min={1} value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))} className={`${input} w-20`} />
              <span className="self-center text-xs text-muted-foreground">hours</span>
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to them" className={`${input} w-full`} />
            <div className="flex gap-2">
              <button onClick={() => need() && run(() => suspendFn({ data: { user_id: target, hours, reason } }), "Suspended")} className={btn}>Suspend</button>
              <button onClick={() => need() && run(() => unsuspendFn({ data: { user_id: target } }), "Restored")} className={btn}>Lift</button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Card coins</p>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className={`${input} w-full`} />
            <button onClick={() => need() && run(() => coinsFn({ data: { user_id: target, amount } }), "Coins updated")} className={btn}>Add (negative removes)</button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> AI credits / month</p>
            <input type="number" min={0} value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Blank = plan default" className={`${input} w-full`} />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => need() && run(() => creditFn({ data: { user_id: target, monthly: credit === "" ? null : Number(credit) } }), "Credits set")} className={btn}>Set</button>
              <button onClick={() => need() && run(() => roleFn({ data: { user_id: target, admin: !admins.includes(target) } }), "Role updated")} className={btn}>{admins.includes(target) ? "Remove admin" : "Make admin"}</button>
            </div>
          </div>
        </div>
        {susp.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currently paused</p>
            {susp.map((x) => (
              <div key={x.user_id} className="flex items-center justify-between text-sm">
                <span>{name(x.user_id)} — until {new Date(x.suspended_until).toLocaleString()}</span>
                <button onClick={() => run(() => unsuspendFn({ data: { user_id: x.user_id } }), "Restored")} className={btn}>Lift</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper-raised p-5 space-y-2">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /> Admin activity</h2>
        {log.length === 0 && <p className="text-sm text-muted-foreground">No admin actions yet.</p>}
        {log.map((l) => (
          <div key={l.id} className="flex flex-wrap justify-between gap-2 border-t border-border pt-2 text-xs">
            <span><b>{name(l.admin_id)}</b> · {l.action.replace(/_/g, " ")}{l.target_user ? ` → ${name(l.target_user)}` : ""}</span>
            <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
