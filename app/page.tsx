"use client";

import Link from "next/link";

/**
 * AgentPay landing. Explains the product (an MCP that gives any AI agent a
 * wallet) and routes to the live proof: the marketplace and the PayPal funding.
 */
export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">AgentPay</span>
        <h1>Give your AI agent a wallet.</h1>
        <p>
          Install the MCP, fund it once with PayPal, and your agent pays for
          services on its own — data, APIs, books, compute. All in USD.
        </p>
      </div>

      <div className="rails card">
        <div className="rail">
          <b>PayPal</b>
          <span>Money in. Fund the wallet in plain dollars (sandbox).</span>
        </div>
        <div className="arrow">→</div>
        <div className="rail">
          <b>thirdweb wallet</b>
          <span>The agent's wallet holds USD and signs payments.</span>
        </div>
        <div className="arrow">→</div>
        <div className="rail">
          <b>x402</b>
          <span>Pays any pay-per-call service automatically.</span>
        </div>
      </div>

      <div className="ctas">
        <Link className="cta primary" href="/agent">
          Talk to the agent →
        </Link>
        <Link className="cta" href="/market">
          Open the marketplace
        </Link>
        <Link className="cta" href="/onboard">
          Fund a wallet
        </Link>
      </div>

      <div className="card mcp">
        <div className="step-title">Add it to Claude or Codex</div>
        <p className="step-sub2">Drop AgentPay into your MCP config — the host agent gets a wallet and five tools:</p>
        <pre className="snippet">{`{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "agentpay-mcp"]
    }
  }
}`}</pre>
        <div className="tools">
          <code>setup_wallet</code>
          <code>get_balance</code>
          <code>fund_with_paypal</code>
          <code>confirm_funding</code>
          <code>pay_for_service</code>
        </div>
        <p className="step-sub2">
          No LLM key needed — the host agent is the AI. AgentPay only needs a thirdweb key
          and PayPal sandbox credentials.
        </p>
      </div>

      <div className="foot">
        <b>PayPal</b> funds in · <b>thirdweb</b> wallet spends · <b>x402</b> settles · all in USD
      </div>

      <style jsx>{`
        .rails { display: flex; align-items: stretch; gap: 10px; margin-bottom: 24px; }
        .rail { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .rail b { font-size: 15px; }
        .rail span { font-size: 12.5px; color: var(--muted); }
        .arrow { display: grid; place-items: center; color: var(--brand); font-weight: 700; }
        .ctas { display: flex; gap: 12px; margin-bottom: 24px; }
        .cta {
          flex: 1; text-align: center; text-decoration: none; font-weight: 700; font-size: 15px;
          padding: 14px; border-radius: 12px; border: 1.5px solid var(--line); color: var(--ink);
        }
        .cta.primary { color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); border: 0; }
        .step-sub2 { color: var(--muted); font-size: 13.5px; margin: 8px 0 12px; }
        .snippet {
          background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
          padding: 14px; font-size: 12.5px; overflow-x: auto; margin: 0 0 12px;
        }
        .tools { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .tools code {
          background: #efeafb; color: var(--brand-2); font-size: 12px; font-weight: 600;
          padding: 4px 10px; border-radius: 999px;
        }
        .foot { text-align: center; color: var(--muted); font-size: 13px; margin-top: 28px; }
        @media (max-width: 560px) {
          .rails { flex-direction: column; } .arrow { transform: rotate(90deg); }
          .ctas { flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
