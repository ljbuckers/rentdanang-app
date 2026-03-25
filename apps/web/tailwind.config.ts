import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0077B6",
          dark: "#005A8C",
          light: "#00A5E0",
          50: "#E6F4FA",
          100: "#B3DFF0",
          200: "#80C9E6",
          300: "#4DB4DC",
          400: "#1A9ED2",
          500: "#0077B6",
          600: "#005A8C",
          700: "#004266",
          800: "#002B42",
          900: "#001521",
        },
        accent: {
          DEFAULT: "#D97706", // Shifted to warm amber
          dark: "#B45309",
          light: "#F59E0B",
        },
        warm: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          lighter: "#FEF3C7",
          dark: "#B45309",
          50: "#FFFBEB",
          100: "#FEF3C7",
          900: "#78350F",
        },
        cream: "#F9FAFB", // Cleaner, less yellow
        sand: "#F3F4F6",
        surface: "#FFFFFF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        "soft-md": "0 8px 16px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)",
        "soft-lg": "0 16px 32px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.02)",
        "warm-md": "0 4px 12px rgba(217, 119, 6, 0.1), 0 2px 4px rgba(0, 0, 0, 0.04)",
        "warm-lg": "0 8px 24px rgba(217, 119, 6, 0.12), 0 4px 8px rgba(0, 0, 0, 0.04)",
        card: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)",
        "card-hover": "0 0 0 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.08)",
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
