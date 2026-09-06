import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_assignment",
  title: "Create assignment",
  description: "Create a new assignment for the signed-in student.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Assignment title."),
    description: z.string().max(4000).optional().describe("Optional details."),
    due: z.string().optional().describe("Optional due date as an ISO 8601 timestamp."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority (default medium)."),
    tags: z.array(z.string().max(40)).max(10).optional().describe("Optional subject tags."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, due, priority, tags }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        user_id: ctx.getUserId()!,
        title,
        description: description ?? "",
        due: due ?? null,
        priority: priority ?? "medium",
        tags: tags ?? [],
      })
      .select("id, title, status, priority, due")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { assignment: data } };
  },
});
