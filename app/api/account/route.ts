import { currentAccount } from "@/lib/account";

/** The PayPal-linked account (email → agent wallet), if the user has linked one. */
export async function GET() {
  const acct = currentAccount();
  if (!acct) return Response.json({ linked: false });
  return Response.json({ linked: true, email: acct.email, address: acct.address });
}
