import { runTool } from "@/lib/agenttools";

/**
 * A direct store purchase chosen by the user (not the agent). Runs the same
 * buy_product logic: within the auto-pay limit it is paid from the wallet; above
 * it, a PayPal approval link is returned and the UI completes via /api/store/confirm.
 */
export async function POST(request: Request) {
  try {
    const { productId, qty } = await request.json();
    const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const fwdProto = request.headers.get("x-forwarded-proto") || "https";
    const origin = fwdHost ? `${fwdProto}://${fwdHost}` : new URL(request.url).origin;
    const result = await runTool("buy_product", { productId, qty, decidedBy: "user" }, origin);
    return Response.json(result);
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
