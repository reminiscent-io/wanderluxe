
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
    hmr: {
      clientPort: 443
    },
    allowedHosts: [
      '341343a7-80c4-4c6c-ba73-a83ca3e59dbd.lovableproject.com',
      '38fedee6-5ae3-4eee-8c9e-f99557fb0bf6-00-1y7emd69tsqv0.worf.replit.dev',
      'dbd55640-70ab-4284-bf3e-45861cdeb954-00-3inbm7rt0087l.janeway.replit.dev',
      'wanderluxe.io',
      'www.wanderluxe.io',
      'wanderluxe.replit.app'
    ],
      watch: {
        ignored: [
          "**/.cache/**",
          "**/node_modules/**",
        ],
      },
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
