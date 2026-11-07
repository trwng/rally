// Build used for the iPhone/Android app: a static single-page copy of Rally that
// gets packaged inside the app. The normal website build (vite.config.ts) is unchanged.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true, prerender: { outputPath: "/index.html" } },
  },
  vite: { preview: { host: "127.0.0.1" } },
});
