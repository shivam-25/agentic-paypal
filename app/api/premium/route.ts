import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";

const secretKey = process.env.THIRDWEB_SECRET_KEY ?? "";
const serverWalletAddress = process.env.SERVER_WALLET_ADDRESS ?? "";
const payTo = process.env.PAY_TO_ADDRESS || serverWalletAddress;

// Where the paid resource comes from: Carry's live asset feed (test backend).
const CARRY_API = process.env.CARRY_API_BASE || "http://localhost:3002";
const PREMIUM_SYMBOL = process.env.PREMIUM_SYMBOL || "BRENT";

const PRICE = "$0.001";

// Fetch one live asset from Carry's catalogue. Returns null on any failure so
// the paid response still succeeds (payment already settled) with a fallback.
async function fetchCarryAsset(symbol: string) {
  try {
    const cat = "COMMODITY";
    const res = await fetch(`${CARRY_API}/api/v1/assets?category=${cat}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const items: any[] = json?.items ?? [];
    const a = items.find((x) => x.symbol === symbol);
    if (!a) return null;
    return {
      source: "Carry Exchange live feed",
      symbol: a.symbol,
      name: a.name,
      lastPrice: a.lastPrice,
      changePct24h: a.changePct24h,
      fundingRate: a.fundingRate,
      openInterestLong: a.openInterestL,
      openInterestShort: a.openInterestS,
      volume24h: a.volume,
      marketClosed: a.marketClosed,
      stale: a.stale,
      ticker: a.ticker,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!secretKey || !serverWalletAddress) {
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  const client = createThirdwebClient({ secretKey });
  const thirdwebFacilitator = facilitator({ client, serverWalletAddress });

  const fwdHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const resourceUrl = fwdHost
    ? `${fwdProto}://${fwdHost}/api/premium`
    : new URL(request.url).origin + "/api/premium";

  // x402 v2 clients (thirdweb default) send the payment under "payment-signature";
  // v1 clients use "x-payment". Accept either so both work.
  const paymentData =
    request.headers.get("payment-signature") || request.headers.get("x-payment");

  try {
    const result: any = await settlePayment({
      resourceUrl,
      method: "GET",
      paymentData,
      payTo,
      network: arbitrumSepolia,
      price: PRICE,
      facilitator: thirdwebFacilitator,
      routeConfig: {
        description: "Live Carry market-data snapshot",
        mimeType: "application/json",
        maxTimeoutSeconds: 3600,
      },
    });

    if (result.status === 200) {
      const asset = await fetchCarryAsset(PREMIUM_SYMBOL);
      return Response.json({
        paid: true,
        settledVia: "x402 / testnet USDC on Arbitrum Sepolia",
        ts: new Date().toISOString(),
        data: asset ?? {
          source: "fallback (Carry feed unavailable)",
          symbol: PREMIUM_SYMBOL,
          note: "Payment settled, but the live feed did not respond.",
        },
      });
    }

    return Response.json(result.responseBody, {
      status: result.status,
      headers: result.responseHeaders,
    });
  } catch (err: any) {
    console.error("[x402] settle THREW:", err?.message ?? String(err));
    return Response.json(
      { error: "settle_failed", detail: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
