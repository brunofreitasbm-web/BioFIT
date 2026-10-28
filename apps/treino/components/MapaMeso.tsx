import { cn } from "@/lib/cn";
import { RODADA_DELOAD, SESSOES_POR_RODADA, type StatusPrograma } from "@/lib/program";
import { SESSOES } from "@/lib/exercicios";
import { labelRodada } from "@/lib/motivacao";
import { celulasDoMeso } from "@/lib/mapaMeso";

// Mapa do meso: cada quadrado é uma sessão (linhas = rodadas, colunas = A–E); o número é o dia
// do mês em que foi feita. Ocupa a Visão Geral do Relatório.
export function MapaMeso({ status, dias }: { status: StatusPrograma; dias: string[] }) {
  const concluidasNoMeso = (status.rodada - 1) * SESSOES_POR_RODADA + status.concluidasNaRodada;
  const grade = celulasDoMeso(concluidasNoMeso, dias);
  return (
    <section aria-label={`Mapa do meso ${status.meso}`} className="rounded-xl border vidro p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Mapa do meso {status.meso}</h2>
        <span className="text-xs text-ink-muted">{labelRodada(status)}</span>
      </div>

      <div className="mb-1.5 flex gap-1.5 pl-[3.25rem]">
        {SESSOES.slice(0, SESSOES_POR_RODADA).map((letra) => (
          <span key={letra} className="flex-1 text-center font-mono text-sm font-semibold text-ink-muted">
            {letra}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {grade.map((linha, r) => {
          const deload = r + 1 === RODADA_DELOAD;
          return (
            <div key={r} className="flex items-center gap-1.5">
              <span className="w-12 shrink-0 font-mono text-xs text-ink-muted">{deload ? "deload" : `R${r + 1}`}</span>
              {linha.map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center rounded-lg border font-mono text-sm font-semibold",
                    c.estado === "feita" && "border-accent bg-accent text-on-solid",
                    c.estado === "daVez" && "border-2 border-brand bg-base-900 text-brand",
                    c.estado === "pendente" && (deload ? "border-base-500 bg-base-600" : "border-line bg-base-900"),
                  )}
                >
                  {c.dia ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] bg-accent" /> feita (dia do mês)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] border-2 border-brand" /> a da vez
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] bg-base-600" /> deload
        </li>
      </ul>
    </section>
  );
}
