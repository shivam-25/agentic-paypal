import { agentAddress } from "@/lib/agentpayer";

const USD_ASSET = process.env.AGENTPAY_USDC ?? "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const RPC = process.env.AGENTPAY_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

// Available USD balance of the agent wallet (read-only), for the storefront header.
export async function GET() {
  const addr = agentAddress();
  if (!addr) return Response.json({ usd: "$0.00", address: "" });
  try {
    const data = "0x70a08231" + "0".repeat(24) + addr.slice(2);
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: USD_ASSET, data }, "latest"],
      }),
      cache: "no-store",
    });
    const json = await res.json();
    const raw = BigInt(json?.result ?? "0x0");
    const usd = Number(raw) / 1e6;
    return Response.json({ usd: `$${usd.toFixed(2)}`, address: addr });
  } catch {
    return Response.json({ usd: "$0.00", address: addr });
  }
}
