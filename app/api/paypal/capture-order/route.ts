import { captureOrder } from "@/lib/paypal";
import { disburse, treasuryConfigured } from "@/lib/treasury";

export async function POST(request: Request) {
  try {
    const { orderId, address } = await request.json();
    const result = await captureOrder(orderId);
    const cap = result?.purchase_units?.[0]?.payments?.captures?.[0];
    const amountUSD = cap?.amount?.value;

    // The bridge: PayPal (fiat) → thirdweb wallet (on-chain USD the agent spends).
    let credited = false;
    let creditRef: string | undefined;
    if (address && amountUSD && treasuryConfigured()) {
      try {
        const d = await disburse(address, amountUSD);
        credited = d.queued;
        creditRef = (d as any).ref;
      } catch {
        /* capture still succeeded; credit can be retried */
      }
    }

    return Response.json({
      status: result.status,
      amountUSD,
      captureId: cap?.id,
      credited,
      creditRef,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
