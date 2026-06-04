import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Feed =====

export const listFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data: posts, error } = await supabase
      .from("feed_posts")
      .select("id, user_id, body, like_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((posts ?? []).map((p: any) => p.user_id)));
    let profiles: Record<string, { display_name: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { display_name: p.display_name }]));
    }
    return { posts: (posts ?? []).map((p: any) => ({ ...p, author: profiles[p.user_id]?.display_name ?? "Student" })) };
  });

export const createFeedPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ body: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("feed_posts").insert({ user_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeedPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase.from("feed_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ post_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabase
      .from("feed_post_likes").select("post_id").eq("post_id", data.post_id).eq("user_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("feed_post_likes").delete().eq("post_id", data.post_id).eq("user_id", userId);
      const { data: row } = await supabaseAdmin.from("feed_posts").select("like_count").eq("id", data.post_id).maybeSingle();
      await supabaseAdmin.from("feed_posts").update({ like_count: Math.max(0, (row?.like_count ?? 1) - 1) }).eq("id", data.post_id);
      return { liked: false };
    } else {
      await supabase.from("feed_post_likes").insert({ post_id: data.post_id, user_id: userId });
      const { data: row } = await supabaseAdmin.from("feed_posts").select("like_count").eq("id", data.post_id).maybeSingle();
      await supabaseAdmin.from("feed_posts").update({ like_count: (row?.like_count ?? 0) + 1 }).eq("id", data.post_id);
      return { liked: true };
    }
  });

// ===== DMs =====

function pairKey(a: string, b: string) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_a, user_b, last_message_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    const peerIds = (data ?? []).map((c: any) => (c.user_a === userId ? c.user_b : c.user_a));
    let profs: Record<string, string> = {};
    if (peerIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, display_name").in("id", peerIds);
      profs = Object.fromEntries((p ?? []).map((x: any) => [x.id, x.display_name ?? "Student"]));
    }
    return {
      conversations: (data ?? []).map((c: any) => {
        const peer = c.user_a === userId ? c.user_b : c.user_a;
        return { id: c.id, peer_id: peer, peer_name: profs[peer] ?? "Student", last_message_at: c.last_message_at };
      }),
    };
  });

export const openConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ peer_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.peer_id === userId) throw new Error("Cannot DM yourself.");
    const keys = pairKey(userId, data.peer_id);
    const { data: existing } = await supabase
      .from("conversations").select("id").eq("user_a", keys.user_a).eq("user_b", keys.user_b).maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await supabase
      .from("conversations").insert(keys).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversation_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: msgs, error } = await supabase
      .from("conversation_messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversation_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("conversation_messages")
      .insert({ conversation_id: data.conversation_id, sender_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversation_id);
    return { ok: true };
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ q: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: rows } = await supabase
      .from("profiles").select("id, display_name").ilike("display_name", `%${data.q}%`).neq("id", userId).limit(20);
    return { users: rows ?? [] };
  });
