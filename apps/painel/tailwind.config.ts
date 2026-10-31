import type { Config } from "tailwindcss";

// Tema escuro fixo (grafite + laranja) para uso no computador. Independente do app de treino.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: { 950: "#0A0C0F", 900: "#0F1216", 800: "#181C22", 700: "#222730", 600: "#2C323B", 500: "#3A414C" },
        line: "#333A44",
        ink: { DEFAULT: "#F2F4F7", muted: "#A8B0BC", faint: "#8B93A0" },
        brand: { DEFAULT: "#FF7A1A", soft: "#33210F", hover: "#FF8F3D" },
        accent: { DEFAULT: "#34D27A", soft: "#11291B" },
        danger: { DEFAULT: "#FF6B7A", soft: "#33161B" },
        "on-solid": "#14100C",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
