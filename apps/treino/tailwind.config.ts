import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Tema escuro "grafite + laranja-energia" (ui-ux-pro-max: fitness/tracker). Os nomes dos
      // tokens são semânticos (base = superfícies, ink = texto), então os componentes não
      // mudam de classe — só o valor. Contrastes medidos contra base-800 (card):
      // ink 15.5:1 · muted 7.8:1 · faint 5.5:1 · brand 6.6:1 · accent 8.7:1 · danger 6.2:1.
      colors: {
        base: {
          950: "#0A0C0F",
          900: "#0F1216", // fundo da página
          800: "#181C22", // card
          700: "#222730", // input / superfície elevada
          600: "#2C323B", // trilho de barra de progresso
          500: "#3A414C",
        },
        line: "#333A44",
        ink: {
          DEFAULT: "#F2F4F7",
          muted: "#A8B0BC",
          faint: "#8B93A0",
        },
        brand: {
          DEFAULT: "#FF7A1A",
          soft: "#33210F",
          hover: "#FF8F3D",
          ink: "#14100C", // texto sobre fundo brand (7.3:1) — branco sobre laranja não passa AA
        },
        accent: {
          DEFAULT: "#34D27A",
          soft: "#11291B",
          ink: "#0B1A10",
        },
        danger: {
          DEFAULT: "#FF6B7A",
          soft: "#33161B",
          ink: "#1A0A0C",
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
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -14px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(255,122,26,0.35), 0 10px 28px -12px rgba(255,122,26,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
