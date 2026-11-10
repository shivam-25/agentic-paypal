import { createThirdwebClient } from "thirdweb";

// Client-side thirdweb client. Only the public client ID is exposed to the browser.
// Get one at https://thirdweb.com/dashboard (Settings → API Keys).
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "";

export const client = createThirdwebClient({
  clientId: clientId || "MISSING_CLIENT_ID",
});

export const hasClientId = clientId.length > 0;
