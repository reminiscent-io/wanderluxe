
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dns from "node:dns";

// Fix DNS resolution order for Node.js v17+
dns.setDefaultResultOrder("verbatim");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    strictPort: true,
    port: 5173,
    allowedHosts: [
      ".replit.dev",
      ".repl.co",
      ".janeway.replit.dev",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: "http://0.0.0.0:8080",
        changeOrigin: true,
        router: () => process.env.VITE_PROXY_TARGET || "http://0.0.0.0:8080",
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      "/health": {
        target: "http://0.0.0.0:8080",
        changeOrigin: true,
        bypass: (req) => req.url === "/health" ? req.url : null
      }
    },
  },
});
