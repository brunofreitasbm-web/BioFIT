import { cn } from "@/lib/cn";
import { RODADA_DELOAD, SESSOES_POR_RODADA, type StatusPrograma } from "@/lib/program";
import { labelRodada } from "@/lib/motivacao";

// Rodadas 1–4 + deload do mesociclo corrente, cada uma com 5 sessões (A–E).
export function ProgressoMeso({ status }: { status: StatusPrograma }) {
  const rodadas = Array.from({ length: RODADA_DELOAD }, (_, i) => i + 1);
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
        <span className="font-medium">{labelRodada(status)}</span>
        <span>
          {status.concluidasNaRodada}/{SESSOES_POR_RODADA} sessões na rodada
        </span>
      </div>
      <div className="flex gap-1">
        {rodadas.map((r) => {
          const concluidas = r < status.rodada ? SESSOES_POR_RODADA : r === status.rodada ? status.concluidasNaRodada : 0;
          const atual = r === status.rodada;
          return (
            <div key={r} className="flex-1">
              <div className={cn("h-2 overflow-hidden rounded-full", atual ? "bg-brand-soft" : "bg-base-600")}>
                <div
                  className={cn("h-full rounded-full transition-[width]", atual ? "bg-brand" : "bg-accent")}
                  style={{ width: `${(concluidas / SESSOES_POR_RODADA) * 100}%` }}
                />
              </div>
              <p className={cn("mt-0.5 text-center text-[10px]", atual ? "font-semibold text-brand" : "text-ink-faint")}>
                {r === RODADA_DELOAD ? "Deload" : `R${r}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
