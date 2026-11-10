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

Scripts and source for the narrated demo video (AI-voiceover slides + the live
end-to-end screen recording).

```
demo-video/
├── README.md          ← full update guide (the 4-step loop)
├── rebuild.sh         ← one-command re-render (--voice also redoes narration)
├── gen_vo.py          ← narration text + voice (edit SEGMENTS here)
├── gen_vo2.py         ← one-off (ignore)
├── vo/                ← generated narration wavs + manifest.json
└── deck/
    ├── deck.html      ← all slides (scene = ?s=<name>)
    ├── build.sh       ← assembles the explainer
    ├── frames/        ← rendered slide PNGs
    ├── shots/         ← demo screenshots
    ├── agentpay-explainer.mp4   (~1:21)
    └── agentpay-full.mp4        (~2:11, with live tail)
```

### Modifying the video

1. **Change the narration** — edit the `SEGMENTS` list in `demo-video/gen_vo.py`.
   Spell `402` as `x4-0-2` and `A.I.` with periods so the voice reads them correctly;
   keep "secure wallet" / "USD" (no vendor names). Voice is `VOICE="Charon"` (male;
   alts: Puck, Fenrir, Orus). Regenerate:
   ```bash
   cd demo-video
   GEMINI_API_KEY='<key>' python3 gen_vo.py && cp /tmp/vo/*.wav vo/
   ```
   It prints each segment's duration — you need those for step 3.
2. **Change the slides** — edit `demo-video/deck/deck.html` (scenes: title, onramp,
   custody, x402, arch, close, live, demo). Re-render one scene:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --window-size=1280,720 --virtual-time-budget=4000 \
     --screenshot=deck/frames/x402.png "file://$PWD/deck/deck.html?s=x402"
   ```
3. **Re-assemble the explainer** — in `demo-video/deck/build.sh`, the slide `duration`
   lines (the `ilist.txt` block) must sum to the narration length and track the segment
   each slide narrates, so update them whenever the narration changes. Then:
   ```bash
   cd demo-video/deck && ./build.sh      # → agentpay-explainer.mp4
   ```
4. **Re-stitch the live tail** — normalize explainer + "Live" card + live recording to
   1280×720 / 30fps / 48k-stereo, then concat → `agentpay-full.mp4` (see
   `demo-video/README.md` step 4 for the exact ffmpeg commands).

Shortcut: `cd demo-video && ./rebuild.sh` re-renders slides + explainer in one go
(add `--voice` to also regenerate the narration). Full details in
[`demo-video/README.md`](demo-video/README.md).

## Security

The demo uses **sandbox / testnet** credentials only. Rotate any PayPal, LLM, or wallet
key that is exposed, and keep this repo private.
