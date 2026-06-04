import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rollPack, getCard, CARD_SELL_VALUE, PACK_COST, PACK_DAILY_LIMIT } from "./cards";

async function getProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, plan, coins, pack_opens_today, pack_opens_day")
    .eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found.");
  return data;
}

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const p = await getProfile(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const opens = p.pack_opens_day === today ? p.pack_opens_today : 0;
    const limit = PACK_DAILY_LIMIT[p.plan] ?? PACK_DAILY_LIMIT.free;
    return { coins: p.coins, plan: p.plan, packsOpened: opens, packLimit: limit, packCost: PACK_COST };
  });

export const openPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = await getProfile(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const opens = p.pack_opens_day === today ? p.pack_opens_today : 0;
    const limit = PACK_DAILY_LIMIT[p.plan] ?? PACK_DAILY_LIMIT.free;
    if (opens >= limit) throw new Error(`Daily pack limit reached (${limit}). Upgrade for more.`);
    if (p.coins < PACK_COST) throw new Error(`Not enough coins. Need ${PACK_COST}.`);

    const ids = rollPack();
    const { error: insErr } = await supabaseAdmin.from("user_cards").insert(
      ids.map((card_id) => ({ user_id: userId, card_id })),
    );
    if (insErr) throw new Error(insErr.message);
    const { error: updErr } = await supabaseAdmin.from("profiles").update({
      coins: p.coins - PACK_COST,
      pack_opens_today: opens + 1,
      pack_opens_day: today,
    }).eq("id", userId);
    if (updErr) throw new Error(updErr.message);
    return { cards: ids.map((id) => getCard(id)).filter(Boolean) };
  });

export const listMyCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("user_cards").select("id, card_id, obtained_at")
      .eq("user_id", userId).order("obtained_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      cards: (data ?? []).map((c: any) => ({
        instance_id: c.id,
        card: getCard(c.card_id),
        obtained_at: c.obtained_at,
      })).filter((c: any) => c.card),
    };
  });

export const sellCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ instance_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabase
      .from("user_cards").select("id, card_id, user_id").eq("id", data.instance_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.user_id !== userId) throw new Error("Card not found.");
    const card = getCard(row.card_id);
    if (!card) throw new Error("Unknown card.");
    const value = CARD_SELL_VALUE[card.rarity];
    const { data: p } = await supabase.from("profiles").select("coins").eq("id", userId).single();
    await supabaseAdmin.from("user_cards").delete().eq("id", row.id);
    await supabaseAdmin.from("profiles").update({ coins: (p?.coins ?? 0) + value }).eq("id", userId);
    return { soldFor: value };
  });

export const proposeTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    to_user: z.string().uuid(),
    offer_user_card_id: z.string().uuid(),
    request_card_id: z.number().int().min(0).max(499),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.to_user === userId) throw new Error("Cannot trade with yourself.");
    const { data: row } = await supabase
      .from("user_cards").select("id, user_id").eq("id", data.offer_user_card_id).maybeSingle();
    if (!row || row.user_id !== userId) throw new Error("You don't own that card.");
    const { error } = await supabase.from("card_trades").insert({
      from_user: userId, to_user: data.to_user,
      offer_user_card_id: data.offer_user_card_id,
      request_card_id: data.request_card_id,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from("card_trades").select("id, from_user, to_user, offer_user_card_id, request_card_id, status, created_at")
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(50);
    const offerIds = (data ?? []).map((t: any) => t.offer_user_card_id);
    let offers: Record<string, number> = {};
    if (offerIds.length) {
      const { data: ucs } = await supabase.from("user_cards").select("id, card_id").in("id", offerIds);
      offers = Object.fromEntries((ucs ?? []).map((u: any) => [u.id, u.card_id]));
    }
    return {
      trades: (data ?? []).map((t: any) => ({
        ...t,
        offerCard: getCard(offers[t.offer_user_card_id] ?? -1) ?? null,
        requestCard: getCard(t.request_card_id) ?? null,
        direction: t.from_user === userId ? "outgoing" : "incoming",
      })),
    };
  });

export const respondTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ trade_id: z.string().uuid(), accept: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabase
      .from("card_trades").select("*").eq("id", data.trade_id).maybeSingle();
    if (!t || t.to_user !== userId || t.status !== "pending") throw new Error("Trade not actionable.");

    if (!data.accept) {
      await supabaseAdmin.from("card_trades").update({ status: "rejected", resolved_at: new Date().toISOString() }).eq("id", t.id);
      return { ok: true };
    }

    // Recipient must own a copy of the requested card
    const { data: mine } = await supabaseAdmin
      .from("user_cards").select("id").eq("user_id", userId).eq("card_id", t.request_card_id).limit(1);
    if (!mine || !mine.length) throw new Error("You don't own the requested card.");
    const myInstance = mine[0].id;

    // Verify offer still owned by sender
    const { data: offer } = await supabaseAdmin
      .from("user_cards").select("id, user_id").eq("id", t.offer_user_card_id).maybeSingle();
    if (!offer || offer.user_id !== t.from_user) throw new Error("Sender no longer owns the offered card.");

    // Swap ownership
    await supabaseAdmin.from("user_cards").update({ user_id: userId }).eq("id", offer.id);
    await supabaseAdmin.from("user_cards").update({ user_id: t.from_user }).eq("id", myInstance);
    await supabaseAdmin.from("card_trades").update({ status: "accepted", resolved_at: new Date().toISOString() }).eq("id", t.id);
    return { ok: true };
  });
