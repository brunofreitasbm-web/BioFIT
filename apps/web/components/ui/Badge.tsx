import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { GrupoMuscular } from "@biofit/shared";

const grupoColor: Record<GrupoMuscular, string> = {
  PEITO: "bg-grupo-peito/15 text-grupo-peito border-grupo-peito/30",
  COSTAS: "bg-grupo-costas/15 text-grupo-costas border-grupo-costas/30",
  OMBRO: "bg-grupo-ombro/15 text-grupo-ombro border-grupo-ombro/30",
  BICEPS: "bg-grupo-biceps/15 text-grupo-biceps border-grupo-biceps/30",
  TRICEPS: "bg-grupo-triceps/15 text-grupo-triceps border-grupo-triceps/30",
  QUADRICEPS: "bg-grupo-quadriceps/15 text-grupo-quadriceps border-grupo-quadriceps/30",
  POSTERIOR_COXA: "bg-grupo-posterior/15 text-grupo-posterior border-grupo-posterior/30",
  GLUTEO: "bg-grupo-gluteo/15 text-grupo-gluteo border-grupo-gluteo/30",
  PANTURRILHA: "bg-grupo-panturrilha/15 text-grupo-panturrilha border-grupo-panturrilha/30",
  ABDOMEN: "bg-grupo-abdomen/15 text-grupo-abdomen border-grupo-abdomen/30",
  ANTEBRACO: "bg-grupo-antebraco/15 text-grupo-antebraco border-grupo-antebraco/30",
  CARDIO: "bg-grupo-cardio/15 text-grupo-cardio border-grupo-cardio/30",
};

export function GrupoBadge({ grupo }: { grupo: string }) {
  const colorClass = grupoColor[grupo as GrupoMuscular] ?? "bg-base-600 text-ink-muted border-line";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", colorClass)}>
      {grupo.replace("_", " ")}
    </span>
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-base-700 px-2 py-0.5 text-[11px] font-medium text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
