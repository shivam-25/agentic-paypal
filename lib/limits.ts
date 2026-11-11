import { readJson, writeJson } from "./datadir";
import { agentUsdBalance } from "./agentpayer";
import { autoSpentToday } from "./orders";

/**
 * Micro vs macro. The user sets two automatic-payment limits: the largest single
 * purchase and the most in one day. A purchase within both is paid from the
 * pre-funded wallet without asking (micro / pre-approved); anything larger needs
 * PayPal approval (macro / post-approval). Limits are user-set only — no agent
 * tool changes them, so an agent cannot raise its own cap.
 */

export interface Limits {
  autoApproveLimitUSD: number;
  dailyLimitUSD: number;
}

const FILE = "settings.json";
const DEFAULTS: Limits = {
  autoApproveLimitUSD: Number(process.env.AGENTPAY_AUTO_LIMIT_USD ?? 10),
  dailyLimitUSD: Number(process.env.AGENTPAY_DAILY_LIMIT_USD ?? 50),
};

export function getLimits(): Limits {
  const raw = readJson<Partial<Limits>>(FILE, {});
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  return {
    autoApproveLimitUSD: num(raw.autoApproveLimitUSD, DEFAULTS.autoApproveLimitUSD),
    dailyLimitUSD: num(raw.dailyLimitUSD, DEFAULTS.dailyLimitUSD),
  };
}

export function setLimits(perPurchaseUSD: number, perDayUSD: number): Limits {
  const round = (n: number) => Math.round(n * 100) / 100;
  const limits: Limits = {
    autoApproveLimitUSD: round(Math.max(0, perPurchaseUSD)),
    dailyLimitUSD: round(Math.max(0, perDayUSD)),
  };
  writeJson(FILE, limits);
  return limits;
}

export type AutoPayCheck = { ok: true } | { ok: false; reason: string };

/** Whether a purchase of this total can be auto-paid, and if not, why. */
export async function canAutoPay(totalUSD: number): Promise<AutoPayCheck> {
  const { autoApproveLimitUSD, dailyLimitUSD } = getLimits();
  if (autoApproveLimitUSD <= 0) return { ok: false, reason: "automatic payments are turned off." };
  if (totalUSD > autoApproveLimitUSD) {
    return { ok: false, reason: `it is above your $${autoApproveLimitUSD.toFixed(2)} automatic limit.` };
  }
  const spent = autoSpentToday();
  if (dailyLimitUSD > 0 && spent + totalUSD > dailyLimitUSD) {
    return {
      ok: false,
      reason: `it would pass your $${dailyLimitUSD.toFixed(2)} a day limit ($${spent.toFixed(2)} paid today).`,
    };
  }
  const { usd } = await agentUsdBalance();
  const balance = Number(String(usd).replace(/[$,\s]/g, ""));
  if (balance < totalUSD) {
    return { ok: false, reason: `the wallet balance (${usd}) does not cover it — top up first.` };
  }
  return { ok: true };
}
