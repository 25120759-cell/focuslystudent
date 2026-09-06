import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_assignment_status",
  title: "Update assignment status",
  description: "Move one of the signed-in student's assignments to a different status (todo, doing, done).",
  inputSchema: {
    id: z.string().uuid().describe("Assignment id from list_assignments."),
    status: z.enum(["todo", "doing", "done"]).describe("New status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("assignments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, title, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No assignment with that id." }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { assignment: data } };
  },
});
