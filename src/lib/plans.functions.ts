import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAILS = new Set(["afhaigh76@gmail.com", "25120759@sunwayeducation.info"]);

async function ensureAdmin(userId: string, email?: string | null) {
  if (email && ADMIN_EMAILS.has(email.toLowerCase())) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin only.");
}

function makeCode(raw?: string) {
  const code = raw?.trim() || `FOCUSLY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export const adminListPlanCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context as any;
    await ensureAdmin(userId, claims?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("plan_codes")
      .select("id, code, plan, monthly_credit_override, max_redemptions, redeemed_count, active, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const adminCreatePlanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    code: z.string().max(40).optional(),
    plan: z.enum(["free", "pro", "max"]),
    monthly_credit_override: z.number().int().min(0).nullable().optional(),
    max_redemptions: z.number().int().min(1).max(10000).default(1),
    expires_at: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    await ensureAdmin(userId, claims?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("plan_codes")
      .insert({
        code: makeCode(data.code),
        plan: data.plan,
        monthly_credit_override: data.monthly_credit_override ?? null,
        max_redemptions: data.max_redemptions,
        expires_at: data.expires_at || null,
        created_by: userId,
      })
      .select("id, code, plan, monthly_credit_override, max_redemptions, redeemed_count, active, expires_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { code: row };
  });

export const adminTogglePlanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    await ensureAdmin(userId, claims?.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("plan_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redeemPlanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(3).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await (supabaseAdmin as any).rpc("redeem_plan_code_for_user", {
      _user_id: userId,
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    return result;
  });