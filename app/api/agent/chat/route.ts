import { TOOLS, runTool } from "@/lib/agenttools";

/**
 * In-browser Agentic PayPal agent. An OpenRouter/Gemini LLM with function-calling
 * drives the same tools the MCP exposes. It loops: the model decides which tool to
 * call, we run it, feed the result back, until the model answers. Returns the
 * full transcript (assistant text + tool calls + results) so the UI can show it.
 */

// Provider: Gemini (OpenAI-compatible endpoint) when GEMINI_API_KEY is set,
// otherwise OpenRouter. Both speak the OpenAI chat-completions + tools schema,
// so the function-calling loop below is identical for either.
const GEMINI = !!process.env.GEMINI_API_KEY;
const OR_URL = GEMINI
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://openrouter.ai/api/v1/chat/completions";
const MODEL =
  process.env.AGENT_MODEL ?? (GEMINI ? "gemini-3.6-flash" : "nvidia/nemotron-3.5-lightning:free");

const SYSTEM = `You are Agentic PayPal, an AI agent with a wallet linked to the user's PayPal
account. You can log the user in (link_paypal), check the balance, buy goods from the merchant
store, fund the wallet via PayPal, and also buy x402 data services — all in USD.

If the user hasn't linked PayPal yet and you need to, call link_paypal with their email.
To buy goods: call browse_store for ids/prices, then buy_product. A purchase within the user's
automatic limit is paid from the wallet instantly (micro) — just confirm it. A larger purchase
(macro) returns a PayPal approval: the UI shows an "Approve payment" button from the tool result,
so tell the human to click it (NEVER write a URL yourself), and after they approve call
confirm_purchase with the orderId. When you decide a purchase yourself for a goal the user gave,
pass decidedBy:"agent" and a short reason.
To add funds, call fund_with_paypal, have the human click Approve, then confirm_funding.
For data services, use browse_market then pay_for_service. Keep replies short and concrete,
always report USD amounts, and say whether a purchase was auto-paid or needs approval.`;

type Msg = { role: string; content?: any; tool_calls?: any[]; tool_call_id?: string; name?: string };

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!key) return Response.json({ error: "No LLM API key set." }, { status: 500 });

  const { messages } = (await request.json()) as { messages: Msg[] };
  // Build the public origin from forwarded headers (behind nginx, request.url
  // resolves to an internal https://localhost:4021 that can't be fetched over TLS).
  const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : new URL(request.url).origin;

  const convo: Msg[] = [{ role: "system", content: SYSTEM }, ...messages];
  const steps: any[] = []; // tool calls + results, for the UI

  for (let i = 0; i < 6; i++) {
    const res = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin,
        "X-Title": "Agentic PayPal",
      },
      body: JSON.stringify({ model: MODEL, messages: convo, tools: TOOLS, tool_choice: "auto" }),
    });
    const json: any = await res.json();
    if (!res.ok) return Response.json({ error: json?.error?.message ?? JSON.stringify(json) }, { status: 502 });

    const m = json.choices?.[0]?.message;
    if (!m) return Response.json({ error: "No response from model." }, { status: 502 });
    convo.push(m);

    const calls = m.tool_calls ?? [];
    if (!calls.length) {
      return Response.json({ reply: m.content ?? "", steps });
    }

    for (const c of calls) {
      let args: any = {};
      try {
        args = c.function.arguments ? JSON.parse(c.function.arguments) : {};
      } catch {
        /* ignore */
      }
      let result: any;
      try {
        result = await runTool(c.function.name, args, origin);
      } catch (e: any) {
        // Surface the failure to the model as a tool result so it can explain
        // the problem instead of the whole request 500-ing on an empty body.
        result = { error: e?.message ?? String(e) };
      }
      steps.push({ tool: c.function.name, args, result });
      convo.push({
        role: "tool",
        tool_call_id: c.id,
        name: c.function.name,
        content: JSON.stringify(result),
      });
    }
  }
  // Ran out of iterations — return what we have.
  const last = [...convo].reverse().find((m) => m.role === "assistant");
  return Response.json({ reply: (last?.content as string) ?? "(stopped)", steps });
}
