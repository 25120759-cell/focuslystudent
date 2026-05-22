import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const MONTH_LIMIT = 100;
const DAY_LIMIT = 10;

const PERSONAS = {
  tutor: "You are Focusly, a friendly Socratic tutor. Explain step-by-step, ask guiding questions, keep replies concise.",
  coach: "You are Focusly, an encouraging study coach. Be motivating, concise, and action-oriented.",
  zen: "You are Focusly, a calm zen guide. Speak gently and help reduce study anxiety.",
};

async function checkCredits(supabase: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const { count: dayCount } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("day", today);
  const { count: monthCount } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("month", month);
  const dayUsed = dayCount ?? 0;
  const monthUsed = monthCount ?? 0;
  if (dayUsed >= DAY_LIMIT) throw new Error(`Daily AI limit reached (${DAY_LIMIT}/day). Try again tomorrow or upgrade.`);
  if (monthUsed >= MONTH_LIMIT) throw new Error(`Monthly AI limit reached (${MONTH_LIMIT}/mo). Upgrade for more.`);
  return { dayUsed, monthUsed };
}

async function recordUsage(supabase: any, userId: string, inTok = 0, outTok = 0) {
  await supabase.from("ai_usage").insert({
    user_id: userId,
    model: MODEL,
    tokens_in: inTok,
    tokens_out: outTok,
  });
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
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_assignment",
      description: "Create a new assignment / task for the student.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          due: { type: "string", description: "ISO 8601 datetime" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_action_plan",
      description: "Break a goal down into a structured multi-step action plan.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                date: { type: "string" },
                progress: { type: "string" },
                status: { type: "string" },
              },
              required: ["action", "date", "progress", "status"],
            },
          },
        },
        required: ["title", "steps"],
      },
    },
  },
];

export const aiCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const { count: d } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("day", today);
    const { count: m } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month", month);
    return {
      dayUsed: d ?? 0,
      monthUsed: m ?? 0,
      dayLimit: DAY_LIMIT,
      monthLimit: MONTH_LIMIT,
    };
  });

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        personality: z.enum(["tutor", "coach", "zen"]).default("tutor"),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
          .max(40),
        message: z.string().min(1).max(4000),
        useTools: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await checkCredits(supabase, userId);
    const messages = [
      { role: "system", content: PERSONAS[data.personality] },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];
    const json = await callGateway({
      messages,
      tools: data.useTools ? TOOLS : undefined,
      tool_choice: data.useTools ? "auto" : undefined,
    });
    const choice = json.choices?.[0];
    const text: string = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];
    const actions: any[] = toolCalls.map((tc: any) => {
      try {
        return { name: tc.function.name, args: JSON.parse(tc.function.arguments) };
      } catch {
        return { name: tc.function.name, args: {} };
      }
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
        {
          role: "system",
          content: `You extract a study task from natural language. Today is ${today}. Return ONLY JSON: {"title":string,"description":string,"due":string (ISO 8601)}`,
        },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    try {
      return JSON.parse(raw);
    } catch {
      return { title: data.text, description: "", due: new Date(Date.now() + 86400000).toISOString() };
    }
  });

export const breakdownToddleSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        subject: z.string().min(1).max(200),
        tasks: z
          .array(z.object({ title: z.string(), description: z.string(), due: z.string() }))
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await checkCredits(supabase, userId);
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content:
            'You analyse a subject\'s assignments and produce a structured study plan. Return ONLY JSON: {"title":string,"steps":[{"action":string,"date":string,"progress":string,"status":string}]}',
        },
        {
          role: "user",
          content: `Subject: ${data.subject}\nAssignments:\n${data.tasks
            .map((t) => `- ${t.title} (due ${t.due}): ${t.description}`)
            .join("\n")}`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const usage = json.usage ?? {};
    await recordUsage(supabase, userId, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    try {
      return JSON.parse(raw);
    } catch {
      return { title: `Plan: ${data.subject}`, steps: [] };
    }
  });
