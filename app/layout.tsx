import type { Metadata } from "next";
import { Providers } from "./providers";
import { SiteNav } from "./SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic PayPal — a wallet for AI agents",
  description:
    "Link your PayPal, give an AI agent a wallet, and let it buy goods and services — small purchases auto-paid, larger ones approved in PayPal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
