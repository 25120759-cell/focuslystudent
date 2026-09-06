import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "List classes",
  description: "List the classes the signed-in student is enrolled in, with teacher, room and period.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("enrollments")
      .select("classroom_id, classrooms(id, name, subject, room, period, teacher_name)")
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const classes = (data ?? []).map((r: Record<string, unknown>) => r['classrooms'] ?? { id: r['classroom_id'] });
    return { content: [{ type: "text", text: JSON.stringify(classes) }], structuredContent: { classes } };
  },
});
