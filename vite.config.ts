import { defineConfig } from "vite";

// The dev server is reached through the sandbox preview proxy, so accept any host.
export default defineConfig({
  server: { host: "0.0.0.0", port: 3000, allowedHosts: true },
  preview: { host: "0.0.0.0", port: 3000, allowedHosts: true },
});
