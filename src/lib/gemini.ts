// Direct browser-side Gemini 2.5 Flash call. User supplies own key in Settings.
const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const PERSONAS = {
  tutor: "You are Focusly, a friendly Socratic tutor. Explain step-by-step and ask guiding questions.",
  coach: "You are Focusly, an encouraging study coach. Be motivating, concise, and action-oriented.",
  zen: "You are Focusly, a calm zen guide. Speak gently and help reduce study anxiety.",
};

export async function askGemini(opts: {
  apiKey: string;
  personality: "tutor" | "coach" | "zen";
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  asActionPlan?: boolean;
}): Promise<{ text: string; actionPlan?: { title: string; steps: { action: string; date: string; progress: string; status: string }[] } }> {
  if (!opts.apiKey) throw new Error("Missing Gemini API key. Add one in Settings.");

  const systemInstruction = PERSONAS[opts.personality] + (opts.asActionPlan
    ? "\nReturn ONLY valid JSON of shape { \"title\": string, \"steps\": [{\"action\":string,\"date\":string,\"progress\":string,\"status\":string}] }."
    : "");

  const contents = [
    ...opts.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: opts.message }] },
  ];

  const body: any = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: opts.asActionPlan ? { responseMimeType: "application/json" } : {},
  };

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(opts.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (opts.asActionPlan) {
    try {
      const plan = JSON.parse(text);
      return { text: `Created action plan: ${plan.title}`, actionPlan: plan };
    } catch {
      return { text };
    }
  }
  return { text };
}
