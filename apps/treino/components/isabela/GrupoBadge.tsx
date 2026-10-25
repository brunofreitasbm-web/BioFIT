import { cn } from "@/lib/isabela/cn";
import type { GrupoMuscular } from "@/lib/isabela/tipos";

// WCAG 2.1 AA (> 4.5:1) nos dois temas. Claro: fundo -100 / texto -700. Escuro (dark:): cor -400
// a 15% sobre o card, texto -300 (>= 7:1).
const GRUPO_CLASSE: Record<GrupoMuscular, string> = {
  Peito: "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-[#F87171]/15 dark:text-[#FCA5A5] dark:border-[#F87171]/30",
  Costas: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#FBBF24]/15 dark:text-[#FCD34D] dark:border-[#FBBF24]/30",
  Deltoides: "bg-[#D1FAE5] text-[#047857] border-[#A7F3D0] dark:bg-[#34D399]/15 dark:text-[#6EE7B7] dark:border-[#34D399]/30",
  "Bíceps": "bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC] dark:bg-[#22D3EE]/15 dark:text-[#67E8F9] dark:border-[#22D3EE]/30",
  "Tríceps": "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE] dark:bg-[#818CF8]/15 dark:text-[#A5B4FC] dark:border-[#818CF8]/30",
  "Quadríceps": "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] dark:bg-[#38BDF8]/15 dark:text-[#7DD3FC] dark:border-[#38BDF8]/30", // Sky-100 / Sky-700 / Sky-200 (~5.8:1)
  Posterior: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE] dark:bg-[#A78BFA]/15 dark:text-[#C4B5FD] dark:border-[#A78BFA]/30", // Violet-100 / Violet-700 / Violet-200 (~6.1:1)
  "Glúteo": "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA] dark:bg-[#FB923C]/15 dark:text-[#FDBA74] dark:border-[#FB923C]/30", // Orange-100 / Orange-700 / Orange-200
  Panturrilha: "bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4] dark:bg-[#2DD4BF]/15 dark:text-[#5EEAD4] dark:border-[#2DD4BF]/30",
  Postura: "bg-[#FAE8FF] text-[#A21CAF] border-[#F5D0FE] dark:bg-[#E879F9]/15 dark:text-[#F0ABFC] dark:border-[#E879F9]/30",
  Core: "bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3] dark:bg-[#FB7185]/15 dark:text-[#FDA4AF] dark:border-[#FB7185]/30",
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
