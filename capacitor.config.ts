import type { CapacitorConfig } from "@capacitor/cli";

// Rally's live web address (the published Lovable link or your own domain).
// Set it here, or pass it when syncing: RALLY_URL=https://example.com npx cap sync
const RALLY_URL = process.env.RALLY_URL || "";

const config: CapacitorConfig = {
  appId: "com.trwng.rally",
  appName: "Rally",
  // Fallback page shown only if RALLY_URL is empty. See www/index.html.
  webDir: "www",
  ...(RALLY_URL ? { server: { url: RALLY_URL, cleartext: false } } : {}),
  ios: { contentInset: "automatic" },
};

export default config;
