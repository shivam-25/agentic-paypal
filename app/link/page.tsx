"use client";

import { useState } from "react";

/**
 * Wallet set-up screen. Shows the PayPal → wallet creation step explicitly:
 * you log in with your PayPal email, an agent wallet is created and LINKED to
 * that PayPal identity, funded in USD / PyUSD. This is the demo's opening beat —
 * it makes the PayPal⇄wallet correlation visible before any buying happens.
 */

type Phase = "idle" | "auth" | "creating" | "linked";

interface Linked {
  email: string;
  address: string;
  balanceUSD: string;
}

export default function LinkWallet() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<Linked | null>(null);
  const [err, setErr] = useState("");

  async function link() {
    if (!email.trim()) return;
    setErr("");
    setPhase("auth");
    // Visible, staged progress so the creation step reads on screen.
    await wait(1100);
    setPhase("creating");
    try {
      const r = await fetch("/api/account/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await wait(900);
      setData(r);
      setPhase("linked");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setPhase("idle");
    }
  }

  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">Agentic PayPal · Set-up</span>
        <h1>Link PayPal, create the wallet</h1>
        <p>
          Log in with your PayPal email. Agentic PayPal creates an agent wallet and links it to
          that PayPal identity — funded in US dollars using <b>PyUSD</b>, the PayPal stablecoin.
        </p>
      </div>

      {/* The PayPal ⇄ wallet correlation, always on screen. */}
      <div className="linkrow">
        <div className={`node pp ${phase !== "idle" ? "on" : ""}`}>
          <div className="nlabel">PayPal account</div>
          <div className="nval">{email.trim() || "your-email@paypal.com"}</div>
          <div className="ntag">identity</div>
        </div>

        <div className={`conn ${phase}`}>
          <span className="line" />
          <span className="chip">
            {phase === "idle" && "⇄ link"}
            {phase === "auth" && "authorizing…"}
            {phase === "creating" && "creating…"}
            {phase === "linked" && "✓ linked"}
          </span>
          <span className="line" />
        </div>

        <div className={`node wl ${phase === "linked" ? "on" : ""}`}>
          <div className="nlabel">Agent wallet</div>
          <div className="nval mono">
            {phase === "linked" && data ? short(data.address) : "0x…"}
          </div>
          <div className="ntag">{phase === "linked" && data ? `${data.balanceUSD} · PyUSD` : "USD · PyUSD"}</div>
        </div>
      </div>

      <section className="card">
        {phase !== "linked" && (
          <>
            <label className="flabel" htmlFor="pp-email">Your PayPal email</label>
            <div className="formrow">
              <input
                id="pp-email"
                className="finput"
                placeholder="you@example.com"
                value={email}
                disabled={phase !== "idle"}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && link()}
              />
              <button className="linkbtn" onClick={link} disabled={phase !== "idle" || !email.trim()}>
                {phase === "idle" ? "Link PayPal & create wallet" : "Working…"}
              </button>
            </div>
            {phase === "auth" && <div className="prog"><span className="spin" /> Authorizing with PayPal…</div>}
            {phase === "creating" && <div className="prog"><span className="spin" /> Creating your agent wallet…</div>}
            {err && <div className="perr">{err}</div>}
          </>
        )}

        {phase === "linked" && data && (
          <div className="done">
            <div className="donehead"><span className="check">✓</span> Wallet created &amp; linked to PayPal</div>
            <div className="kvs">
              <div className="kv"><span>PayPal</span><b>{data.email}</b></div>
              <div className="kv"><span>Agent wallet</span><b className="mono">{data.address}</b></div>
              <div className="kv"><span>Balance</span><b>{data.balanceUSD} USD · PyUSD</b></div>
              <div className="kv"><span>Custody</span><b>Managed by thirdweb</b></div>
            </div>
            <a className="gostore" href="/agent">Open the agent console →</a>
          </div>
        )}
      </section>

      <div className="foot">
        <b>PayPal</b> is the identity · the <b>wallet</b> it creates holds <b>PyUSD</b> and buys goods · sandbox
      </div>

      <style jsx>{`
        .linkrow { display: flex; align-items: stretch; gap: 10px; margin-bottom: 22px; }
        .node {
          flex: 1; background: #fff; border: 1.5px solid var(--line); border-radius: 16px;
          padding: 16px 18px; opacity: .55; transition: all .35s ease;
        }
        .node.on { opacity: 1; border-color: var(--brand); box-shadow: 0 6px 20px rgba(124,58,237,.12); }
        .node.pp.on { border-color: #0070e0; box-shadow: 0 6px 20px rgba(0,112,224,.14); }
        .nlabel { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
        .nval { font-size: 16px; font-weight: 700; margin: 6px 0 8px; word-break: break-all; }
        .nval.mono, .mono { font-family: ui-monospace, monospace; }
        .ntag { font-size: 12px; color: var(--muted); font-weight: 600; }
        .conn { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 120px; gap: 6px; }
        .conn .line { width: 2px; flex: 1; background: linear-gradient(var(--line), var(--line)); }
        .conn .chip {
          font-size: 12.5px; font-weight: 700; white-space: nowrap; padding: 6px 12px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--line); color: var(--muted);
        }
        .conn.auth .chip, .conn.creating .chip { color: #0070e0; border-color: #0070e0; background: #0070e00d; }
        .conn.linked .chip { color: var(--ok); border-color: var(--ok); background: var(--ok-bg); }
        .flabel { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
        .formrow { display: flex; gap: 10px; }
        .finput {
          flex: 1; border: 1.5px solid var(--line); border-radius: 12px; padding: 13px 14px;
          font-size: 15px; color: var(--ink); background: #fff;
        }
        .finput:focus { outline: none; border-color: var(--brand); }
        .linkbtn {
          border: 0; border-radius: 12px; padding: 13px 20px; font-weight: 700; font-size: 14.5px; color: #fff;
          background: #0070e0; cursor: pointer; white-space: nowrap;
        }
        .linkbtn:disabled { opacity: .55; cursor: default; }
        .prog { display: flex; align-items: center; gap: 10px; margin-top: 14px; color: #0070e0; font-weight: 600; font-size: 14px; }
        .spin {
          width: 15px; height: 15px; border-radius: 50%; border: 2px solid #0070e033; border-top-color: #0070e0;
          display: inline-block; animation: sp .7s linear infinite;
        }
        @keyframes sp { to { transform: rotate(360deg); } }
        .perr { color: #b91c1c; font-size: 13px; margin-top: 12px; }
        .done { }
        .donehead { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; margin-bottom: 14px; }
        .check {
          width: 28px; height: 28px; border-radius: 50%; background: var(--ok-bg); color: var(--ok);
          display: grid; place-items: center; font-size: 15px; font-weight: 800;
        }
        .kvs { display: flex; flex-direction: column; gap: 2px; }
        .kv { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-top: 1px solid var(--line); font-size: 14.5px; }
        .kv span { color: var(--muted); }
        .kv b { text-align: right; word-break: break-all; }
        .gostore {
          display: inline-block; margin-top: 18px; text-decoration: none; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--brand-2)); padding: 12px 20px; border-radius: 12px;
        }
        .foot { text-align: center; color: var(--muted); font-size: 13px; margin-top: 28px; }
        @media (max-width: 560px) { .linkrow { flex-direction: column; } .conn { min-height: 54px; flex-direction: row; } .conn .line { width: auto; height: 2px; } }
      `}</style>
    </main>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function short(a: string) {
  return a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
