import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("user_files").select("id, name, content, created_at, updated_at")
      .eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { files: data ?? [] };
  });

export const createFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(120), content: z.string().max(200000).optional().default("") }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("user_files").insert({ user_id: userId, name: data.name, content: data.content }).select("*").single();
    if (error) throw new Error(error.message);
    return { file: row };
  });

export const updateFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      name: z.string().min(1).max(120).optional(),
      content: z.string().max(200000).optional(),
    }),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("user_files").update(data.patch).eq("id", data.id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return { file: row };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("user_files").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
