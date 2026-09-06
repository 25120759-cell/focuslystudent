import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_assignments",
  title: "List assignments",
  description: "List the signed-in student's assignments, newest due first. Optionally filter by status.",
  inputSchema: {
    status: z.enum(["todo", "doing", "done", "all"]).optional().describe("Filter by status. Defaults to all."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("assignments")
      .select("id, title, description, status, priority, due, tags, subtasks, updated_at")
      .order("due", { ascending: true, nullsFirst: false })
      .limit(limit ?? 25);
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { assignments: data ?? [] },
    };
  },
});
