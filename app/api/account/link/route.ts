import { linkPaypal } from "@/lib/account";
import { agentUsdBalance } from "@/lib/agentpayer";

/**
 * "Log in with PayPal" → create/link the agent wallet. The user's PayPal email
 * is the identity; the agent wallet (thirdweb) is linked to it deterministically.
 * Returns the linked email, the wallet address, and its USD/PyUSD balance.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return Response.json({ error: "email required" }, { status: 400 });
    }
    const account = linkPaypal(email.trim());
    const bal = await agentUsdBalance();
    return Response.json({
      email: account.email,
      address: account.address || bal.address,
      balanceUSD: bal.usd,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
