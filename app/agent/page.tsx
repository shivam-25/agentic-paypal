"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Agentic PayPal Agent Console — a chat box backed by an LLM that drives the real
 * Agentic PayPal tools. Type a prompt; the agent logs in with PayPal, buys goods,
 * funds the wallet, and pays — showing each tool call. The MCP experience, in-browser.
 */

type Step = { tool: string; args: any; result: any };
type Turn = { role: "user" | "agent"; text: string; steps?: Step[] };

const SUGGESTIONS = [
  "Log me in with jo@example.com and show the store.",
  "Buy me a mug and a notebook set.",
  "I need a desk lamp for my home office — order it.",
];

export default function AgentConsole() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  // Load the current auto-pay limit.
  useEffect(() => {
    fetch("/api/limits")
      .then((x) => x.json())
      .then((d) => setLimit(d.autoApproveLimitUSD))
      .catch(() => {});
  }, []);

  // Track the linked PayPal email from any link_paypal tool result.
  useEffect(() => {
    for (const t of turns) {
      for (const s of t.steps ?? []) {
        if (s.tool === "link_paypal" && s.result?.email) setLinkedEmail(s.result.email);
      }
    }
  }, [turns]);

  async function saveLimit(value: number) {
    setLimit(value);
    try {
      const d = await fetch("/api/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApproveLimitUSD: value }),
      }).then((x) => x.json());
      setLimit(d.autoApproveLimitUSD);
    } catch {
      /* ignore */
    }
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    const history = turns.map((t) => ({
      role: t.role === "user" ? "user" : "assistant",
      content: t.text,
    }));
    setTurns((t) => [...t, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setTurns((t) => [...t, { role: "agent", text: r.reply, steps: r.steps }]);
    } catch (e: any) {
      setTurns((t) => [...t, { role: "agent", text: "⚠️ " + (e?.message ?? String(e)) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="hero">
        <span className="badge">Agentic PayPal · Agent Console</span>
        <h1>Tell the agent what to buy</h1>
        <p>An AI agent with a wallet linked to your PayPal. It buys goods and services, paid in US dollars using PyUSD — the PayPal stablecoin.</p>
        <div className="controls">
          <span className={`chip ${linkedEmail ? "on" : ""}`}>
            {linkedEmail ? `PayPal: ${linkedEmail}` : "PayPal: not linked"}
          </span>
          <label className="limit">
            Auto-pay up to{" "}
            <span className="limval">${(limit ?? 0).toFixed(0)}</span>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={limit ?? 0}
              onChange={(e) => saveLimit(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="chat">
        {turns.length === 0 && (
          <div className="empty">
            <p>Try:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="sugg" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`turn ${t.role}`}>
            <div className="who">{t.role === "user" ? "You" : "🤖 Agentic PayPal"}</div>
            {t.steps?.map((s, j) => (
              <ToolCard key={j} step={s} />
            ))}
            {t.text && <div className="bubble"><Markdown text={t.text} /></div>}
          </div>
        ))}
        {busy && <div className="turn agent"><div className="who">🤖 Agentic PayPal</div><div className="bubble dim">working…</div></div>}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent to buy something…"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>

      <style jsx>{`
        .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 14px; }
        .chip { font-size: 12.5px; font-weight: 600; padding: 5px 12px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--line); color: var(--muted); }
        .chip.on { background: #e9f8ef; border-color: #b7e7c9; color: #137a3d; }
        .limit { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); font-weight: 600; }
        .limit .limval { color: var(--brand-2); font-weight: 800; }
        .limit input[type="range"] { accent-color: var(--brand); width: 120px; }
        .chat { display: flex; flex-direction: column; gap: 16px; min-height: 240px; margin-bottom: 18px; }
        .empty { color: var(--muted); display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .sugg { background: #efeafb; color: var(--brand-2); border: 0; border-radius: 999px;
          padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; }
        .turn { display: flex; flex-direction: column; gap: 8px; }
        .turn.user { align-items: flex-end; }
        .who { font-size: 12px; color: var(--muted); font-weight: 700; }
        .bubble { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px 16px;
          font-size: 14.5px; max-width: 88%; line-height: 1.5; }
        .turn.user .bubble { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border: 0; }
        .bubble.dim { color: var(--muted); }
        .composer { display: flex; gap: 10px; position: sticky; bottom: 16px; }
        .composer input { flex: 1; padding: 14px 16px; border-radius: 12px; border: 1.5px solid var(--line);
          font-size: 15px; background: #fff; }
        .composer button { padding: 0 22px; border: 0; border-radius: 12px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--brand-2)); cursor: pointer; }
        .composer button:disabled { opacity: .5; }
      `}</style>
    </main>
  );
}

/** Render inline markdown: **bold**, `code`. Returns React nodes. */
function inline(text: string, keyBase: string) {
  const nodes: any[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyBase}-b${k}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<code key={`${keyBase}-c${k}`}>{m[3]}</code>);
    else if (m[4] !== undefined)
      nodes.push(
        <a key={`${keyBase}-a${k}`} href={m[5]} target="_blank" rel="noreferrer">
          {m[4]}
        </a>,
      );
    last = m.index + m[0].length;
    k++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Minimal markdown renderer: paragraphs, line breaks, GFM pipe tables, inline bold/code. */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: any[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    // GFM table: a header row followed by a |---|---| separator.
    const isRow = (s: string) => /^\s*\|.*\|\s*$/.test(s);
    const isSep = (s: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(s) && s.includes("-");
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const cells = (s: string) =>
        s.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isRow(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push(
        <table key={`t${b++}`} className="mdtable">
          <thead>
            <tr>{header.map((h, j) => <th key={j}>{inline(h, `th${b}-${j}`)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `td${b}-${ri}-${ci}`)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    // ATX heading: #, ##, ### ...
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = (`h${Math.min(level + 2, 6)}`) as any;
      blocks.push(
        <Tag key={`h${b++}`} className="mdhead">
          {inline(h[2], `h${b}`)}
        </Tag>,
      );
      i++;
      continue;
    }
    // Horizontal rule.
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(<hr key={`hr${b++}`} className="mdhr" />);
      i++;
      continue;
    }
    // List item: "- ", "* ", or "1. "
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const items: string[] = [];
      while (i < lines.length) {
        const mm = lines[i].match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
        if (!mm) break;
        items.push(mm[1]);
        i++;
      }
      blocks.push(
        <ul key={`ul${b++}`} className="mdlist">
          {items.map((it, ii) => <li key={ii}>{inline(it, `li${b}-${ii}`)}</li>)}
        </ul>,
      );
      continue;
    }
    // Gather a paragraph (consecutive non-blank, non-table lines).
    if (line.trim() === "") {
      i++;
      continue;
    }
    const para: string[] = [];
    const breaksPara = (s: string) =>
      /^(#{1,4})\s+/.test(s) ||
      /^\s*---+\s*$/.test(s) ||
      /^\s*(?:[-*]|\d+\.)\s+/.test(s) ||
      (isRow(s) && i + 1 < lines.length && isSep(lines[i + 1]));
    while (i < lines.length && lines[i].trim() !== "" && !breaksPara(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p${b++}`} className="mdpara">
        {para.map((pl, pi) => (
          <span key={pi}>
            {inline(pl, `p${b}-${pi}`)}
            {pi < para.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  }
  return (
    <div className="md">
      {blocks}
      <style jsx>{`
        .md :global(.mdpara) { margin: 0 0 10px; }
        .md :global(.mdpara:last-child) { margin-bottom: 0; }
        .md :global(a) { color: var(--brand-2); font-weight: 600; }
        .md :global(.mdhead) { margin: 12px 0 6px; font-weight: 700; line-height: 1.3; }
        .md :global(h3.mdhead) { font-size: 15px; }
        .md :global(h4.mdhead) { font-size: 14px; }
        .md :global(h5.mdhead), .md :global(h6.mdhead) { font-size: 13.5px; }
        .md :global(.mdhead:first-child) { margin-top: 0; }
        .md :global(.mdhr) { border: 0; border-top: 1px solid var(--line); margin: 12px 0; }
        .md :global(.mdlist) { margin: 4px 0 10px; padding-left: 20px; }
        .md :global(.mdlist li) { margin: 2px 0; }
        .md :global(code) { background: var(--surface); border: 1px solid var(--line);
          border-radius: 5px; padding: 1px 5px; font-size: 12px; font-family: ui-monospace, monospace;
          word-break: break-all; }
        .md :global(.mdtable) { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 12.5px; }
        .md :global(.mdtable th), .md :global(.mdtable td) { border: 1px solid var(--line);
          padding: 6px 9px; text-align: left; vertical-align: top; }
        .md :global(.mdtable th) { background: var(--surface); font-weight: 700; }
      `}</style>
    </div>
  );
}

function ToolCard({ step }: { step: Step }) {
  const r = step.result ?? {};
  return (
    <div className="toolcard">
      <div className="toolhead">
        <span className="dot" /> called <code>{step.tool}</code>
        {step.args && Object.keys(step.args).length > 0 && (
          <span className="args">{JSON.stringify(step.args)}</span>
        )}
      </div>
      {step.tool === "link_paypal" && r.linked && (
        <div className="paid">
          <div className="kv">✓ PayPal linked — agent wallet created for <b>{r.email}</b></div>
          <div className="kv dim2">wallet <code className="pid">{r.address}</code> · balance <b>{r.balanceUSD}</b> · PyUSD</div>
        </div>
      )}
      {step.tool === "browse_store" && Array.isArray(r.products) && (
        <>
          <ul className="items">
            {r.products.map((p: any) => (
              <li key={p.id}>
                {p.emoji} <b>{p.name}</b> — <span className="price">${p.priceUSD}</span>{" "}
                <code className="pid">{p.id}</code>
              </li>
            ))}
          </ul>
          <div className="kv dim2">Auto-pay up to ${Number(r.autoApproveLimitUSD).toFixed(2)} · larger needs approval</div>
        </>
      )}
      {step.tool === "buy_product" && r.mode === "auto" && (
        <div className="paid">
          <div className="kv">✓ Bought <b>{r.item}</b> for <b>${r.amountUSD}</b> — paid automatically from the wallet</div>
          <div className="kv dim2">
            {r.merchant}
            {r.decidedBy === "agent" && r.reason ? ` · agent chose this: ${r.reason}` : ""}
          </div>
        </div>
      )}
      {step.tool === "buy_product" && r.mode === "approval" && (
        <div className="fundcard">
          <div className="fundline">
            <b>{r.item}</b> is <b>${r.amountUSD}</b> — needs approval ({r.reason})
          </div>
          {r.approveUrl && (
            <a className="approvebtn" href={r.approveUrl} target="_blank" rel="noreferrer">
              Approve payment in PayPal ↗
            </a>
          )}
        </div>
      )}
      {step.tool === "confirm_purchase" && (
        <div className="kv">
          {r.completed ? <>✓ Purchase complete · <b>${r.amountUSD}</b> paid to the merchant</> : <>Order status: {r.status}</>}
        </div>
      )}
      {step.tool === "browse_market" && Array.isArray(r) && (
        <ul className="items">
          {r.map((i: any) => (
            <li key={i.id}>
              <b>{i.title}</b> — {i.vendor} — <span className="price">{i.priceUSD}</span>
            </li>
          ))}
        </ul>
      )}
      {step.tool === "get_balance" && (
        <div className="kv">Balance: <b>{r.usd}</b> USD</div>
      )}
      {step.tool === "fund_with_paypal" && (
        <div className="fundcard">
          <div className="fundline">
            PayPal order <code className="ordid">{r.orderId}</code> for <b>${r.amountUSD}</b>
          </div>
          {r.approveUrl && (
            <a className="approvebtn" href={r.approveUrl} target="_blank" rel="noreferrer">
              Approve payment in PayPal ↗
            </a>
          )}
        </div>
      )}
      {step.tool === "confirm_funding" && (
        <div className="kv">Captured <b>${r.amountUSD}</b> · credited on-chain {r.credited ? "✓" : "…"}</div>
      )}
      {step.tool === "pay_for_service" && r.paid && (
        <div className="paid">
          <div className="kv">
            ✓ Paid <b>{r.priceUSD}</b>{" "}
            {r.explorer && <a href={r.explorer} target="_blank" rel="noreferrer">on-chain receipt ↗</a>}
          </div>
          <pre>{JSON.stringify(r.unlocked, null, 2)}</pre>
        </div>
      )}

      <style jsx>{`
        .toolcard { background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
          padding: 12px 14px; font-size: 13px; max-width: 88%; }
        .toolhead { color: var(--muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .toolhead code { color: var(--brand-2); font-weight: 700; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); display: inline-block; }
        .args { color: #9b93ad; font-family: ui-monospace, monospace; font-size: 11.5px; }
        .items { margin: 8px 0 0; padding-left: 18px; }
        .items li { margin: 3px 0; }
        .price { color: var(--brand); font-weight: 700; }
        .pid { background: #fff; border: 1px solid var(--line); border-radius: 5px; padding: 0 5px;
          font-size: 11px; font-family: ui-monospace, monospace; color: var(--muted); }
        .dim2 { color: var(--muted); font-size: 12px; }
        .kv { margin-top: 8px; }
        .kv a { color: var(--brand-2); font-weight: 600; }
        .fundcard { margin-top: 8px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
        .fundline { font-size: 13px; line-height: 1.5; }
        .ordid { background: #fff; border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px;
          font-size: 12px; font-family: ui-monospace, monospace; }
        .approvebtn { display: inline-flex; align-items: center; gap: 6px; background: #0070e0; color: #fff !important;
          text-decoration: none; padding: 10px 18px; border-radius: 999px; font-weight: 700; font-size: 13.5px;
          box-shadow: 0 2px 8px rgba(0,112,224,0.25); }
        .paid pre { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 10px;
          font-size: 11.5px; overflow-x: auto; margin: 8px 0 0; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}
