/** The marketplace catalogue. One entry per purchasable x402 service. */
export interface Item {
  id: string;
  title: string;
  vendor: string;
  blurb: string;
  priceUSD: string; // display, e.g. "$0.02"
  path: string; // x402 endpoint
  emoji: string;
}

export const CATALOGUE: Item[] = [
  {
    id: "brent",
    title: "Live BRENT market snapshot",
    vendor: "Carry Exchange",
    blurb: "Real-time price, 24h change, funding rate and open interest for Brent crude.",
    priceUSD: "$0.001",
    path: "/api/premium",
    emoji: "📈",
  },
  {
    id: "signal",
    title: "Commodity momentum signal",
    vendor: "Carry Quant",
    blurb: "A computed long/short bias with confidence, derived from live order-flow.",
    priceUSD: "$0.001",
    path: "/api/signal",
    emoji: "🧭",
  },
  {
    id: "book",
    title: "“Agentic Payments” — Chapter 1",
    vendor: "Agentic PayPal Press",
    blurb: "A premium ebook chapter unlocked per-read. No subscription, pay as you go.",
    priceUSD: "$0.001",
    path: "/api/book",
    emoji: "📘",
  },
];

export function itemById(id: string) {
  return CATALOGUE.find((i) => i.id === id);
}
