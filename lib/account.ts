import { readJson, writeJson } from "./datadir";
import { agentAddress } from "./agentpayer";

/**
 * "Log in with PayPal" by email. The user's PayPal email is the identity the
 * agent wallet is linked to. For the demo this is deterministic: the email is
 * linked to the configured agent wallet address — no OAuth app, no new keys.
 */

export interface Account {
  email: string;
  address: string;
  linkedAt: string;
}

const FILE = "account.json";

export function currentAccount(): Account | null {
  return readJson<Account | null>(FILE, null);
}

export function linkPaypal(email: string): Account {
  const address = agentAddress() || "";
  const account: Account = { email, address, linkedAt: new Date().toISOString() };
  writeJson(FILE, account);
  return account;
}
