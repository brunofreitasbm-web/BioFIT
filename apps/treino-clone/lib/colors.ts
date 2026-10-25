// Mirrors the palette in tailwind.config.ts. Tailwind classes can't be used for raw SVG
// stroke/fill props, so chart code reads hex values from here instead of re-typing literals
// that would silently drift from the design tokens if the palette is retuned later.
export const CHART_COLORS = {
  brand: "#3d63e0",
  accent: "#12793a",
  danger: "#c22d3f",
  info: "#38c7ff",
} as const;
