// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],

  /* ──────────── Tell Tailwind where to look for class names ──────────── */
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],

  /* ──────────── Optional global prefix (keep empty = none) ──────────── */
  prefix: "",

  /* ──────────── Theme & design tokens ──────────── */
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ---- colour tokens mapped to CSS variables ---- */
      colors: {
        border:      { DEFAULT: "hsl(var(--border))" },
        background:  { DEFAULT: "hsl(var(--background))" },
        foreground:  { DEFAULT: "hsl(var(--foreground))" },

        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        /* brand ­/ palette examples */
        sand: {
          50:  "#FAF9F7",
          100: "#E5E0D9",
          200: "#D6CEC4",
          300: "#C7BBB0",
          400: "#B8A99B",
          500: "#8A7F6C",
          600: "#7B715F",
        },
        earth: {
          50:  "#F5F3F2",
          100: "#E6E2DE",
          200: "#C7BEB6",
          300: "#A89B8E",
          400: "#8A7F6C",
          500: "#6B6354",
          600: "#5C544A",
        },
      },

      /* ---- custom animations ---- */
      animation: {
        "fade-up":   "fadeUp 0.5s ease-out forwards",
        "fade-down": "fadeDown 0.5s ease-out forwards",
        "slide-up":  "slideUp 0.5s ease-out forwards",
        "slide-down":"slideDown 0.5s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%":   { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },

  /* ──────────── Extra plugins ──────────── */
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
