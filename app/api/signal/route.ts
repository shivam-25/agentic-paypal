import { sellResource, fetchCarryAsset } from "@/lib/x402merchant";

// $0.05 x402 product: a computed momentum signal from live Carry order-flow.
export async function GET(request: Request) {
  return sellResource(request, {
    price: "$0.001",
    description: "Commodity momentum signal (demo)",
    build: async () => {
      const a = await fetchCarryAsset("BRENT");
      const chg = Number(a?.changePct24h ?? 0);
      const oiL = Number(a?.openInterestLong ?? 0);
      const oiS = Number(a?.openInterestShort ?? 0);
      const skew = oiL + oiS > 0 ? (oiL - oiS) / (oiL + oiS) : 0;
      const score = chg * 0.6 + skew * 40;
      const bias = score > 0.5 ? "LONG" : score < -0.5 ? "SHORT" : "NEUTRAL";
      const confidence = Math.min(0.95, 0.5 + Math.abs(score) / 10);
      return {
        source: "Carry Quant · computed from live order-flow",
        symbol: "BRENT",
        bias,
        confidence: Number(confidence.toFixed(2)),
        rationale: `24h change ${chg.toFixed(2)}%, OI skew ${(skew * 100).toFixed(1)}% ${
          skew >= 0 ? "long" : "short"
        }.`,
        asOf: new Date().toISOString(),
      };
    },
  });
}
