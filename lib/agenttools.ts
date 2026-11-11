import { CATALOGUE, itemById } from "./catalogue";
import { PRODUCTS, STORE_NAME, productById } from "./store";
import { agentBuy, agentUsdBalance } from "./agentpayer";
import { createOrder, captureOrder, getOrder } from "./paypal";
import { disburse, treasuryConfigured } from "./treasury";
import { canAutoPay, getLimits } from "./limits";
import { linkPaypal } from "./account";
import { recordPendingOrder, recordAutoPaidOrder, markOrderPaid, loadOrders, recordFunding } from "./orders";

const MERCHANT = process.env.AGENTPAY_DEMO_MERCHANT ?? STORE_NAME;

/**
 * The Agentic PayPal tools, exposed to an LLM via OpenRouter function-calling.
 * These are the same capabilities as the MCP server (link_paypal, browse_store,
 * buy_product, confirm_purchase, plus the x402 service tools) so the in-browser
 * agent behaves exactly like the agent inside Claude Desktop.
 */

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "link_paypal",
      description:
        "Log in / link the user's PayPal account by email. Call this first. The agent wallet is linked to this PayPal email; purchases run through it.",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "The user's PayPal email." } },
        required: ["email"],
      },
    },
  },
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
      name: "browse_store",
      description:
        "List the goods for sale in the merchant store, with id, name and USD price, plus the automatic-payment limit.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buy_product",
      description:
        "Buy a product from the store by id. If the total is within the user's automatic limit it is paid from the wallet right away (micro); otherwise a PayPal approval link is returned and the user must approve, then call confirm_purchase (macro). Set decidedBy to 'agent' with a reason when you chose the purchase yourself for a task the user gave.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "A product id from browse_store." },
          qty: { type: "number", description: "Quantity (default 1)." },
          decidedBy: { type: "string", enum: ["user", "agent"], description: "Who chose this. Default 'user'." },
          reason: { type: "string", description: "Why the agent chose this, when decidedBy is 'agent'." },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_purchase",
      description: "Capture a PayPal purchase the user has approved, completing a macro (above-limit) order.",
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
      name: "browse_market",
      description: "List the x402 data services the agent can buy, with id, title, vendor and USD price.",
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
    case "link_paypal": {
      const email = String(args.email ?? "").trim();
      if (!email || !email.includes("@")) return { error: "Provide the user's PayPal email." };
      const account = linkPaypal(email);
      const { usd } = await agentUsdBalance().catch(() => ({ usd: "$0.00" }));
      return { linked: true, email: account.email, address: account.address, balanceUSD: usd };
    }
    case "get_balance":
      return await agentUsdBalance();
    case "browse_store": {
      const { autoApproveLimitUSD } = getLimits();
      return {
        store: MERCHANT,
        autoApproveLimitUSD,
        products: PRODUCTS.map((p) => ({ id: p.id, name: p.name, priceUSD: p.priceUSD, emoji: p.emoji })),
      };
    }
    case "buy_product": {
      const product = productById(args.productId);
      if (!product) return { error: `Unknown product "${args.productId}". Call browse_store first.` };
      const qty = Number(args.qty) > 0 ? Math.floor(Number(args.qty)) : 1;
      const total = Number(product.priceUSD) * qty;
      const totalUSD = total.toFixed(2);
      const item = `${qty}× ${product.name}`;
      const decidedBy: "user" | "agent" = args.decidedBy === "agent" ? "agent" : "user";
      const reason = args.reason ? String(args.reason) : undefined;

      const check = await canAutoPay(total);
      if (check.ok) {
        const id = `auto-${Date.now()}`;
        // Micro purchase: paid from the pre-funded wallet, no approval.
        recordAutoPaidOrder({ id, item, merchant: MERCHANT, amountUSD: totalUSD, decidedBy, reason });
        return { mode: "auto", paid: true, item, amountUSD: totalUSD, merchant: MERCHANT, decidedBy, reason };
      }

      // Macro purchase: needs PayPal approval.
      const order: any = await createOrder(totalUSD, `Agentic PayPal: ${item} from ${MERCHANT}`);
      const approveUrl = (order.links ?? []).find((l: any) => l.rel === "approve")?.href;
      recordPendingOrder({ id: order.id, item, merchant: MERCHANT, amountUSD: totalUSD, approveUrl, decidedBy, reason });
      return {
        mode: "approval",
        paid: false,
        orderId: order.id,
        item,
        amountUSD: totalUSD,
        merchant: MERCHANT,
        reason: check.reason,
        approveUrl,
        decidedBy,
        note: "Tell the human to click Approve payment in PayPal, then call confirm_purchase with orderId.",
      };
    }
    case "confirm_purchase": {
      // The LLM may pass a stale/made-up id, or spuriously re-run buy_product and
      // leave several pending orders. Capture the order PayPal actually reports as
      // APPROVED (the one the user signed off on), not just the latest local one.
      const awaiting = loadOrders().filter((o) => o.status === "awaiting_approval");
      const candidates = [
        ...(args.orderId && awaiting.some((o) => o.id === args.orderId) ? [args.orderId] : []),
        ...awaiting.map((o) => o.id),
      ];
      let chosen: string | undefined;
      for (const id of candidates) {
        try {
          const o = await getOrder(id);
          if (o?.status === "APPROVED" || o?.status === "COMPLETED") { chosen = id; break; }
        } catch {
          /* skip ids PayPal doesn't know */
        }
      }
      if (!chosen) return { status: "AWAITING_APPROVAL", completed: false, note: "No approved order found yet." };
      const cap = await captureOrder(chosen);
      const amountUSD = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      if (cap.status === "COMPLETED") markOrderPaid(chosen);
      return { orderId: chosen, status: cap.status, amountUSD, completed: cap.status === "COMPLETED" };
    }
    case "browse_market":
      return CATALOGUE.map((i) => ({
        id: i.id,
        title: i.title,
        vendor: i.vendor,
        priceUSD: i.priceUSD,
      }));
    case "fund_with_paypal": {
      const amt = Number(String(args.amountUSD ?? "1").replace(/[$,\s]/g, "")).toFixed(2);
      const order: any = await createOrder(amt, "Agentic PayPal wallet top-up");
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
      if (cap.status === "COMPLETED" && amountUSD) recordFunding(amountUSD);
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
