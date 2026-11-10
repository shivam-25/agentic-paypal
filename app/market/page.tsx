"use client";

import { useEffect, useState } from "react";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * The AgentPay marketplace. Each item is an x402-gated service. The "Let my
 * agent buy this" button has the agent wallet pay over x402 (the same path the
 * MCP uses) and shows the unlocked content plus the on-chain settlement tx.
 */

type Bought = {
  priceUSD: string;
  txHash?: string;
  explorer?: string | null;
  unlocked: any;
};

export default function Market() {
  const [balance, setBalance] = useState<string>("…");
  const [addr, setAddr] = useState<string>("");
  const [busy, setBusy] = useState<string>("");
  const [bought, setBought] = useState<Record<string, Bought>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  async function loadBalance() {
    try {
      const r = await fetch("/api/agent/balance").then((x) => x.json());
      setBalance(r.usd ?? "$0.00");
      setAddr(r.address ?? "");
    } catch {
      setBalance("$0.00");
    }
  }
  useEffect(() => {
    loadBalance();
  }, []);

  async function buy(itemId: string) {
    setBusy(itemId);
    setErr((e) => ({ ...e, [itemId]: "" }));
    try {
      const r = await fetch("/api/agent/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setBought((b) => ({
        ...b,
        [itemId]: { priceUSD: r.priceUSD, txHash: r.txHash, explorer: r.explorer, unlocked: r.unlocked },
      }));
      loadBalance();
    } catch (e: any) {
      setErr((x) => ({ ...x, [itemId]: e?.message ?? String(e) }));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">AgentPay · Marketplace</span>
        <h1>Services your agent can buy</h1>
        <p>Each item is pay-per-call. Your AI agent settles it automatically — no checkout.</p>
      </div>

      <div className="walletbar">
        <div>
          <div className="wlabel">Agent wallet balance</div>
          <div className="wbal">{balance} <span>USD</span></div>
          {addr && <div className="waddr">{addr}</div>}
        </div>
        <a className="fundlink" href={`/onboard?addr=${addr}`}>+ Fund with PayPal</a>
      </div>

      <div className="grid">
        {CATALOGUE.map((item) => {
          const b = bought[item.id];
          return (
            <section className="product" key={item.id}>
              <div className="phead">
                <span className="pemoji">{item.emoji}</span>
                <div>
                  <div className="ptitle">{item.title}</div>
                  <div className="pvendor">{item.vendor}</div>
                </div>
                <span className="price">{item.priceUSD}</span>
              </div>
              <p className="pblurb">{item.blurb}</p>

              {!b ? (
                <button className="buybtn" disabled={busy === item.id} onClick={() => buy(item.id)}>
                  {busy === item.id ? "Agent is paying…" : "Let my agent buy this"}
                </button>
              ) : (
                <div className="unlocked">
                  <div className="paidrow">
                    <span className="pill">✓ Paid {b.priceUSD}</span>
                    {b.explorer && (
                      <a className="txlink" href={b.explorer} target="_blank" rel="noreferrer">
                        on-chain receipt ↗
                      </a>
                    )}
                  </div>
                  <pre className="content">{JSON.stringify(b.unlocked, null, 2)}</pre>
                </div>
              )}
              {err[item.id] && <div className="perr">{err[item.id]}</div>}
            </section>
          );
        })}
      </div>

      <div className="foot">
        <b>PayPal</b> funds the wallet in USD · <b>thirdweb</b> wallet pays services over{" "}
        <b>x402</b> · testnet / sandbox
      </div>

      <style jsx>{`
        .walletbar {
          display: flex; align-items: center; justify-content: space-between;
          background: #fff; border: 1px solid var(--line); border-radius: 16px;
          padding: 16px 20px; margin-bottom: 22px;
        }
        .wlabel { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; }
        .wbal { font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
        .wbal span { font-size: 14px; color: var(--muted); font-weight: 600; }
        .waddr { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); margin-top: 2px; }
        .fundlink {
          background: #0070e0; color: #fff; text-decoration: none; font-weight: 700;
          padding: 11px 16px; border-radius: 999px; font-size: 14px; white-space: nowrap;
        }
        .grid { display: flex; flex-direction: column; gap: 16px; }
        .product {
          background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 1px 2px rgba(26,19,39,.04);
        }
        .phead { display: flex; align-items: center; gap: 12px; }
        .pemoji { font-size: 26px; }
        .ptitle { font-weight: 700; font-size: 16px; }
        .pvendor { color: var(--muted); font-size: 12.5px; }
        .price { margin-left: auto; font-weight: 800; font-size: 18px; color: var(--brand); }
        .pblurb { color: var(--muted); font-size: 14px; margin: 12px 0 16px; }
        .buybtn {
          width: 100%; border: 0; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700;
          color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); cursor: pointer;
        }
        .buybtn:disabled { opacity: .7; cursor: wait; }
        .unlocked { margin-top: 4px; }
        .paidrow { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .txlink { color: var(--brand-2); font-weight: 600; font-size: 13px; text-decoration: none; }
        .content {
          background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
          padding: 12px 14px; font-size: 12px; overflow-x: auto; margin: 0; white-space: pre-wrap;
        }
        .perr { color: #b91c1c; font-size: 13px; margin-top: 10px; }
        .foot { text-align: center; color: var(--muted); font-size: 13px; margin-top: 30px; }
      `}</style>
    </main>
  );
}
