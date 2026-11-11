import { readJson, writeJson } from "./datadir";

/**
 * A local log of store orders — what the console/dashboard shows. PayPal stays
 * the source of truth for whether a macro order was actually captured. Each
 * order records who chose it (user or agent) and, for the agent, why.
 */

export interface OrderRecord {
  id: string;
  item: string;
  merchant: string;
  amountUSD: string;
  status: "awaiting_approval" | "paid";
  approveUrl?: string;
  createdAt: string;
  paidAt?: string;
  /** Paid from the wallet without asking, because it was within the user's limit. */
  auto?: boolean;
  decidedBy: "user" | "agent";
  reason?: string;
}

const FILE = "orders.json";

export function loadOrders(): OrderRecord[] {
  const list = readJson<OrderRecord[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

function save(orders: OrderRecord[]) {
  writeJson(FILE, orders.slice(0, 200));
}

/** Log a macro order the user still has to approve in PayPal. */
export function recordPendingOrder(o: Omit<OrderRecord, "status" | "createdAt">) {
  const orders = loadOrders().filter((x) => x.id !== o.id);
  orders.unshift({ ...o, status: "awaiting_approval", createdAt: new Date().toISOString() });
  save(orders);
}

/** Log a micro purchase paid automatically from the wallet. */
export function recordAutoPaidOrder(o: Omit<OrderRecord, "status" | "createdAt" | "paidAt" | "auto">) {
  const now = new Date().toISOString();
  const orders = loadOrders();
  orders.unshift({ ...o, status: "paid", auto: true, createdAt: now, paidAt: now });
  save(orders);
}

/** Mark a logged order paid once PayPal has captured it. */
export function markOrderPaid(id: string) {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  delete order.approveUrl;
  save(orders);
}

/** How much has been auto-paid today, in USD (counts toward the daily limit). */
export function autoSpentToday(): number {
  const today = new Date().toDateString();
  return loadOrders()
    .filter((o) => o.auto && o.paidAt && new Date(o.paidAt).toDateString() === today)
    .reduce((sum, o) => sum + Number(o.amountUSD), 0);
}
