import { cn } from "@/lib/cn";
import type { GrupoMuscular } from "@/lib/tipos";

// WCAG 2.1 AA Compliant Color Mapping (> 4.5:1 Contrast Ratio)
const GRUPO_CLASSE: Record<GrupoMuscular, string> = {
  Peito: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]",
  Costas: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
  Deltoides: "bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]",
  "Bíceps": "bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]",
  "Tríceps": "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]",
  "Quadríceps": "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]", // Sky-100 / Sky-700 / Sky-200 (~5.8:1)
  Posterior: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]", // Violet-100 / Violet-700 / Violet-200 (~6.1:1)
  Panturrilha: "bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]",
  Postura: "bg-[#FAE8FF] text-[#A21CAF] border-[#F5D0FE]",
  Core: "bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]",
};

export function GrupoBadge({ grupo }: { grupo: GrupoMuscular }) {
  return (
    <span
      role="status"
      aria-label={`Grupo muscular: ${grupo}`}
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", GRUPO_CLASSE[grupo])}
    >
      {grupo}
    </span>
  );
}
