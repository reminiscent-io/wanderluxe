import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Dense product-UI ramp for timeline rows, headers and metadata.
        // Steps sit close together on purpose: roles that are adjacent in the
        // layout (title vs. meta = 15/13) clear a 1.15 ratio and are further
        // separated by weight and ink level, while same-size roles (time,
        // price) never share a column. See DESIGN.md section 3.
        'ui-xs':   ['0.75rem',   { lineHeight: '1rem' }],      // 12 - overlines, badges
        'ui-sm':   ['0.8125rem', { lineHeight: '1.125rem' }],  // 13 - metadata, descriptions
        'ui-base': ['0.875rem',  { lineHeight: '1.25rem' }],   // 14 - times, prices, labels
        'ui-md':   ['0.9375rem', { lineHeight: '1.375rem' }],  // 15 - row titles
        'ui-lg':   ['1.0625rem', { lineHeight: '1.5rem' }],    // 17 - subsection titles
        'ui-day':  ['1.375rem',  { lineHeight: '1.75rem', letterSpacing: '-0.015em' }], // 22 - day title (serif)
      },
      typography: {
        earth: {
          css: {
            '--tw-prose-body': 'var(--earth-700)',
            '--tw-prose-headings': 'var(--earth-800)',
            '--tw-prose-links': 'var(--earth-600)',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            'h1, h2, h3': {
              fontFamily: '"DM Serif Display", Georgia, serif',
            },
            code: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
          },
        },
        DEFAULT: {
          css: {
            fontFamily: '"DM Sans", system-ui, sans-serif',
            'h1, h2, h3': {
              fontFamily: '"DM Serif Display", Georgia, serif',
            },
            code: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
          },
        },
      },
      spacing: {
        // Timeline row rhythm: 72px two-line row, 56px sticky day bar,
        // 36px pinned accommodation strip, 80px time gutter.
        'row': '4.5rem',
        'daybar': '4.5rem',
        'strip': '2.25rem',
        'gutter': '5rem',
        'gutter-sm': '4rem',
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
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          // Red as ink. `destructive` itself is a fill colour and only reaches
          // 3.7:1 on cream paper, so any red *text* smaller than a heading
          // uses this darker step to clear AA.
          ink: "hsl(var(--destructive-ink))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
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
        // Timeline category hues. All sit at OKLCH L .47 / chroma <= .075 so
        // they read as ink rather than as brand colour, and each clears 6.5:1
        // on cream paper. Applied to the type icon at full strength and to the
        // row as a 4-10% wash, which composites over cream and stays warm.
        category: {
          ocean: '#366172',
          clay: '#7E4D36',
          sage: '#476348',
          slate: '#535B6C',
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
        "spin-slow": "spin 28s linear infinite",
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
  plugins: [
    tailwindcssAnimate,
    typography,
  ],
} satisfies Config;