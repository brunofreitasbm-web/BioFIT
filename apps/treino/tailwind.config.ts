import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#14161a",
          900: "#f4f5f7",
          800: "#ffffff",
          700: "#f1f2f5",
          600: "#e6e8ec",
          500: "#d8dbe1",
        },
        line: "#e2e4e9",
        ink: {
          DEFAULT: "#1a1d23",
          muted: "#5b606c",
          faint: "#8a8f9b",
        },
        brand: {
          DEFAULT: "#3d63e0",
          soft: "#e9f0ff",
          hover: "#2f4fc0",
        },
        accent: {
          DEFAULT: "#158a43",
          soft: "#e7f6ec",
        },
        danger: {
          DEFAULT: "#d63548",
          soft: "#fceaec",
        },
        grupo: {
          peito: "#d9591c",
          costas: "#2f6fe0",
          deltoides: "#b8860b",
          biceps: "#6b57e6",
          triceps: "#c93aa3",
          quadriceps: "#0f9e83",
          posterior: "#1789c9",
          panturrilha: "#5a9216",
          postura: "#c94a86",
          core: "#d6a319",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(20,22,26,0.04), 0 8px 24px -12px rgba(20,22,26,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
