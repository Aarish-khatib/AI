import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    build: {
      // PDF generation is an on-demand 511 kB minified vendor chunk; the
      // initial page is kept below 500 kB through dynamic workspace routes.
      // Keep a tight ceiling so a future eager regression still warns.
      chunkSizeWarningLimit: 520,
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      // Polling avoids OS watcher ceilings in restricted previews and also
      // works consistently across Windows, macOS, WSL, and Linux.
      watch: { useFsEvents: false, usePolling: true, interval: 250 },
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
