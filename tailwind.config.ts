import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ccff",
          300: "#80aaff",
          400: "#4d80ff",
          500: "#2456f5",
          600: "#163fd1",
          700: "#1232a6",
          800: "#142c80",
          900: "#142960",
        },
        ink: {
          900: "#0b1220",
          800: "#121a2b",
          700: "#1b2540",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
        panel: "0 4px 24px rgba(16,24,40,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
