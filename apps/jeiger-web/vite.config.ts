import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND = process.env.HERMES_SERVE_URL ?? "http://127.0.0.1:9119";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@hermes/shared": path.resolve(import.meta.dirname, "../shared/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin from the browser's point of view: no CORS needed, and the
      // WS upgrade for /api/ws carries the same ?token= query param either way
      // (hermes_cli/web_server_chat.py::_ws_auth_reason).
      "/api": {
        target: BACKEND,
        ws: true,
      },
    },
  },
});
