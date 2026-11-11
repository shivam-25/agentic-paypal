"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AgentPay onboarding / funding page. The MCP server links here after it
 * creates the agent's wallet: setup_wallet -> /onboard?addr=0x..&email=..
 * PayPal is the primary funding action; a thirdweb on-ramp link is secondary.
 */

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

export default function Onboard() {
  const [addr, setAddr] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [status, setStatus] = useState<string>("");
  const [funded, setFunded] = useState<string>("");
  const btnRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef(amount);
  amountRef.current = amount;

  // Read wallet details from the URL (set by the MCP server).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setAddr(p.get("addr") ?? "");
    setEmail(p.get("email") ?? "");
  }, []);

  // Load the PayPal JS SDK and render the Buttons (primary funding action).
  useEffect(() => {
    if (!PAYPAL_CLIENT_ID || !addr) return;
    const id = "paypal-sdk";
    function render() {
      const paypal = (window as any).paypal;
      if (!paypal || !btnRef.current) return;
      btnRef.current.innerHTML = "";
      paypal
        .Buttons({
          style: { layout: "vertical", color: "blue", shape: "pill", label: "paypal" },
          createOrder: async () => {
            setStatus("Creating PayPal order…");
            const r = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amountUSD: amountRef.current, address: addr }),
            }).then((x) => x.json());
            if (r.error) throw new Error(r.error);
            setStatus("Approve the payment in the PayPal window…");
            return r.id;
          },
          onApprove: async (data: any) => {
            setStatus("Capturing payment and crediting your wallet…");
            const r = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID, address: addr }),
            }).then((x) => x.json());
            if (r.error) throw new Error(r.error);
            setFunded(`$${r.amountUSD} USD`);
            setStatus(
              r.credited
                ? "Credited to your agent wallet."
                : "Payment captured; wallet credit is being processed.",
            );
          },
          onError: (err: any) => setStatus("PayPal error: " + (err?.message ?? err)),
          onCancel: () => setStatus("Payment cancelled."),
        })
        .render(btnRef.current);
    }
    if (document.getElementById(id)) {
      render();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    s.onload = render;
    document.body.appendChild(s);
  }, [addr]);

  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">Agentic PayPal · Setup</span>
        <h1>Fund your agent wallet</h1>
        <p>Add USD and your AI agent can start buying goods and services.</p>
      </div>

      <section className="card">
        <div className="step-head">
          <span className="step-num done">✓</span>
          <span className="step-title">Your agent wallet</span>
        </div>
        {email && <p className="step-sub">Created for {email}</p>}
        <div className="addr">{addr || "No wallet address in the link."}</div>
        <span className="pill">● Managed by thirdweb · ready to fund</span>
      </section>

      <section className={`card ${addr ? "" : "dim"}`}>
        <div className="step-head">
          <span className="step-num">1</span>
          <span className="step-title">Add funds with PayPal</span>
        </div>
        <p className="step-sub">Choose an amount, then pay with PayPal. Shown in USD.</p>

        <div className="amounts">
          {["1.00", "5.00", "10.00"].map((a) => (
            <button
              key={a}
              className={`amt ${amount === a ? "sel" : ""}`}
              onClick={() => setAmount(a)}
            >
              ${a.replace(".00", "")}
            </button>
          ))}
        </div>

        {!PAYPAL_CLIENT_ID && (
          <div className="warnbar">
            Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> to enable the PayPal button.
          </div>
        )}
        <div ref={btnRef} className="ppbtn" />
        {status && <div className="status">{status}</div>}
        {funded && <div className="ok">✅ Funded {funded}. Your agent can now pay for services.</div>}
      </section>

      <section className="card">
        <div className="step-head">
          <span className="step-num">2</span>
          <span className="step-title">Then your agent spends it</span>
        </div>
        <p className="step-sub">
          Your PayPal payment lands as USD in the thirdweb wallet above. From there the agent
          pays for services on its own — no further approvals.
        </p>
      </section>

      <div className="foot">
        <b>PayPal</b> funds in · <b>thirdweb</b> wallet spends · testnet / sandbox, all in USD
      </div>

      <style jsx>{`
        .amounts { display: flex; gap: 10px; margin: 12px 0 16px; }
        .amt { flex: 1; padding: 12px; border-radius: 12px; border: 1.5px solid var(--line, #e2e6ec);
          background: transparent; color: inherit; font-weight: 600; font-size: 16px; cursor: pointer; }
        .amt.sel { border-color: #0070e0; background: #0070e011; color: #0070e0; }
        .ppbtn { min-height: 46px; margin-top: 4px; }
        .status { margin-top: 10px; color: #8a6d12; font-size: 14px; }
        .ok { margin-top: 12px; color: #1a7f52; font-weight: 600; }
        .secondary { background: transparent; border: 1.5px solid var(--line, #e2e6ec); color: inherit; }
      `}</style>
    </main>
  );
}
