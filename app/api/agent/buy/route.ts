import { itemById } from "@/lib/catalogue";
import { agentBuy, agentConfigured, agentAddress } from "@/lib/agentpayer";

/**
 * The demo's one-click proof: the agent wallet pays for a marketplace item over
 * x402 and returns the unlocked content plus the on-chain settlement tx. This is
 * exactly what the AgentPay MCP's pay_for_service tool does, exposed as a button.
 */
export async function POST(request: Request) {
  try {
    if (!agentConfigured()) {
      return Response.json(
        { error: "Agent wallet not configured (set AGENT_WALLET_ADDRESS)." },
        { status: 500 },
      );
    }
    const { itemId } = await request.json();
    const item = itemById(itemId);
    if (!item) return Response.json({ error: "Unknown item." }, { status: 404 });

    const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const fwdProto = request.headers.get("x-forwarded-proto") || "https";
    const url = `${fwdProto}://${fwdHost}${item.path}`;

    const r = await agentBuy(url, item.priceUSD);
    if (!r.paid) {
      return Response.json(
        { error: `Payment did not settle (status ${r.status}).`, detail: r.body },
        { status: 502 },
      );
    }
    return Response.json({
      ok: true,
      itemId,
      priceUSD: item.priceUSD,
      payer: agentAddress(),
      txHash: r.txHash,
      explorer: r.txHash ? `https://sepolia.arbiscan.io/tx/${r.txHash}` : null,
      unlocked: (r.body as any)?.data ?? r.body,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
