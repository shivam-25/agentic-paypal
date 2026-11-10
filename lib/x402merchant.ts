import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";

/**
 * Shared seller side for every marketplace product. Each product is an HTTP 402
 * (x402) resource: it answers 402 with a payment challenge until the buyer
 * attaches a settled payment, then returns the unlocked content. Payments are
 * settled in on-chain USD (testnet USDC) on Arbitrum Sepolia via thirdweb's
 * facilitator. Prices are shown to users as plain USD.
 */

const secretKey = process.env.THIRDWEB_SECRET_KEY ?? "";
const serverWalletAddress = process.env.SERVER_WALLET_ADDRESS ?? "";
const payTo = process.env.PAY_TO_ADDRESS || serverWalletAddress;

export function merchantReady() {
  return Boolean(secretKey && serverWalletAddress);
}

/**
 * Sell one resource. `price` is a USD string like "$0.02". `build` produces the
 * unlocked body once payment has settled.
 */
export async function sellResource(
  request: Request,
  opts: { price: string; description: string; build: () => Promise<unknown> | unknown },
) {
  if (!merchantReady()) {
    return Response.json({ error: "Marketplace not configured." }, { status: 500 });
  }

  const client = createThirdwebClient({ secretKey });
  const thirdwebFacilitator = facilitator({ client, serverWalletAddress });

  const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const path = new URL(request.url).pathname;
  const resourceUrl = fwdHost ? `${fwdProto}://${fwdHost}${path}` : new URL(request.url).origin + path;

  // x402 v2 clients send the payment under "payment-signature"; v1 use "x-payment".
  const paymentData =
    request.headers.get("payment-signature") || request.headers.get("x-payment");

  const result: any = await settlePayment({
    resourceUrl,
    method: "GET",
    paymentData,
    payTo,
    network: arbitrumSepolia,
    price: opts.price,
    facilitator: thirdwebFacilitator,
    routeConfig: {
      description: opts.description,
      mimeType: "application/json",
      maxTimeoutSeconds: 3600,
    },
  });

  if (result.status === 200) {
    const body = await opts.build();
    return Response.json(
      { paid: true, price: opts.price, data: body },
      { headers: result.responseHeaders },
    );
  }

  // Not paid yet → hand the 402 challenge back to the client.
  return Response.json(result.responseBody, {
    status: result.status,
    headers: result.responseHeaders,
  });
}

/** Fetch one live asset from Carry's catalogue (test backend) for data products. */
export async function fetchCarryAsset(symbol: string, category = "COMMODITY") {
  try {
    const api = process.env.CARRY_API_BASE || "http://localhost:3002";
    const res = await fetch(`${api}/api/v1/assets?category=${category}`, { cache: "no-store" });
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
      ticker: a.ticker,
    };
  } catch {
    return null;
  }
}
