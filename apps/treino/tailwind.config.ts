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
          // Darkened from #8a8f9b (2.97:1 on base-900) to meet WCAG AA 4.5:1 for small text.
          faint: "#656b78",
        },
        brand: {
          DEFAULT: "#3d63e0",
          soft: "#e9f0ff",
          hover: "#2f4fc0",
        },
        accent: {
          // Darkened from #158a43 (4.05:1 as text, 4.42:1 as white-on-bg) to pass WCAG AA both ways.
          DEFAULT: "#12793a",
          soft: "#e7f6ec",
        },
        danger: {
          // Darkened from #d63548 (4.31:1 as text) to comfortably pass WCAG AA.
          DEFAULT: "#c22d3f",
          soft: "#fceaec",
        },
        grupo: {
          peito: "#c25019",
          costas: "#2f6fe0",
          deltoides: "#966d09",
          biceps: "#6b57e6",
          triceps: "#c737a1",
          quadriceps: "#0c826c",
          posterior: "#1479b2",
          panturrilha: "#4f8013",
          postura: "#c74281",
          core: "#926f11",
        },
      },
      fontFamily: {
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
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
