import { getLimits, setLimits } from "@/lib/limits";

/** Read or set the user's automatic-payment limits (per-purchase + daily). */

export async function GET() {
  return Response.json(getLimits());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    autoApproveLimitUSD?: number;
    dailyLimitUSD?: number;
  };
  const current = getLimits();
  const perPurchase = Number.isFinite(Number(body.autoApproveLimitUSD))
    ? Number(body.autoApproveLimitUSD)
    : current.autoApproveLimitUSD;
  const perDay = Number.isFinite(Number(body.dailyLimitUSD))
    ? Number(body.dailyLimitUSD)
    : current.dailyLimitUSD;
  return Response.json(setLimits(perPurchase, perDay));
}
