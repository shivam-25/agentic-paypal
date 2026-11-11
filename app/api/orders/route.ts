import { loadOrders } from "@/lib/orders";

/** Recent order activity for the store dashboard (funding + purchases). */
export async function GET() {
  const orders = loadOrders().slice(0, 12);
  return Response.json({ orders });
}
