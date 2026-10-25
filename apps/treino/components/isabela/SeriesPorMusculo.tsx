import { cn } from "@/lib/isabela/cn";
import { formatarSeries, GRUPOS_SEM_META, META_SERIES_SEMANA, type VolumeGrupo } from "@/lib/isabela/relatorio";

// A trilha vai até 25% acima do teto da faixa, para a faixa verde aparecer no meio.
const ESCALA = META_SERIES_SEMANA.max * 1.25;

// Séries por semana de cada grupo contra a faixa de hipertrofia. Barra âmbar = abaixo do
// piso; a cor nunca é o único sinal: o texto diz "abaixo", "na faixa" ou "acima".
export function SeriesPorMusculo({ volumes, semanas }: { volumes: VolumeGrupo[]; semanas: number }) {
  const linhas = volumes.filter((v) => v.seriesFeitas > 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
        <span>Séries por semana (média)</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-4 rounded-sm bg-accent/25 ring-1 ring-accent/40" />
          faixa {META_SERIES_SEMANA.min}–{META_SERIES_SEMANA.max}
        </span>
      </div>
      <ul className="space-y-2.5">
        {linhas.map((v) => {
          const porSemana = v.seriesFeitas / semanas;
          const semMeta = GRUPOS_SEM_META.includes(v.grupo);
          const estado = semMeta
            ? null
            : porSemana < META_SERIES_SEMANA.min
              ? "abaixo"
              : porSemana > META_SERIES_SEMANA.max
                ? "acima"
                : "na faixa";
          const largura = Math.min(100, (porSemana / ESCALA) * 100);
          return (
            <li key={v.grupo} className="text-xs">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{v.grupo}</span>
                <span className="tabular-nums text-ink-muted">
                  {formatarSeries(Math.round(porSemana * 10) / 10)}
                  {estado && (
                    <span className={cn("ml-1.5 font-semibold", estado === "abaixo" ? "text-warn" : "text-ink-faint")}>
                      {estado}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-sm bg-base-700">
                {!semMeta && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 bg-accent/25"
                    style={{
                      left: `${(META_SERIES_SEMANA.min / ESCALA) * 100}%`,
                      width: `${((META_SERIES_SEMANA.max - META_SERIES_SEMANA.min) / ESCALA) * 100}%`,
                    }}
                  />
                )}
                <span
                  className={cn("absolute inset-y-0.5 left-0 rounded-sm", estado === "abaixo" ? "bg-warn" : "bg-brand")}
                  style={{ width: `${largura}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
