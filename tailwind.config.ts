import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '0.75rem',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px 0 rgba(139, 119, 93, 0.08), 0 1px 2px -1px rgba(139, 119, 93, 0.08)',
        'warm': '0 4px 12px -2px rgba(139, 119, 93, 0.1), 0 2px 6px -2px rgba(139, 119, 93, 0.06)',
        'warm-lg': '0 10px 30px -4px rgba(139, 119, 93, 0.12), 0 4px 12px -4px rgba(139, 119, 93, 0.06)',
        'warm-xl': '0 20px 50px -8px rgba(139, 119, 93, 0.15), 0 8px 20px -6px rgba(139, 119, 93, 0.08)',
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        sand: {
          50: "#FAF9F7",
          100: "#E5E0D9",
          200: "#D6CEC4",
          300: "#C7BBB0",
          400: "#B8A99B",
          500: "#8A7F6C",
          600: "#7B715F",
        },
        earth: {
          50: "#F5F3F2",
          100: "#E6E2DE",
          200: "#C7BEB6",
          300: "#A89B8E",
          400: "#8A7F6C",
          500: "#6B6354",
          600: "#5C544A",
        },
        sunset: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-down": "fadeDown 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-down": "slideDown 0.5s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;