// Mirrors the palette in tailwind.config.ts. Tailwind classes can't be used for raw SVG
// stroke/fill props, so chart code reads hex values from here instead of re-typing literals
// that would silently drift from the design tokens if the palette is retuned later.
export const CHART_COLORS = {
  brand: "#FF7A1A",
  accent: "#34D27A",
  danger: "#FF6B7A",
  info: "#38c7ff",
  grid: "#333A44", // = line
  label: "#8B93A0", // = ink.faint
  surface: "#181C22", // = base.800
} as const;
