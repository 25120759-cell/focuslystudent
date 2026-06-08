import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeToken() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const listDocs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data, error } = await supabase
      .from("docs").select("id, title, word_count, paste_count, edit_seconds, share_token, updated_at, created_at")
      .eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { docs: data ?? [] };
  });

export const getDoc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: doc, error } = await supabase
      .from("docs").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return { doc };
  });

export const createDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string().min(1).max(200).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: doc, error } = await supabase
      .from("docs").insert({ user_id: userId, title: data.title || "Untitled" }).select("*").single();
    if (error) throw new Error(error.message);
    return { doc };
  });

export const saveDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    content_html: z.string().max(2_000_000).optional(),
    word_count: z.number().int().min(0).max(1_000_000).optional(),
    paste_count: z.number().int().min(0).max(1_000_000).optional(),
    edit_seconds: z.number().int().min(0).max(10_000_000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { id, ...patch } = data;
    const { data: doc, error } = await supabase
      .from("docs").update(patch).eq("id", id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return { doc };
  });

export const deleteDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase.from("docs").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const token = data.enabled ? makeToken() : null;
    const { data: doc, error } = await supabase
      .from("docs").update({ share_token: token }).eq("id", data.id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return { doc };
  });

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    doc_id: z.string().uuid(),
    kind: z.enum(["keystroke", "paste", "session_start", "session_end"]),
    chars: z.number().int().min(0).max(1_000_000).optional().default(0),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase.from("doc_events").insert({
      doc_id: data.doc_id, user_id: userId, kind: data.kind, chars: data.chars,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public (anon-safe) read for share links — uses admin client so it doesn't
// require an authenticated context.
export const getSharedDoc = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: z.string().min(4).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: doc, error } = await admin
      .from("docs").select("id, title, content_html, word_count, paste_count, edit_seconds, created_at, updated_at, user_id")
      .eq("share_token", data.token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) return { doc: null, events: [], author: null };
    const { data: events } = await admin
      .from("doc_events").select("kind, chars, created_at").eq("doc_id", doc.id).order("created_at", { ascending: true });
    const { data: prof } = await admin
      .from("profiles").select("display_name").eq("id", doc.user_id).maybeSingle();
    return { doc, events: events ?? [], author: prof?.display_name ?? "Unknown" };
  });
