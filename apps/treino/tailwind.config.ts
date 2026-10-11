import type { Config } from "tailwindcss";

const v = (nome: string) => `rgb(var(--c-${nome}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Cores vêm de variáveis CSS (triplas RGB) definidas em globals.css, uma por tema, para o
      // modo escuro seguir o sistema sem `dark:` espalhado. `<alpha-value>` mantém funcionando
      // os modificadores de opacidade (bg-brand/20, border-accent/30...).
      colors: {
        base: {
          950: v("base-950"),
          900: v("base-900"),
          800: v("base-800"),
          700: v("base-700"),
          600: v("base-600"),
          500: v("base-500"),
        },
        line: v("line"),
        ink: {
          DEFAULT: v("ink"),
          muted: v("ink-muted"),
          faint: v("ink-faint"),
        },
        brand: {
          DEFAULT: v("brand"),
          soft: v("brand-soft"),
          hover: v("brand-hover"),
        },
        accent: {
          DEFAULT: v("accent"),
          soft: v("accent-soft"),
        },
        warn: v("warn"),
        danger: {
          DEFAULT: v("danger"),
          soft: v("danger-soft"),
        },
        // Texto/ícone sobre preenchimento sólido (brand, accent, danger). Branco no claro;
        // quase-preto no escuro, onde esses preenchimentos ficam mais claros.
        "on-solid": v("on-solid"),
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
        panel: "var(--shadow-panel)",
        nav: "var(--shadow-nav)",
      },
    },
  },
  plugins: [],
};

export default config;
