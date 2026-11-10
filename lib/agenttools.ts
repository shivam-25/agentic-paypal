import { CATALOGUE, itemById } from "./catalogue";
import { agentBuy, agentUsdBalance } from "./agentpayer";
import { createOrder, captureOrder } from "./paypal";
import { disburse, treasuryConfigured } from "./treasury";

/**
 * The AgentPay tools, exposed to an LLM via OpenRouter function-calling. These
 * are the same capabilities as the MCP server (get_balance, browse_market,
 * fund_with_paypal, confirm_funding, pay_for_service) so the in-browser agent
 * behaves exactly like the agent inside Claude Desktop.
 */

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Get the agent wallet's available USD balance and address.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_market",
      description: "List the services the agent can buy, with id, title, vendor and USD price.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "fund_with_paypal",
      description:
        "Create a PayPal top-up for the wallet. Returns an approval link the human must open and approve. After they approve, call confirm_funding with the returned orderId.",
      parameters: {
        type: "object",
        properties: { amountUSD: { type: "string", description: 'USD amount, e.g. "1.00".' } },
        required: ["amountUSD"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_funding",
      description: "Capture an approved PayPal top-up and credit the wallet with on-chain USD.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pay_for_service",
      description:
        "Buy a marketplace item by its id (from browse_market). Pays automatically over x402 from the wallet and returns the unlocked content plus the on-chain receipt.",
      parameters: {
        type: "object",
        properties: { itemId: { type: "string", description: "Item id, e.g. brent, signal, book." } },
        required: ["itemId"],
      },
    },
  },
];

export async function runTool(name: string, args: any, origin: string): Promise<any> {
  switch (name) {
    case "get_balance":
      return await agentUsdBalance();
    case "browse_market":
      return CATALOGUE.map((i) => ({
        id: i.id,
        title: i.title,
        vendor: i.vendor,
        priceUSD: i.priceUSD,
      }));
    case "fund_with_paypal": {
      const amt = Number(String(args.amountUSD ?? "1").replace(/[$,\s]/g, "")).toFixed(2);
      const order: any = await createOrder(amt, "AgentPay wallet top-up");
      const approveUrl = (order.links ?? []).find((l: any) => l.rel === "approve")?.href;
      return {
        orderId: order.id,
        status: order.status,
        amountUSD: amt,
        approveUrl,
        note: "Tell the human to click the Approve Payment button, then call confirm_funding with orderId.",
      };
    }
    case "confirm_funding": {
      const cap = await captureOrder(args.orderId);
      const amountUSD = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      let credited = false;
      const { address } = await agentUsdBalance();
      if (address && amountUSD && treasuryConfigured()) {
        try {
          const d = await disburse(address, amountUSD);
          credited = d.queued;
        } catch {
          /* capture ok; credit retriable */
        }
      }
      return { status: cap.status, amountUSD, credited };
    }
    case "pay_for_service": {
      const item = itemById(args.itemId);
      if (!item) return { error: `Unknown item "${args.itemId}". Call browse_market first.` };
      const url = origin + item.path;
      const r = await agentBuy(url, item.priceUSD);
      if (!r.paid) return { paid: false, status: r.status, error: "Payment did not settle." };
      return {
        paid: true,
        priceUSD: item.priceUSD,
        txHash: r.txHash,
        explorer: r.txHash ? `https://sepolia.arbiscan.io/tx/${r.txHash}` : null,
        unlocked: (r.body as any)?.data ?? r.body,
      };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}
