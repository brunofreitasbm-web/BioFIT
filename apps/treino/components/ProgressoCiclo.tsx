import type { SegmentoCiclo } from "@/lib/progresso";
import { cn } from "@/lib/cn";

export function ProgressoCiclo({ segmentos }: { segmentos: SegmentoCiclo[] }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium text-ink-muted">Ciclo completo (8 semanas + deload)</p>
      <div className="flex gap-1">
        {segmentos.map((s) => (
          <div key={s.label} className="flex-1">
            <div className={cn("h-2 overflow-hidden rounded-full", s.atual ? "bg-brand-soft" : "bg-base-600")}>
              <div
                className={cn("h-full rounded-full transition-[width]", s.atual ? "bg-brand" : "bg-accent")}
                style={{ width: `${Math.min(100, s.pct)}%` }}
              />
            </div>
            <p className={cn("mt-0.5 text-center text-[10px]", s.atual ? "font-semibold text-brand" : "text-ink-faint")}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
