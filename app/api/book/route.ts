import { sellResource } from "@/lib/x402merchant";

// $0.001 x402 product: one unlocked ebook chapter (pay-per-read).
export async function GET(request: Request) {
  return sellResource(request, {
    price: "$0.001",
    description: "Ebook chapter: Agentic Payments, Ch.1 (demo)",
    build: () => ({
      title: "Agentic Payments — Chapter 1: The Wallet Behind the Agent",
      vendor: "AgentPay Press",
      body: [
        "For decades software could read the web but never pay for it. An agent",
        "could find the report, the API, the book — and then stop, because the",
        "last step always needed a human with a card.",
        "",
        "That changes when the agent carries its own wallet. Funded once, in",
        "plain dollars, it can settle a fraction-of-a-cent charge the moment a",
        "service asks for it — no checkout page, no re-entered card, no human in",
        "the loop.",
        "",
        "This is the unlock: money becomes just another thing the agent can do.",
      ].join("\n"),
      words: 96,
      asOf: new Date().toISOString(),
    }),
  });
}
