import { cn } from "@/lib/cn";
import { RODADA_DELOAD, SESSOES_POR_RODADA, type StatusPrograma } from "@/lib/program";
import { SESSOES } from "@/lib/exercicios";
import { labelRodada } from "@/lib/motivacao";

// Régua do meso: uma célula por sessão (5 rodadas × A–E). Verde = feita, contorno azul = a
// da vez, rodada de deload em tom de papel mais escuro.
export function ReguaMeso({ status }: { status: StatusPrograma }) {
  const rodadas = Array.from({ length: RODADA_DELOAD }, (_, i) => i + 1);
  return (
    <section aria-label="Régua do meso" className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Régua do meso {status.meso}</h2>
        <span className="font-mono text-xs text-ink-muted">
          {status.isDeload ? "deload" : `rodada ${status.rodada} de ${RODADA_DELOAD - 1}`}
        </span>
      </div>
      <div className="flex gap-2" role="img" aria-label={labelRodada(status)}>
        {rodadas.map((r) => (
          <div key={r} className="min-w-0 flex-1">
            <div className="flex gap-0.5">
              {SESSOES.slice(0, SESSOES_POR_RODADA).map((letra, i) => {
                const feita = r < status.rodada || (r === status.rodada && i < status.concluidasNaRodada);
                const daVez = r === status.rodada && i === status.concluidasNaRodada;
                return (
                  <span
                    key={letra}
                    className={cn(
                      "h-[22px] flex-1 rounded-[3px] border",
                      feita && "border-accent bg-accent",
                      daVez && "border-2 border-brand bg-base-900",
                      !feita && !daVez && (r === RODADA_DELOAD ? "border-base-500 bg-base-600" : "border-line bg-base-900"),
                    )}
                  />
                );
              })}
            </div>
            <p className={cn("mt-1 text-center font-mono text-[11px]", r === status.rodada ? "font-semibold text-brand" : "text-ink-muted")}>
              {r === RODADA_DELOAD ? "deload" : `R${r}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
