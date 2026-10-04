import { cn } from "@/lib/cn";
import type { GrupoMuscular } from "@/lib/tipos";

// Tons escuros com texto claro do mesmo matiz (todos > 7:1 de contraste).
const GRUPO_CLASSE: Record<GrupoMuscular, string> = {
  Peito: "bg-[#3A1618] text-[#FCA5A5] border-[#5C2427]",
  Costas: "bg-[#33260C] text-[#FCD34D] border-[#57400F]",
  Deltoides: "bg-[#0E2E24] text-[#6EE7B7] border-[#17493A]",
  "Bíceps": "bg-[#0B2B33] text-[#67E8F9] border-[#134552]",
  "Tríceps": "bg-[#1C1F45] text-[#A5B4FC] border-[#2D3270]",
  "Quadríceps": "bg-[#0C2638] text-[#7DD3FC] border-[#143D5A]",
  Posterior: "bg-[#261A45] text-[#C4B5FD] border-[#3C2A6B]",
  "Glúteo": "bg-[#36200E] text-[#FDBA74] border-[#5A3414]",
  Panturrilha: "bg-[#0B2B28] text-[#5EEAD4] border-[#134540]",
  Postura: "bg-[#321538] text-[#F0ABFC] border-[#50225A]",
  Core: "bg-[#361622] text-[#FDA4AF] border-[#5A2236]",
};

export function GrupoBadge({ grupo }: { grupo: GrupoMuscular }) {
  return (
    <span
      role="status"
      aria-label={`Grupo muscular: ${grupo}`}
      className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", GRUPO_CLASSE[grupo])}
    >
      {grupo}
    </span>
  );
}
