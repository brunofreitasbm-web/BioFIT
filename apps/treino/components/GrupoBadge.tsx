import { cn } from "@/lib/cn";
import type { GrupoMuscular } from "@/lib/tipos";

const GRUPO_CLASSE: Record<GrupoMuscular, string> = {
  Peito: "bg-grupo-peito/15 text-grupo-peito border-grupo-peito/30",
  Costas: "bg-grupo-costas/15 text-grupo-costas border-grupo-costas/30",
  Deltoides: "bg-grupo-deltoides/15 text-grupo-deltoides border-grupo-deltoides/30",
  "Bíceps": "bg-grupo-biceps/15 text-grupo-biceps border-grupo-biceps/30",
  "Tríceps": "bg-grupo-triceps/15 text-grupo-triceps border-grupo-triceps/30",
  "Quadríceps": "bg-grupo-quadriceps/15 text-grupo-quadriceps border-grupo-quadriceps/30",
  Posterior: "bg-grupo-posterior/15 text-grupo-posterior border-grupo-posterior/30",
  Panturrilha: "bg-grupo-panturrilha/15 text-grupo-panturrilha border-grupo-panturrilha/30",
  Postura: "bg-grupo-postura/15 text-grupo-postura border-grupo-postura/30",
};

export const GRUPO_COR_HEX: Record<GrupoMuscular, string> = {
  Peito: "#ff8a5c",
  Costas: "#4f9bff",
  Deltoides: "#ffcf5c",
  "Bíceps": "#8a7bff",
  "Tríceps": "#ff6bd6",
  "Quadríceps": "#4fe0c0",
  Posterior: "#38c7ff",
  Panturrilha: "#a6ff3f",
  Postura: "#ff9fd0",
};

export function GrupoBadge({ grupo }: { grupo: GrupoMuscular }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", GRUPO_CLASSE[grupo])}>
      {grupo}
    </span>
  );
}
