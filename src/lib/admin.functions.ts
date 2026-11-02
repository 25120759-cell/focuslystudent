import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_app_admin", { _user_id: userId });
  if (!data) throw new Error("Admin only.");
}

async function audit(supabase: any, adminId: string, action: string, target: string | null, details: Record<string, unknown> = {}) {
  await supabase.from("admin_audit_log").insert({ admin_id: adminId, action, target_user: target, details });
}

const settingsSchema = z.object({
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().max(300),
  banner_message: z.string().max(300),
  banner_tone: z.enum(["info", "warning", "success"]),
  ai_enabled: z.boolean(),
  packs_enabled: z.boolean(),
  trading_enabled: z.boolean(),
  social_posting_enabled: z.boolean(),
  doc_sharing_enabled: z.boolean(),
  free_daily_ai_limit: z.number().int().min(0).max(10000).nullable(),
}).partial();

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [stats, settings, susp, log, roles] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("account_suspensions").select("*").gt("suspended_until", new Date().toISOString()),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(40),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    return {
      stats: stats.data ?? {},
      settings: settings.data,
      suspensions: susp.data ?? [],
      log: log.data ?? [],
      adminIds: (roles.data ?? []).map((r: any) => r.user_id),
    };
  });

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => settingsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: userId }).eq("id", 1);
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "settings", null, data);
    return { ok: true };
  });

export const adminSuspend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid(), hours: z.number().min(1).max(24 * 365), reason: z.string().max(300) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    if (data.user_id === userId) throw new Error("You can't suspend yourself.");
    const { data: targetAdmin } = await supabase.rpc("is_app_admin", { _user_id: data.user_id });
    if (targetAdmin) throw new Error("Admins can't be suspended. Remove their admin role first.");
    const until = new Date(Date.now() + data.hours * 3600_000).toISOString();
    const { error } = await supabase.from("account_suspensions").upsert({
      user_id: data.user_id, reason: data.reason, suspended_until: until, created_by: userId, created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "suspend", data.user_id, { hours: data.hours, reason: data.reason });
    return { ok: true, until };
  });

export const adminUnsuspend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("account_suspensions").delete().eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "unsuspend", data.user_id);
    return { ok: true };
  });

export const adminGrantCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid(), amount: z.number().int().min(-100000).max(100000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("coins").eq("id", data.user_id).maybeSingle();
    if (!p) throw new Error("User not found.");
    const coins = Math.max(0, (p.coins ?? 0) + data.amount);
    const { error } = await supabaseAdmin.from("profiles").update({ coins }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "coins", data.user_id, { amount: data.amount });
    return { coins };
  });

export const adminSetCreditOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid(), monthly: z.number().int().min(0).max(100000).nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ monthly_credit_override: data.monthly }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "credit_override", data.user_id, { monthly: data.monthly });
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ user_id: z.string().uuid(), admin: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    if (data.user_id === userId && !data.admin) throw new Error("You can't remove your own admin role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.admin
      ? supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" })
      : supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    const { error } = await q;
    if (error) throw new Error(error.message);
    await audit(supabase, userId, data.admin ? "grant_admin" : "revoke_admin", data.user_id);
    return { ok: true };
  });

export const adminDisableAllCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plan_codes").update({ active: false }).eq("active", true);
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "disable_all_codes", null);
    return { ok: true };
  });
