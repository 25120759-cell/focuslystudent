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
      .select("classroom_id, classrooms(id, title, subject, room, period)")
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const classes = (data ?? []).map((row) => {
      const classroom = Array.isArray(row.classrooms) ? row.classrooms[0] : row.classrooms;
      return classroom
        ? {
            id: classroom.id,
            title: classroom.title,
            subject: classroom.subject,
            room: classroom.room,
            period: classroom.period,
          }
        : {
            id: row.classroom_id,
            title: null,
            subject: null,
            room: null,
            period: null,
          };
    });
    return { content: [{ type: "text", text: JSON.stringify(classes) }], structuredContent: { classes } };
  },
});
