import type { ProgressoSemanaInfo } from "@/lib/progresso";
import { SEMANAS_TRABALHO } from "@/lib/program";

export function ProgressoBloco({ info }: { info: ProgressoSemanaInfo }) {
  const pct = Math.min(100, info.pct);
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
        <span className="font-medium">{info.isDeload ? "Semana de deload" : `Semana ${info.semana} de ${SEMANAS_TRABALHO}`}</span>
        <span>
          {info.concluidas}/{info.esperado} sessões
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-base-600">
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
