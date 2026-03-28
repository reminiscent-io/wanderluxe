
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
        },
      }
    },
    sourcemap: mode === 'development',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
