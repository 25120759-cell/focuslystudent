import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Doc shares: role-based sharing by email ----

export const listShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ doc_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    // Only owner can list shares
    const { data: doc } = await supabase.from("docs").select("id").eq("id", data.doc_id).eq("user_id", userId).maybeSingle();
    if (!doc) throw new Error("Not authorised");
    const { data: rows, error } = await supabase
      .from("doc_shares").select("id, shared_with_email, role, invite_token, created_at")
      .eq("doc_id", data.doc_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { shares: rows ?? [] };
  });

export const addShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    doc_id: z.string().uuid(),
    email: z.string().email().max(200),
    role: z.enum(["viewer", "commenter", "editor"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: doc } = await supabase.from("docs").select("id").eq("id", data.doc_id).eq("user_id", userId).maybeSingle();
    if (!doc) throw new Error("Not authorised");
    // upsert
    const { data: existing } = await supabase.from("doc_shares")
      .select("id").eq("doc_id", data.doc_id).eq("shared_with_email", data.email.toLowerCase()).maybeSingle();
    if (existing) {
      const { data: row, error } = await supabase.from("doc_shares")
        .update({ role: data.role }).eq("id", existing.id).select("*").single();
      if (error) throw new Error(error.message);
      return { share: row };
    }
    const { data: row, error } = await supabase.from("doc_shares")
      .insert({ doc_id: data.doc_id, owner_id: userId, shared_with_email: data.email.toLowerCase(), role: data.role })
      .select("*").single();
    if (error) throw new Error(error.message);
    return { share: row };
  });

export const removeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase.from("doc_shares").delete().eq("id", data.id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Docs shared WITH me (invitee view) ----

export const listSharedWithMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase: any = (context as any).supabase;
    const { data: shares, error } = await supabase
      .from("doc_shares").select("role, doc_id, docs:doc_id (id, title, updated_at, user_id)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { docs: (shares ?? []).map((s: any) => ({ ...s.docs, role: s.role })).filter((d: any) => d?.id) };
  });

// ---- Comments ----

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ doc_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase: any = (context as any).supabase;
    const { data: rows, error } = await supabase
      .from("doc_comments").select("id, author_id, body, resolved, created_at")
      .eq("doc_id", data.doc_id).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    // Fetch author names
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.author_id)));
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name ?? "User"]));
    }
    return { comments: (rows ?? []).map((r: any) => ({ ...r, author_name: names[r.author_id] ?? "User" })) };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    doc_id: z.string().uuid(),
    body: z.string().min(1).max(4000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: row, error } = await supabase
      .from("doc_comments").insert({ doc_id: data.doc_id, author_id: userId, body: data.body })
      .select("*").single();
    if (error) throw new Error(error.message);
    return { comment: row };
  });

export const resolveComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase: any = (context as any).supabase;
    const { error } = await supabase.from("doc_comments").update({ resolved: data.resolved }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase: any = (context as any).supabase;
    const { error } = await supabase.from("doc_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
