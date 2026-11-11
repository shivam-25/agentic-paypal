import { runTool } from "@/lib/agenttools";

/** Capture a macro (above-limit) store purchase the user approved in PayPal. */
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    const result = await runTool("confirm_purchase", { orderId }, "");
    return Response.json(result);
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
