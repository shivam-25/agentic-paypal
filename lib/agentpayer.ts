import { createThirdwebClient, Engine, defineChain } from "thirdweb";
import { wrapFetchWithPayment } from "thirdweb/x402";

/**
 * The buyer side — the same path the AgentPay MCP uses. The agent's thirdweb
 * server wallet is loaded with the account's secret key, wrapped with x402, and
 * used to pay any HTTP 402 service automatically. Chain-agnostic; defaults to
 * Arbitrum Sepolia. All amounts in USD.
 */

const CHAIN_ID = Number(process.env.AGENTPAY_CHAIN_ID ?? 421614);
// The funded agent wallet (created by the MCP, claimable via the onboard page).
const AGENT_WALLET = process.env.AGENT_WALLET_ADDRESS ?? "";

export function agentConfigured() {
  return Boolean(process.env.THIRDWEB_SECRET_KEY && AGENT_WALLET);
}

export function agentAddress() {
  return AGENT_WALLET;
}

/** Adapt an Engine server wallet into the Wallet shape wrapFetchWithPayment wants. */
function walletAdapter(client: any) {
  const chain = defineChain(CHAIN_ID);
  const sw: any = Engine.serverWallet({ client, address: AGENT_WALLET, chain });
  const account = typeof sw.getAccount === "function" ? sw.getAccount() : sw;
  let c = chain;
  return {
    getAccount: () => account,
    getChain: () => c,
    switchChain: async (x: any) => {
      c = x;
    },
  } as any;
}

/** Decode the x402 settlement header the merchant returns, to surface a tx hash. */
function txFromHeaders(res: Response): string | undefined {
  const h = res.headers.get("x-payment-response") || res.headers.get("payment-response");
  if (!h) return undefined;
  try {
    const json = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
    return json.transaction || json.txHash || json.transactionHash || json?.payer?.transaction;
  } catch {
    return undefined;
  }
}

const USD_ASSET = process.env.AGENTPAY_USDC ?? "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const RPC = process.env.AGENTPAY_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Fallback: find the agent→merchant USDC Transfer tx just settled. */
async function recentTransferTx(payer: string, to: string): Promise<string | undefined> {
  try {
    const head = await rpc("eth_blockNumber", []);
    const latest = parseInt(head, 16);
    const from = "0x" + Math.max(0, latest - 3000).toString(16);
    const pad = (a: string) => "0x" + a.slice(2).toLowerCase().padStart(64, "0");
    const logs = await rpc("eth_getLogs", [
      {
        fromBlock: from,
        toBlock: "latest",
        address: USD_ASSET,
        topics: [TRANSFER_TOPIC, pad(payer), pad(to)],
      },
    ]);
    if (Array.isArray(logs) && logs.length) return logs[logs.length - 1].transactionHash;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Read the agent wallet's USD balance (for the agent console's get_balance tool). */
export async function agentUsdBalance(): Promise<{ usd: string; address: string }> {
  const addr = AGENT_WALLET;
  if (!addr) return { usd: "$0.00", address: "" };
  try {
    const data = "0x70a08231" + "0".repeat(24) + addr.slice(2);
    const raw = await rpc("eth_call", [{ to: USD_ASSET, data }, "latest"]);
    const usd = Number(BigInt(raw ?? "0x0")) / 1e6;
    return { usd: `$${usd.toFixed(2)}`, address: addr };
  } catch {
    return { usd: "$0.00", address: addr };
  }
}

async function rpc(method: string, params: any[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  return (await res.json()).result;
}

export async function agentBuy(url: string, maxUSD?: string) {
  const client = createThirdwebClient({ secretKey: process.env.THIRDWEB_SECRET_KEY! });
  const wallet = walletAdapter(client);
  const maxValue = maxUSD
    ? BigInt(Math.round(Number(String(maxUSD).replace(/[$,\s]/g, "")) * 1e6))
    : undefined;

  const fetchWithPay = wrapFetchWithPayment(fetch, client, wallet, { maxValue });
  const res = await fetchWithPay(url, { method: "GET" });
  let txHash = txFromHeaders(res);
  // The header may carry an Engine queue id (UUID), not a chain hash. Only keep
  // a real 0x… transaction hash; otherwise resolve it from the Transfer log.
  if (!(txHash && /^0x[0-9a-fA-F]{64}$/.test(txHash))) txHash = undefined;
  if (res.status === 200 && !txHash) {
    const merchant = process.env.PAY_TO_ADDRESS || process.env.SERVER_WALLET_ADDRESS || "";
    if (merchant) txHash = await recentTransferTx(AGENT_WALLET, merchant);
  }

  const txt = await res.text();
  let body: any = txt;
  try {
    body = JSON.parse(txt);
  } catch {
    /* keep text */
  }
  return { paid: res.status === 200, status: res.status, body, txHash };
}
