import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ThreadRow = { id: string; title: string; updated_at: string };
export type ThreadMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
  created_at: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("ai_threads")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("Could not load your chats.");
    return { threads: (data ?? []) as ThreadRow[] };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string().max(120).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: userId, title: data.title?.trim() || "New chat" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error("Could not start a new chat.");
    return { thread: row as ThreadRow };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("ai_threads")
      .update({ title: data.title.trim().slice(0, 120) })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Could not rename this chat.");
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("ai_threads").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error("Could not delete this chat.");
    return { ok: true };
  });

export const listThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: rows, error } = await supabase
      .from("ai_thread_messages")
      .select("id, role, content, image_url, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error("Could not load this chat.");
    return { messages: (rows ?? []) as ThreadMessageRow[] };
  });

export const appendThreadMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        threadId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20000),
        imagePath: z.string().max(400).nullish(),
        autoTitle: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("ai_thread_messages")
      .insert({
        thread_id: data.threadId,
        user_id: userId,
        role: data.role,
        content: data.content,
        image_url: data.imagePath ?? null,
      })
      .select("id, role, content, image_url, created_at")
      .single();
    if (error) throw new Error("Could not save that message.");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.autoTitle && data.content.trim()) {
      patch['title'] = data.content.trim().replace(/\s+/g, " ").slice(0, 60);
    }
    await supabase.from("ai_threads").update(patch).eq("id", data.threadId).eq("user_id", userId);

    return { message: row as ThreadMessageRow };
  });

/** Signed URL for a stored chat image (private bucket). */
export const signChatImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Not allowed.");
    const { data: signed, error } = await supabase.storage.from("chat-uploads").createSignedUrl(data.path, 3600);
    if (error || !signed?.signedUrl) throw new Error("Could not load that image.");
    return { url: signed.signedUrl as string };
  });
