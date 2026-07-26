import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.limitless.ai.mobile",
  appName: "Limitless AI",
  webDir: "../dist/client",
  server: {
    androidScheme: "https",
    cleartext: false
  }
};

export default config;
