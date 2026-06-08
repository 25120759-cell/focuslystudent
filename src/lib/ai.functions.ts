import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const PLAN_LIMITS: Record<string, { day: number; month: number }> = {
  free: { day: 10, month: 100 },
  pro: { day: 100, month: 1000 },
  max: { day: 500, month: 10000 },
};

const SUPPORT_DAY_LIMIT = 30;

const PERSONAS = {
  tutor: "You are Focusly, a friendly Socratic tutor. Explain step-by-step, ask guiding questions, keep replies concise.",
  coach: "You are Focusly, an encouraging study coach. Be motivating, concise, and action-oriented.",
  zen: "You are Focusly, a calm zen guide. Speak gently and help reduce study anxiety.",
};

async function getPlanLimits(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("plan, monthly_credit_override").eq("id", userId).maybeSingle();
  const plan = (data?.plan as keyof typeof PLAN_LIMITS) || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return {
    plan,
    day: limits.day,
    month: data?.monthly_credit_override ?? limits.month,
  };
}

async function checkCredits(supabase: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const limits = await getPlanLimits(supabase, userId);
  const { count: dayCount } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
  const { count: monthCount } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month", month);
  const dayUsed = dayCount ?? 0;
  const monthUsed = monthCount ?? 0;
  if (dayUsed >= limits.day) throw new Error(`Daily AI limit reached (${limits.day}/day). Try again tomorrow or upgrade.`);
  if (monthUsed >= limits.month) throw new Error(`Monthly AI limit reached (${limits.month}/mo). Upgrade for more.`);
  return { dayUsed, monthUsed, ...limits };
}

async function recordUsage(supabase: any, userId: string, inTok = 0, outTok = 0) {
  await supabase.from("ai_usage").insert({ user_id: userId, model: MODEL, tokens_in: inTok, tokens_out: outTok });
}

async function callGateway(body: any) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured.");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted on the platform.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[AI gateway]", res.status, t);
    throw new Error("AI request failed. Please try again.");
  }
  return res.json();
}

const TOOLS = [
  { type: "function", function: { name: "create_assignment", description: "Create a new assignment / task.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, due: { type: "string", description: "ISO 8601" } }, required: ["title"] } } },
  { type: "function", function: { name: "update_assignment", description: "Update an existing assignment by id.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, due: { type: "string" }, status: { type: "string", enum: ["Opened", "Completed", "Late"] } }, required: ["id"] } } },
  { type: "function", function: { name: "delete_assignment", description: "Delete an assignment by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "complete_assignment", description: "Mark an assignment complete.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "add_subtask", description: "Add a subtask to an assignment.", parameters: { type: "object", properties: { assignment_id: { type: "string" }, title: { type: "string" } }, required: ["assignment_id", "title"] } } },
  { type: "function", function: { name: "create_action_plan", description: "Break a goal into a step-by-step plan.", parameters: { type: "object", properties: { title: { type: "string" }, steps: { type: "array", items: { type: "object", properties: { action: { type: "string" }, date: { type: "string" }, progress: { type: "string" }, status: { type: "string" } }, required: ["action", "date", "progress", "status"] } } }, required: ["title", "steps"] } } },
  { type: "function", function: { name: "start_timer", description: "Start the study timer.", parameters: { type: "object", properties: { minutes: { type: "number" } } } } },
  { type: "function", function: { name: "stop_timer", description: "Stop the study timer.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "redeem_reward", description: "Redeem a reward voucher by id.", parameters: { type: "object", properties: { voucher_id: { type: "string" } }, required: ["voucher_id"] } } },
  { type: "function", function: { name: "set_setting", description: "Change a user setting.", parameters: { type: "object", properties: { key: { type: "string", enum: ["theme", "fontSize", "language", "assistantPersonality"] }, value: { type: "string" } }, required: ["key", "value"] } } },
  { type: "function", function: { name: "navigate", description: "Navigate to a route in the app.", parameters: { type: "object", properties: { route: { type: "string", description: "e.g. /app, /assignments, /calender, /rewards" } }, required: ["route"] } } },
];

export const aiCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const limits = await getPlanLimits(supabase, userId);
    const { count: d } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
    const { count: m } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month", month);
    return { dayUsed: d ?? 0, monthUsed: m ?? 0, dayLimit: limits.day, monthLimit: limits.month, plan: limits.plan };
  });

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      personality: z.enum(["tutor", "coach", "zen"]).default("tutor"),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(40),
      message: z.string().min(1).max(4000),
      useTools: z.boolean().default(true),
      context: z.string().max(4000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await checkCredits(supabase, userId);
    const sys = PERSONAS[data.personality] + (data.context ? `\n\nCurrent app state:\n${data.context}` : "") + "\n\nWhen the user requests an action you can perform via a tool, call the tool. You can chain multiple tools in one reply.";
    const messages = [
      { role: "system", content: sys },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];
    const json = await callGateway({ messages, tools: data.useTools ? TOOLS : undefined, tool_choice: data.useTools ? "auto" : undefined });
    const choice = json.choices?.[0];
    const text: string = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];
    const actions: any[] = toolCalls.map((tc: any) => {
      try { return { name: tc.function.name, args: JSON.parse(tc.function.arguments) }; }
      catch { return { name: tc.function.name, args: {} }; }
    });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    return { text, actions };
  });

export const parseTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ text: z.string().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await checkCredits(supabase, userId);
    const today = new Date().toISOString();
    const json = await callGateway({
      messages: [
        { role: "system", content: `You extract a study task from natural language. Today is ${today}. Return ONLY JSON: {"title":string,"description":string,"due":string (ISO 8601)}` },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    try { return JSON.parse(raw); }
    catch { return { title: data.text, description: "", due: new Date(Date.now() + 86400000).toISOString() }; }
  });

// ---- Support chatbot (free, product-help only, rate-limited) ----

const SUPPORT_PROMPT = `You are the Focusly Support assistant. You ONLY answer questions about how to use the Focusly app:
- The Study Clock (Pomodoro timer with chimes)
- Timetable and Files
- Assignments (creating, editing, deleting, subtasks, AI quick-add)
- Calendar, Rewards (points & vouchers), Social, Cards
- AI assistant (credits, plan codes), Settings (theme, font size, language)
- Account / sign-in / privacy

If the user asks anything unrelated (general schoolwork, jokes, code help, world knowledge), politely refuse in one sentence and steer them back to Focusly support. Be concise. Use bullets for steps.`;

export const aiSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(20),
      message: z.string().min(1).max(2000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await checkCredits(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase.from("support_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
    if ((count ?? 0) >= SUPPORT_DAY_LIMIT) throw new Error(`Free support limit reached (${SUPPORT_DAY_LIMIT}/day). Try again tomorrow.`);
    const json = await callGateway({
      messages: [
        { role: "system", content: SUPPORT_PROMPT },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: data.message },
      ],
    });
    await supabase.from("support_usage").insert({ user_id: userId });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });

// ---- Admin functions ----

async function requireAdmin(supabase: any, userId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email?.toLowerCase();
  if (email === "afhaigh76@gmail.com" || email === "25120759@sunwayeducation.info") return;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only.");
}

export const adminGeneratePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ prompt: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    await checkCredits(supabase, userId);
    const json = await callGateway({
      messages: [
        { role: "system", content: 'You are the Focusly changelog writer. Generate a release note. Return ONLY JSON: {"title":string (under 80 chars),"summary":string (under 160 chars, plain),"body":string (markdown, 2-4 short paragraphs)}' },
        { role: "user", content: data.prompt },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    try { return JSON.parse(raw); }
    catch { return { title: data.prompt.slice(0, 60), summary: "", body: data.prompt }; }
  });

export const generatePostSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string(), body: z.string().max(20000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    await checkCredits(supabase, userId);
    const json = await callGateway({
      messages: [
        { role: "system", content: "Write a one-sentence summary under 160 characters. Return ONLY the sentence, no quotes." },
        { role: "user", content: `Title: ${data.title}\n\n${data.body}` },
      ],
    });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    return { summary: (json.choices?.[0]?.message?.content ?? "").trim().slice(0, 200) };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, plan, monthly_credit_override, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });

export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid(), plan: z.enum(["free", "pro", "max"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("profiles").update({ plan: data.plan }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- AI image generation for blog post covers (admin) ----

export const adminGeneratePostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    prompt: z.string().min(3).max(500),
    title: z.string().min(1).max(200),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    await checkCredits(supabase, userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured.");

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: `Editorial cover image for a Focusly product update titled "${data.title}". Concept: ${data.prompt}. Modern minimal illustration, soft gradient palette, no embedded text.` },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[AI image]", res.status, t);
      throw new Error("AI image request failed. Please try again.");
    }
    const json: any = await res.json();
    const imageUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image returned.");

    // Upload to storage so we get a permanent public URL
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let publicUrl = imageUrl;
    try {
      const matched = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (matched) {
        const mime = matched[1];
        const ext = mime.split("/")[1] || "png";
        const bytes = Buffer.from(matched[2], "base64");
        const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage.from("post-covers").upload(filename, bytes, {
          contentType: mime, upsert: false,
        });
        if (!upErr) {
          const { data: pub } = supabaseAdmin.storage.from("post-covers").getPublicUrl(filename);
          publicUrl = pub.publicUrl;
        }
      }
    } catch (e) {
      console.error("[AI image upload]", e);
    }

    await recordUsage(supabase, userId, 0, 0);
    return { url: publicUrl };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

