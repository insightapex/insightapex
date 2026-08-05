import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dbe6ff",
          200: "#bfd2ff",
          300: "#93b4ff",
          400: "#5f8aff",
          500: "#3b63f6",
          600: "#2456f5",
          700: "#1d45d8",
          800: "#1d3aaf",
          900: "#1d348a",
        },
        accent: {
          50: "#f6f0ff",
          100: "#ede0ff",
          200: "#dcc2ff",
          300: "#c495ff",
          400: "#a85eff",
          500: "#8b2ff5",
          600: "#7c1fe0",
          700: "#6816bd",
          800: "#55169a",
          900: "#46167c",
        },
        ink: {
          950: "#060a14",
          900: "#0b1220",
          800: "#121a2b",
          700: "#1b2540",
          600: "#2a3654",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8fafc",
          subtle: "#f1f5f9",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument)", "Georgia", "ui-serif", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.06)",
        panel: "0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
        float: "0 8px 40px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
        glow: "0 0 28px rgba(36, 86, 245, 0.35)",
        "glow-accent": "0 0 28px rgba(139, 47, 245, 0.3)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 1.8s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #8b2ff5 0%, #2456f5 55%, #1d45d8 100%)",
        "gradient-brand-soft": "linear-gradient(135deg, rgba(139,47,245,0.12) 0%, rgba(36,86,245,0.12) 100%)",
        "gradient-surface": "linear-gradient(180deg, #f4f6fb 0%, #eef2ff 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
