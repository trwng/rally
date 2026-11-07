import type { CapacitorConfig } from "@capacitor/cli";

// The app packages a static copy of Rally (built by `npm run build:native` into
// dist/client) and talks to Supabase directly. Only address search uses the live
// site (https://letsrallys.app/api/geocode).
const config: CapacitorConfig = {
  appId: "com.trwng.rally",
  appName: "Rally",
  webDir: "dist/client",
  ios: { contentInset: "automatic" },
  plugins: {
    // Sends web requests through the phone's native networking (avoids CORS blocks).
    CapacitorHttp: { enabled: true },
  },
};

export default config;
