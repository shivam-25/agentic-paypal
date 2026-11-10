import { createOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const { amountUSD, address } = await request.json();
    const amt = Number(String(amountUSD).replace(/[$,\s]/g, "")).toFixed(2);
    const order = await createOrder(amt, `AgentPay top-up${address ? ` for ${address}` : ""}`);
    return Response.json({ id: order.id, status: order.status });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
