import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ColorEnum = z.enum(["blue", "teal", "purple", "peach", "rose", "amber", "emerald", "indigo", "slate"]);

const ClassPatch = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_minute: z.number().int().min(0).max(1439),
  end_minute: z.number().int().min(1).max(1440),
  title: z.string().min(1).max(120),
  room: z.string().max(80).optional().default(""),
  teacher: z.string().max(120).optional().default(""),
  color: ColorEnum.optional().default("blue"),
});

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("timetable_classes")
      .select("id, day_of_week, start_minute, end_minute, title, room, teacher, color")
      .eq("user_id", userId)
      .order("day_of_week", { ascending: true })
      .order("start_minute", { ascending: true });
    if (error) throw new Error(error.message);
    return { classes: data ?? [] };
  });

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ClassPatch.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.end_minute <= data.start_minute) throw new Error("End time must be after start.");
    const { data: row, error } = await supabase
      .from("timetable_classes").insert({ user_id: userId, ...data }).select("*").single();
    if (error) throw new Error(error.message);
    return { class: row };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), patch: ClassPatch }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (data.patch.end_minute <= data.patch.start_minute) throw new Error("End time must be after start.");
    const { data: row, error } = await supabase
      .from("timetable_classes").update(data.patch).eq("id", data.id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return { class: row };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("timetable_classes").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
