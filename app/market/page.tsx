"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/lib/store";

/**
 * The Agentic PayPal store. Each item is a physical good. "Buy" pays from the
 * agent wallet when the price is within your automatic limit (micro), otherwise
 * it returns a PayPal approval link you complete (macro). This is the user-buys
 * path; the agent can buy the same goods in the Agent Console.
 */

type Buy =
  | { mode: "auto"; item: string; amountUSD: string; merchant: string }
  | { mode: "approval"; orderId: string; item: string; amountUSD: string; approveUrl?: string; reason?: string; done?: boolean };

export default function Store() {
  const [balance, setBalance] = useState<string>("…");
  const [addr, setAddr] = useState<string>("");
  const [limit, setLimit] = useState<number>(0);
  const [busy, setBusy] = useState<string>("");
  const [state, setState] = useState<Record<string, Buy>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<any[]>([]);

  async function loadBalance() {
    try {
      const r = await fetch("/api/agent/balance").then((x) => x.json());
      setBalance(r.usd ?? "$0.00");
      setAddr(r.address ?? "");
    } catch {
      setBalance("$0.00");
    }
  }
  async function loadActivity() {
    try {
      const r = await fetch("/api/orders").then((x) => x.json());
      setActivity(Array.isArray(r.orders) ? r.orders : []);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    loadBalance();
    loadActivity();
    fetch("/api/limits").then((x) => x.json()).then((d) => setLimit(d.autoApproveLimitUSD)).catch(() => {});
  }, []);

  async function buy(productId: string) {
    setBusy(productId);
    setErr((e) => ({ ...e, [productId]: "" }));
    try {
      const r = await fetch("/api/store/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setState((s) => ({ ...s, [productId]: r }));
      loadBalance();
      loadActivity();
    } catch (e: any) {
      setErr((x) => ({ ...x, [productId]: e?.message ?? String(e) }));
    } finally {
      setBusy("");
    }
  }

  async function complete(productId: string, orderId: string) {
    setBusy(productId);
    try {
      const r = await fetch("/api/store/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setState((s) => ({ ...s, [productId]: { ...(s[productId] as any), done: r.completed } }));
      loadBalance();
      loadActivity();
    } catch (e: any) {
      setErr((x) => ({ ...x, [productId]: e?.message ?? String(e) }));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">Agentic PayPal · Store</span>
        <h1>Goods you (or your agent) can buy</h1>
        <p>
          Purchases up to <b>${limit.toFixed(0)}</b> are paid from the wallet automatically. Larger ones
          ask for your PayPal approval.
        </p>
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
        {PRODUCTS.map((p) => {
          const s = state[p.id];
          const price = Number(p.priceUSD);
          const willAuto = price <= limit;
          return (
            <section className="product" key={p.id}>
              <div className="phead">
                <span className="pemoji">{p.emoji}</span>
                <div>
                  <div className="ptitle">{p.name}</div>
                  <div className="pvendor">{p.description}</div>
                </div>
                <span className="price">${p.priceUSD}</span>
              </div>

              {!s && (
                <button className="buybtn" disabled={busy === p.id} onClick={() => buy(p.id)}>
                  {busy === p.id ? "Processing…" : willAuto ? "Buy — auto-pay" : "Buy — needs approval"}
                </button>
              )}

              {s?.mode === "auto" && (
                <div className="paidrow"><span className="pill">✓ Paid ${s.amountUSD} from wallet · {s.merchant}</span></div>
              )}

              {s?.mode === "approval" && !s.done && (
                <div className="approvewrap">
                  <div className="note">${s.amountUSD} — {s.reason}</div>
                  {s.approveUrl && (
                    <a className="approvebtn" href={s.approveUrl} target="_blank" rel="noreferrer">
                      Approve payment in PayPal ↗
                    </a>
                  )}
                  <button className="donebtn" disabled={busy === p.id} onClick={() => complete(p.id, s.orderId)}>
                    {busy === p.id ? "Completing…" : "I've approved — complete"}
                  </button>
                </div>
              )}

              {s?.mode === "approval" && s.done && (
                <div className="paidrow"><span className="pill">✓ Purchase complete · ${s.amountUSD}</span></div>
              )}

              {err[p.id] && <div className="perr">{err[p.id]}</div>}
            </section>
          );
        })}
      </div>

      <section className="activity">
        <div className="ahead">Recent activity</div>
        {activity.length === 0 && <div className="aempty">No activity yet — log in and buy something.</div>}
        {activity.map((o) => {
          const funding = o.kind === "funding";
          const paid = o.status === "paid";
          return (
            <div className="arow" key={o.id}>
              <span className="aicon">{funding ? "＋" : paid ? "✓" : "⏳"}</span>
              <div className="amain">
                <div className="atitle">
                  {funding ? "Wallet top-up" : o.item}
                  {!funding && o.decidedBy === "agent" && <span className="atag">agent</span>}
                  {!funding && o.auto && <span className="atag auto">auto-pay</span>}
                </div>
                <div className="asub">
                  {funding ? "Funded via PayPal" : o.merchant}
                  {" · "}
                  {paid ? (funding || o.auto ? "paid" : "approved & captured") : "awaiting approval"}
                </div>
              </div>
              <span className={"aamt" + (funding ? " plus" : "")}>{funding ? "+" : "−"}${o.amountUSD}</span>
            </div>
          );
        })}
      </section>

      <div className="foot">
        <b>PayPal</b> links & funds the wallet · the <b>wallet</b> buys goods · micro auto-pays, macro you approve · sandbox
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
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .product {
          background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(26,19,39,.04);
        }
        .phead { display: flex; align-items: center; gap: 12px; }
        .pemoji { font-size: 24px; }
        .ptitle { font-weight: 700; font-size: 15.5px; }
        .pvendor { color: var(--muted); font-size: 12.5px; }
        .price { margin-left: auto; font-weight: 800; font-size: 17px; color: var(--brand); }
        .buybtn {
          width: 100%; border: 0; border-radius: 12px; padding: 12px; font-size: 14.5px; font-weight: 700;
          color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); cursor: pointer; margin-top: 14px;
        }
        .buybtn:disabled { opacity: .7; cursor: wait; }
        .approvewrap { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; align-items: flex-start; }
        .note { font-size: 13px; color: var(--muted); }
        .approvebtn {
          display: inline-flex; align-items: center; gap: 6px; background: #0070e0; color: #fff !important;
          text-decoration: none; padding: 10px 18px; border-radius: 999px; font-weight: 700; font-size: 13.5px;
        }
        .donebtn {
          border: 1.5px solid var(--line); background: #fff; color: var(--ink); border-radius: 999px;
          padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: pointer;
        }
        .paidrow { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
        .pill { background: #e9f8ef; color: #137a3d; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 700; }
        .perr { color: #b91c1c; font-size: 13px; margin-top: 10px; }
        .activity {
          background: #fff; border: 1px solid var(--line); border-radius: 16px;
          padding: 8px 20px 12px; margin-top: 22px; box-shadow: 0 1px 2px rgba(26,19,39,.04);
        }
        .ahead { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; padding: 12px 0 6px; font-weight: 700; }
        .aempty { color: var(--muted); font-size: 13.5px; padding: 6px 0 12px; }
        .arow { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--line); }
        .aicon {
          width: 26px; height: 26px; flex: none; border-radius: 50%; display: grid; place-items: center;
          background: var(--ok-bg); color: var(--ok); font-weight: 800; font-size: 13px;
        }
        .amain { flex: 1; min-width: 0; }
        .atitle { font-weight: 700; font-size: 14.5px; display: flex; align-items: center; gap: 7px; }
        .atag {
          font-size: 10.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
          color: var(--brand); background: #efeafb; padding: 2px 7px; border-radius: 999px;
        }
        .atag.auto { color: var(--ok); background: var(--ok-bg); }
        .asub { color: var(--muted); font-size: 12.5px; margin-top: 1px; }
        .aamt { font-weight: 800; font-size: 15px; color: var(--ink); }
        .aamt.plus { color: var(--ok); }
        .foot { text-align: center; color: var(--muted); font-size: 13px; margin-top: 30px; }
        @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
