# AgentPay — a wallet for AI agents

A standalone demo of the core idea: **give an autonomous AI agent its own wallet so
it can pay for the services it needs, on its own.** A human funds the wallet once with
PayPal; from then on the agent pays per call over **x402** (HTTP `402 Payment Required`)
with no further approval.

```
PayPal (fiat on-ramp)  →  on-chain USD in a secure agent wallet  →  x402 pay-per-call
```

## Flow

```
① Fund once with PayPal   →  human approves a one-time top-up in PayPal
② Treasury bridge         →  dollars move on-chain as USD into the agent's secure wallet
③ Agent spends on its own →  each service is a 402-gated endpoint; the wallet signs a
                             USD payment, it settles on-chain, the server returns data
```

## Two ways to run it

- **Agent Console** (`/agent`) — an in-browser chat where an LLM is the agent. From one
  prompt it checks its balance, browses the marketplace, funds via PayPal, and buys
  several services autonomously. This is the standalone demo and needs its own LLM key
  (`GEMINI_API_KEY` or `OPENROUTER_API_KEY`).
- **As an MCP** — the sibling [`agentpay-mcp`](https://github.com/shivam-25/agentpay-mcp)
  server exposes the same tools over the Model Context Protocol. Added to Claude Desktop /
  Claude Code, **Claude itself becomes the paying agent — no extra LLM key needed.**

## Stack

- **Next.js 15** — UI + the x402-gated API routes
- **x402** (`@x402/core`, `@x402/evm`) — pay-per-call: `402` challenge → signed USD payment → settle → data
- **PayPal** (sandbox) — the fiat on-ramp that funds the wallet
- Managed **server wallet** on an Arbitrum testnet — holds funds and signs payments
- An LLM (Gemini via OpenAI-compat, or OpenRouter) drives the Agent Console

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in LLM + PayPal + wallet values
npm run dev                        # http://localhost:4021  (console at /agent)
```

See `.env.local.example` for every variable and where it comes from. `.env.local` is
gitignored — never commit keys.

## Key routes

| Path | Purpose |
|---|---|
| `/agent` | Agent Console — the main demo |
| `/api/agent/chat` | LLM tool-calling loop (5 tools: balance, browse, fund, confirm, pay) |
| `/api/paypal/create-order`, `/api/paypal/capture-order` | PayPal fiat on-ramp |
| `/api/premium`, `/api/signal` | x402-gated services the agent buys |

## `demo-video/`

Scripts and source for the narrated demo video (AI voiceover slides + the live
end-to-end screen recording). See [`demo-video/README.md`](demo-video/README.md) for the
update loop (`gen_vo.py` → `deck/deck.html` → `deck/build.sh`, or `./rebuild.sh`).

## Security

The demo uses **sandbox / testnet** credentials only. Rotate any PayPal, LLM, or wallet
key that is exposed, and keep this repo private.
