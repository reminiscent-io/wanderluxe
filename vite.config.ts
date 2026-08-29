
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

// --- Version stamping ------------------------------------------------------
// Inject version identity at build time so the running app knows exactly
// which commit it came from, and ships a /version.json for update polling.
function readGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const APP_VERSION = pkg.version;
const APP_GIT_SHA = readGitSha();
const APP_BUILD_TIME = new Date().toISOString();

function versionStampPlugin(): Plugin {
  return {
    name: "wanderluxe-version-stamp",
    apply: "build",
    writeBundle(options) {
      const outDir = options.dir ?? "dist";
      // Skip the server bundle — only stamp the client output.
      if (outDir.includes(`${path.sep}server`) || outDir.endsWith("/server")) {
        return;
      }
      // Emit version.json for runtime polling
      fs.writeFileSync(
        path.join(outDir, "version.json"),
        JSON.stringify(
          { version: APP_VERSION, sha: APP_GIT_SHA, buildTime: APP_BUILD_TIME },
          null,
          2,
        ),
      );
      // Replace the __APP_SHA__ placeholder in the service worker so its
      // cache name is keyed to this build.
      const swPath = path.join(outDir, "sw.js");
      if (fs.existsSync(swPath)) {
        const contents = fs.readFileSync(swPath, "utf-8");
        fs.writeFileSync(swPath, contents.replace(/__APP_SHA__/g, APP_GIT_SHA));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_GIT_SHA__: JSON.stringify(APP_GIT_SHA),
    __APP_BUILD_TIME__: JSON.stringify(APP_BUILD_TIME),
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    hmr: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    },
    allowedHosts: [
      '38fedee6-5ae3-4eee-8c9e-f99557fb0bf6-00-1y7emd69tsqv0.worf.replit.dev',
      'dbd55640-70ab-4284-bf3e-45861cdeb954-00-3inbm7rt0087l.janeway.replit.dev',
      'wanderluxe.io',
      'www.wanderluxe.io',
      'wanderluxe.replit.app',
      '.replit.dev',
      '.repl.co'
    ],
    watch: {
      ignored: [
        "**/.cache/**",
        "**/node_modules/**",
      ],
    },
    cors: true,
    // Proxy API requests to the Express backend server
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 5001}`,
        changeOrigin: true,
        secure: false,
      }
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
          if (id.includes('node_modules/pdfmake') || id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/html-to-pdfmake')) {
            return 'pdf';
          }
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/react-syntax-highlighter')) {
            return 'markdown';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'dnd';
          }
          if (id.includes('node_modules/@vis.gl/react-google-maps')) {
            return 'maps';
          }
        },
      }
    },
    sourcemap: mode === 'development',
  },
  plugins: [
    react(),
    versionStampPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
