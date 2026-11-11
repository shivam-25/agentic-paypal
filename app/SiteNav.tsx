"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Shared top navigation so every page reads as one product, not a bare column. */
export function SiteNav() {
  const path = usePathname();
  const is = (p: string) => (path === p ? "navlink on" : "navlink");
  return (
    <header className="sitenav">
      <div className="navinner">
        <Link href="/" className="brand">
          <span className="brandmark">◈</span>
          <span className="brandname">Agentic PayPal</span>
        </Link>
        <nav className="navlinks">
          <Link href="/market" className={is("/market")}>Store</Link>
          <Link href="/agent" className={is("/agent")}>Agent Console</Link>
          <span className="envpill">PayPal sandbox · testnet</span>
        </nav>
      </div>
    </header>
  );
}
