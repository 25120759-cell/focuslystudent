import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_FAST = "google/gemini-3-flash-preview";
const MODEL_PRO = "google/gemini-3.1-pro-preview";

const PLAN_LIMITS: Record<string, { day: number; month: number; max_chars: number; allow_vision: boolean; pro_model: boolean }> = {
  free: { day: 10, month: 100, max_chars: 4000, allow_vision: false, pro_model: false },
  pro: { day: 100, month: 1000, max_chars: 8000, allow_vision: false, pro_model: false },
  max: { day: 500, month: 10000, max_chars: 20000, allow_vision: true, pro_model: true },
};

const SUPPORT_DAY_LIMIT = 30;

const PERSONAS = {
  tutor: "You are Focusly, a friendly Socratic tutor. Explain step-by-step, ask guiding questions, keep replies concise.",
  coach: "You are Focusly, an encouraging study coach. Be motivating, concise, and action-oriented.",
  zen: "You are Focusly, a calm zen guide. Speak gently and help reduce study anxiety.",
};

type PlanInfo = { plan: "free" | "pro" | "max"; day: number; month: number; max_chars: number; allow_vision: boolean; pro_model: boolean; monthly_credit_override: number | null };

async function getPlanInfo(supabase: any, userId: string): Promise<PlanInfo> {
  const { data } = await supabase.from("profiles").select("plan, monthly_credit_override").eq("id", userId).maybeSingle();
  const plan = ((data?.plan as keyof typeof PLAN_LIMITS) || "free") as "free" | "pro" | "max";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return {
    plan,
    day: limits.day,
    month: data?.monthly_credit_override ?? limits.month,
    max_chars: limits.max_chars,
    allow_vision: limits.allow_vision,
    pro_model: limits.pro_model,
    monthly_credit_override: data?.monthly_credit_override ?? null,
  };
}

async function checkCredits(supabase: any, userId: string): Promise<PlanInfo & { dayUsed: number; monthUsed: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const info = await getPlanInfo(supabase, userId);
  const { count: dayCount } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
  const { count: monthCount } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month", month);
  const dayUsed = dayCount ?? 0;
  const monthUsed = monthCount ?? 0;
  if (dayUsed >= info.day) throw new Error(`Daily AI limit reached (${info.day}/day on the ${info.plan} plan). Try again tomorrow or upgrade.`);
  if (monthUsed >= info.month) throw new Error(`Monthly AI limit reached (${info.month}/month on the ${info.plan} plan). Upgrade for more.`);
  return { ...info, dayUsed, monthUsed };
}

async function recordUsage(_supabase: any, userId: string, model: string, inTok = 0, outTok = 0, kind = "chat", plan = "free") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("ai_usage").insert({ user_id: userId, model, tokens_in: inTok, tokens_out: outTok, kind, plan });
}


async function callGateway(body: any) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured.");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
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

function modelFor(info: PlanInfo, preferPro = false) {
  return info.pro_model && preferPro ? MODEL_PRO : MODEL_FAST;
}

export const aiCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const info = await getPlanInfo(supabase, userId);
    const { count: d } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
    const { count: m } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month", month);
    return {
      dayUsed: d ?? 0,
      monthUsed: m ?? 0,
      dayLimit: info.day,
      monthLimit: info.month,
      plan: info.plan,
      capabilities: {
        pro_model: info.pro_model,
        allow_vision: info.allow_vision,
        max_chars: info.max_chars,
      },
    };
  });

export const aiUsageLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from("ai_usage")
      .select("id, kind, model, tokens_in, tokens_out, plan, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return { entries: data ?? [] };
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
    const info = await checkCredits(supabase, userId);
    const planNote = `\n\nThe user is on the ${info.plan.toUpperCase()} plan. ${info.plan === "max" ? "You have access to deeper reasoning and long-context analysis." : info.plan === "pro" ? "Pro users get standard fast responses." : "Free plan — keep replies concise."}`;
    const sys = PERSONAS[data.personality] + planNote + (data.context ? `\n\nCurrent app state:\n${data.context}` : "") + "\n\nWhen the user requests an action you can perform via a tool, call the tool. You can chain multiple tools in one reply.";
    const messages = [
      { role: "system", content: sys },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];
    const model = modelFor(info, false);
    const json = await callGateway({ model, messages, tools: data.useTools ? TOOLS : undefined, tool_choice: data.useTools ? "auto" : undefined });
    const choice = json.choices?.[0];
    const text: string = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];
    const actions: any[] = toolCalls.map((tc: any) => {
      try { return { name: tc.function.name, args: JSON.parse(tc.function.arguments) }; }
      catch { return { name: tc.function.name, args: {} }; }
    });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, "chat", info.plan);
    return { text, actions, plan: info.plan };
  });

export const parseTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ text: z.string().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const info = await checkCredits(supabase, userId);
    const today = new Date().toISOString();
    const model = modelFor(info, false);
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: `You extract a study task from natural language. Today is ${today}. Return ONLY JSON: {"title":string,"description":string,"due":string (ISO 8601)}` },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, "parse_task", info.plan);
    try { return JSON.parse(raw); }
    catch { return { title: data.text, description: "", due: new Date(Date.now() + 86400000).toISOString() }; }
  });

// ---- Support chatbot ----

const SUPPORT_PROMPT = `You are the Focusly Support assistant. You ONLY answer questions about how to use the Focusly app:
- The Study Clock (Pomodoro timer with chimes)
- Timetable and Files
- Assignments (creating, editing, deleting, subtasks, AI quick-add)
- Calendar, Rewards (points & vouchers), Social, Cards
- AI assistant (credits, plan codes), Settings (theme, font size, language)
- Account / sign-in / privacy

If the user asks anything unrelated, politely refuse in one sentence and steer them back to Focusly support. Be concise. Use bullets for steps.`;

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
    const info = await checkCredits(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase.from("support_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
    if ((count ?? 0) >= SUPPORT_DAY_LIMIT) throw new Error(`Free support limit reached (${SUPPORT_DAY_LIMIT}/day). Try again tomorrow.`);
    const model = MODEL_FAST;
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: SUPPORT_PROMPT },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: data.message },
      ],
    });
    await supabase.from("support_usage").insert({ user_id: userId });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, "support", info.plan);
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });

// ---- Admin ----

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
    const info = await checkCredits(supabase, userId);
    const model = modelFor(info, true);
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: 'You are the Focusly changelog writer. Generate a release note. Return ONLY JSON: {"title":string (under 80 chars),"summary":string (under 160 chars, plain),"body":string (markdown, 2-4 short paragraphs)}' },
        { role: "user", content: data.prompt },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, "admin_post", info.plan);
    try { return JSON.parse(raw); }
    catch { return { title: data.prompt.slice(0, 60), summary: "", body: data.prompt }; }
  });

export const generatePostSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ title: z.string(), body: z.string().max(20000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const info = await checkCredits(supabase, userId);
    const model = MODEL_FAST;
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: "Write a one-sentence summary under 160 characters. Return ONLY the sentence, no quotes." },
        { role: "user", content: `Title: ${data.title}\n\n${data.body}` },
      ],
    });
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, "admin_summary", info.plan);
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

export const adminGeneratePostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    prompt: z.string().min(3).max(500),
    title: z.string().min(1).max(200),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await requireAdmin(supabase, userId);
    const info = await checkCredits(supabase, userId);
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
    await recordUsage(supabase, userId, "google/gemini-2.5-flash-image", 0, 0, "admin_image", info.plan);
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

// ---- AI: smart assignment breakdown (plan-aware, supports section regen) ----

const BreakdownInput = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(20000).optional().default(""),
  due: z.string().nullable().optional(),
  // Edit-and-retry: regenerate only one section, optionally with user instruction
  regen: z.enum(["all", "subtasks", "schedule", "tips"]).default("all"),
  user_instruction: z.string().max(500).optional(),
});

export const aiBreakdownAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BreakdownInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const info = await checkCredits(supabase, userId);
    // Enforce per-plan input length
    const desc = (data.description ?? "").slice(0, info.max_chars);
    const today = new Date().toISOString();

    const targetSchema =
      data.regen === "subtasks" ? '{"subtasks":[{"title":string,"estimated_minutes":number}],"total_minutes":number}' :
      data.regen === "schedule" ? '{"study_plan":[{"day_offset":number,"start_hour":number,"duration_minutes":number,"focus":string}]}' :
      data.regen === "tips" ? '{"tips":[string]}' :
      `{
  "subtasks":[{"title":string,"estimated_minutes":number}],
  "total_minutes":number,
  "study_plan":[{"day_offset":number,"start_hour":number,"duration_minutes":number,"focus":string}],
  "tips":[string]
}`;

    const planNote = info.plan === "max"
      ? "MAX plan: produce 6-10 deeply detailed subtasks, a study schedule that fills concrete dates and times up to the due date, and 3-5 specific tips."
      : info.plan === "pro"
      ? "PRO plan: produce 4-7 subtasks, a concise schedule, and 2-3 tips."
      : "FREE plan: produce 3-5 short subtasks, a brief schedule, and 2 tips.";

    const sys = `You are a study planner for the Focusly app. Today is ${today}. ${planNote}
Return ONLY JSON matching this shape: ${targetSchema}
Schedule sessions before the due date, prefer 25-50 min blocks afternoon/evening, leave a buffer day.`;

    const userMsg = `Title: ${data.title}
Due: ${data.due ?? "no due date"}
Description: ${desc || "(none)"}
${data.user_instruction ? `\nUser instruction for this regeneration: ${data.user_instruction}` : ""}`;

    const model = modelFor(info, true);
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, `breakdown_${data.regen}`, info.plan);
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    return {
      subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks.slice(0, 12) : undefined,
      total_minutes: typeof parsed.total_minutes === "number" ? parsed.total_minutes : undefined,
      study_plan: Array.isArray(parsed.study_plan) ? parsed.study_plan.slice(0, 14) : undefined,
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 6) : undefined,
      plan: info.plan,
      regen: data.regen,
    };
  });

// ---- AI: notes summary, flashcards, quiz (plan-aware, section regen) ----

const StudyNotesInput = z.object({
  text: z.string().min(20).max(20000),
  mode: z.enum(["all", "summary", "flashcards", "quiz"]).default("all"),
  user_instruction: z.string().max(500).optional(),
  image_data_url: z.string().max(2_000_000).optional(), // base64 data URL, max plan only
});

export const aiStudyNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StudyNotesInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const info = await checkCredits(supabase, userId);
    const text = data.text.slice(0, info.max_chars);
    if (data.image_data_url && !info.allow_vision) {
      throw new Error("Image input is a MAX plan feature. Upgrade to attach photos.");
    }

    const targetSchema =
      data.mode === "summary" ? '{"summary":string,"key_points":[string]}' :
      data.mode === "flashcards" ? '{"flashcards":[{"front":string,"back":string}]}' :
      data.mode === "quiz" ? '{"quiz":[{"question":string,"options":[string,string,string,string],"answer_index":number,"explanation":string}]}' :
      `{
  "summary":string,
  "key_points":[string],
  "flashcards":[{"front":string,"back":string}],
  "quiz":[{"question":string,"options":[string,string,string,string],"answer_index":number,"explanation":string}]
}`;

    const planNote = info.plan === "max"
      ? "MAX plan: be thorough — 10-15 flashcards, 8-12 quiz questions, detailed summary covering all major concepts."
      : info.plan === "pro"
      ? "PRO plan: 8-12 flashcards, 6-8 quiz questions."
      : "FREE plan: 5-8 flashcards, 4-6 quiz questions.";

    const sys = `You are a study aid generator. ${planNote}
Return ONLY JSON matching: ${targetSchema}
Keep options plausible and distinct.`;

    const userContent: any[] = [{ type: "text", text }];
    if (data.image_data_url && info.allow_vision) {
      userContent.push({ type: "image_url", image_url: { url: data.image_data_url } });
    }
    if (data.user_instruction) {
      userContent.push({ type: "text", text: `\nUser instruction for this regeneration: ${data.user_instruction}` });
    }

    const model = modelFor(info, true);
    const json = await callGateway({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userContent.length === 1 ? text : userContent },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, `notes_${data.mode}`, info.plan);
    let p: any = {};
    try { p = JSON.parse(raw); } catch {}
    return {
      summary: typeof p.summary === "string" ? p.summary : undefined,
      key_points: Array.isArray(p.key_points) ? p.key_points.slice(0, 14) : undefined,
      flashcards: Array.isArray(p.flashcards) ? p.flashcards.slice(0, 24) : undefined,
      quiz: Array.isArray(p.quiz) ? p.quiz.slice(0, 16) : undefined,
      plan: info.plan,
      mode: data.mode,
    };
  });

// ---- Artifact backup / sync (cloud mirror for offline local-first cache) ----

const ArtifactInput = z.object({
  kind: z.enum(["breakdown", "notes"]),
  ref_id: z.string().max(100).nullable().optional(),
  title: z.string().max(300).default(""),
  payload: z.any(),
});

export const saveArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ArtifactInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // Upsert by (user, kind, ref_id) when ref_id is provided; else insert new
    if (data.ref_id) {
      const { data: existing } = await supabase
        .from("ai_artifacts")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", data.kind)
        .eq("ref_id", data.ref_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("ai_artifacts").update({
          title: data.title,
          payload: data.payload,
        }).eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { id: existing.id, updated: true };
      }
    }
    const { data: ins, error } = await supabase.from("ai_artifacts").insert({
      user_id: userId,
      kind: data.kind,
      ref_id: data.ref_id ?? null,
      title: data.title,
      payload: data.payload,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id, updated: false };
  });

export const listArtifacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ kind: z.enum(["breakdown", "notes"]).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    let q = supabase.from("ai_artifacts").select("id, kind, ref_id, title, payload, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(200);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { artifacts: rows ?? [] };
  });

export const deleteArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("ai_artifacts").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
