// Server-side PayPal Orders API (sandbox) helper for the onboarding UI.
const BASE =
  process.env.PAYPAL_API_BASE ||
  (process.env.PAYPAL_ENVIRONMENT === "PRODUCTION"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com");

export async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID ?? "";
  const secret = process.env.PAYPAL_CLIENT_SECRET ?? "";
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

export async function createOrder(amountUSD: string, description: string) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: "USD", value: amountUSD }, description: description.slice(0, 127) },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`createOrder failed: ${JSON.stringify(json)}`);
  return json;
}

export async function getOrder(orderId: string) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`getOrder failed: ${JSON.stringify(json)}`);
  return json;
}

export async function captureOrder(orderId: string) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  // PayPal sandbox sometimes returns an empty body (or a non-JSON blip) on an
  // otherwise-successful capture, and 422 ORDER_ALREADY_CAPTURED on a retry —
  // parse defensively and fall back to the order's actual status.
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  const alreadyCaptured =
    res.status === 422 &&
    JSON.stringify(json).includes("ORDER_ALREADY_CAPTURED");
  if (res.ok && json?.status === "COMPLETED") return json;
  if (res.ok && !json?.status) return await getOrder(orderId); // empty body → re-read
  if (alreadyCaptured) return await getOrder(orderId); // idempotent retry
  if (!res.ok) throw new Error(`capture failed: ${JSON.stringify(json)}`);
  return json;
}
