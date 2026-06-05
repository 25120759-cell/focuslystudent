import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubtaskSchema = z.object({ id: z.string(), title: z.string().min(1).max(500), done: z.boolean() });
const ResourceSchema = z.object({ name: z.string().min(1).max(200), link: z.string().max(2000) });
const AssignmentPatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).optional(),
  due: z.string().nullable().optional(),
  status: z.enum(["Opened", "Completed", "Late"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).optional(),
  notes: z.string().max(10000).optional(),
  subtasks: z.array(SubtaskSchema).max(100).optional(),
  resources: z.array(ResourceSchema).max(50).optional(),
});

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("assignments")
      .select("id,title,description,due,status,priority,tags,notes,subtasks,resources,created_at,updated_at")
      .eq("user_id", userId)
      .order("due", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return { assignments: data ?? [] };
  });

export const getAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("assignments")
      .select("id,title,description,due,status,priority,tags,notes,subtasks,resources,created_at,updated_at")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { assignment: row ?? null };
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AssignmentPatchSchema.extend({ title: z.string().min(1).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("assignments")
      .insert({ user_id: userId, ...data })
      .select("id,title,description,due,status,priority,tags,notes,subtasks,resources,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { assignment: row };
  });

export const updateAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1).max(120), patch: AssignmentPatchSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("assignments")
      .update(data.patch)
      .eq("user_id", userId)
      .eq("id", data.id)
      .select("id,title,description,due,status,priority,tags,notes,subtasks,resources,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { assignment: row };
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("assignments").delete().eq("user_id", userId).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });