import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Wrench, ShieldOff, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import cogniMark from "@/assets/cogni-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DEFAULT_SETTINGS, isSuspensionActive, type AppSettings } from "@/lib/app-controls";

/** Shows the admin banner, and replaces the app with a notice during maintenance or a suspension. */
export function AppGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [suspension, setSuspension] = useState<{ reason: string; suspended_until: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (alive && data) setSettings({ ...DEFAULT_SETTINGS, ...(data as any) });
      if (user) {
        const { data: s } = await supabase.from("account_suspensions").select("reason, suspended_until").eq("user_id", user.id).maybeSingle();
        if (alive) setSuspension(s && isSuspensionActive(s.suspended_until) ? s : null);
      } else if (alive) setSuspension(null);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [user?.id]);

  const loginPage = path === "/login" || path.startsWith("/auth");
  if (!loading && !isAdmin && !loginPage) {
    if (settings.maintenance_mode) {
      return <Notice icon={Wrench} title="Back soon." body={settings.maintenance_message || "Cogni is getting a quick tune-up."} action={user ? { label: "Sign out", onClick: signOut } : { label: "Admin sign in", onClick: () => { window.location.href = "/login"; } }} />;
    }
    if (suspension) {
      return <Notice icon={ShieldOff} title="Account paused." body={`${suspension.reason ? suspension.reason + " " : ""}Your access returns on ${new Date(suspension.suspended_until).toLocaleString()}.`} action={{ label: "Sign out", onClick: signOut }} />;
    }
  }

  const Tone = settings.banner_tone === "warning" ? AlertTriangle : settings.banner_tone === "success" ? CheckCircle2 : Info;
  return (
    <>
      {settings.banner_message && (
        <div role="status" className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium ${settings.banner_tone === "warning" ? "bg-destructive/15 text-foreground" : settings.banner_tone === "success" ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
          <Tone className="h-3.5 w-3.5 shrink-0" /> {settings.banner_message}
        </div>
      )}
      {isAdmin && settings.maintenance_mode && (
        <div className="bg-brand-night px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-brand-ink">Maintenance mode is on — only admins can see the app</div>
      )}
      {children}
    </>
  );
}

function Notice({ icon: Icon, title, body, action }: { icon: any; title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-night px-6 text-center text-brand-ink">
      <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} src={cogniMark} alt="Cogni" className="mb-8 h-16 w-16 object-contain" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="max-w-md space-y-4">
        <Icon className="mx-auto h-6 w-6 opacity-70" />
        <h1 className="font-display text-5xl font-semibold tracking-tight">{title}</h1>
        <p className="text-base opacity-80">{body}</p>
        {action && <button onClick={action.onClick} className="mt-4 rounded-full border border-current/30 px-5 py-2 text-sm transition-opacity hover:opacity-80">{action.label}</button>}
      </motion.div>
      <p className="absolute bottom-6 text-xs opacity-50">Cogni For Students, part of the Cogni Suite</p>
    </div>
  );
}
