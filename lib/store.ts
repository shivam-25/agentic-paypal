/** The merchant store's catalogue of physical goods the agent or user can buy. */
export interface Product {
  id: string;
  name: string;
  description: string;
  priceUSD: string; // e.g. "18.00"
  emoji: string;
}

export const STORE_NAME = "Fernhill Goods";

export const PRODUCTS: Product[] = [
  { id: "mug", name: "Stoneware mug", description: "Hand-glazed, 12 oz.", priceUSD: "18.00", emoji: "☕" },
  { id: "tote", name: "Canvas tote", description: "Heavy cotton, inside pocket.", priceUSD: "24.00", emoji: "👜" },
  { id: "notebooks", name: "Notebook set", description: "Three dot-grid notebooks.", priceUSD: "12.00", emoji: "📓" },
  { id: "lamp", name: "Desk lamp", description: "Dimmable, warm light.", priceUSD: "39.00", emoji: "💡" },
  { id: "coffee", name: "Coffee beans", description: "Medium roast, 12 oz bag.", priceUSD: "16.00", emoji: "🫘" },
  { id: "socks", name: "Wool socks", description: "Two pairs, merino blend.", priceUSD: "14.00", emoji: "🧦" },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
