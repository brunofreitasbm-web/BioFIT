import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0b0f",
          900: "#0f1115",
          800: "#15181e",
          700: "#1b1f27",
          600: "#242a34",
          500: "#343c4a",
        },
        line: "#262c37",
        ink: {
          DEFAULT: "#e9ebef",
          muted: "#9aa2b1",
          faint: "#5f6675",
        },
        brand: {
          DEFAULT: "#4f7cff",
          soft: "#2a3a6b",
          hover: "#3d63e0",
        },
        accent: {
          DEFAULT: "#a6ff3f",
          soft: "#25321a",
        },
        danger: {
          DEFAULT: "#ff5d6c",
          soft: "#3a1f24",
        },
        grupo: {
          peito: "#ff8a5c",
          costas: "#4f9bff",
          ombro: "#ffcf5c",
          biceps: "#8a7bff",
          triceps: "#ff6bd6",
          quadriceps: "#4fe0c0",
          posterior: "#38c7ff",
          gluteo: "#ff5c9e",
          panturrilha: "#a6ff3f",
          abdomen: "#ffb14f",
          antebraco: "#6fe0a0",
          cardio: "#ff5d6c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
