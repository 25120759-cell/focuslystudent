import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_doc",
  title: "Read a document",
  description: "Read the contents of one of the signed-in student's Focusly Docs.",
  inputSchema: { id: z.string().uuid().describe("Document id from list_docs.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("docs")
      .select("id, title, content_html, word_count, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No document with that id." }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { doc: data } };
  },
});
