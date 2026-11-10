import { Engine, createThirdwebClient, getContract, defineChain } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";

/**
 * The on-ramp bridge that makes PayPal and thirdweb complementary: when a user
 * pays on PayPal, the treasury (a thirdweb server wallet) moves the same amount
 * of on-chain USD into the agent's thirdweb wallet. PayPal = money in, thirdweb
 * wallet = money the agent spends.
 */
const CHAIN_ID = Number(process.env.AGENTPAY_CHAIN_ID ?? 421614);
const USD_ASSET =
  process.env.AGENTPAY_USDC ?? "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const TREASURY = process.env.AGENTPAY_TREASURY_ADDRESS ?? "";

export function treasuryConfigured() {
  return Boolean(TREASURY && process.env.THIRDWEB_SECRET_KEY);
}

/** Disburse `amountUSD` of on-chain USD from the treasury to a wallet. */
export async function disburse(toAddress: string, amountUSD: string) {
  if (!treasuryConfigured()) return { queued: false, reason: "treasury not configured" };
  const client = createThirdwebClient({ secretKey: process.env.THIRDWEB_SECRET_KEY! });
  const chain = defineChain(CHAIN_ID);
  const contract = getContract({ client, chain, address: USD_ASSET });
  const treasury: any = Engine.serverWallet({ client, address: TREASURY, chain });

  const tx = transfer({
    contract,
    to: toAddress,
    amount: Number(String(amountUSD).replace(/[$,\s]/g, "")),
  });

  if (typeof treasury.enqueueTransaction === "function") {
    const r = await treasury.enqueueTransaction({ transaction: tx });
    return { queued: true, ref: r?.transactionId ?? r?.id };
  }
  const { sendTransaction } = await import("thirdweb");
  const r = await sendTransaction({ account: treasury, transaction: tx });
  return { queued: true, ref: (r as any)?.transactionHash };
}
