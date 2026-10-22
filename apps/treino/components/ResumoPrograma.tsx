"use client";

import { useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import { ADERENCIA_META, RODADAS_TREINO, SESSOES_POR_RODADA, type StatusAderencia, type StatusPrograma } from "@/lib/program";
import type { Insight } from "@/lib/motivacao";
import { ProgressoMeso } from "@/components/ProgressoMeso";
import { AderenciaCard } from "@/components/AderenciaCard";

// Resumo do programa em uma linha de selos; o detalhe (insight, rodadas, aderência) fica
// recolhido. Abre sozinho quando a aderência decidiu cair para Upper/Lower, que é aviso.
export function ResumoPrograma({
  status,
  aderencia,
  insight,
}: {
  status: StatusPrograma;
  aderencia: StatusAderencia | null;
  insight: Insight | null;
}) {
  const alerta = aderencia?.decisao === "CAIR_UPPER_LOWER";
  const [aberto, setAberto] = useState(false);
  const mostrar = aberto || alerta;
  const rodada = status.isDeload ? "Deload" : `R${status.rodada}/${RODADAS_TREINO}`;

  return (
    <section className="mb-3" aria-label="Resumo do programa">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={mostrar}
        className="toque flex min-h-11 w-full items-center gap-2 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Selo>
            Meso {status.meso} · {rodada}
          </Selo>
          <Selo>
            {status.concluidasNaRodada}/{SESSOES_POR_RODADA} na rodada
          </Selo>
          {aderencia && (
            <Selo perigo={alerta}>
              Aderência {aderencia.realizadas}/{ADERENCIA_META}
            </Selo>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={ICON.md}
          className={cn("shrink-0 text-ink-faint transition-transform duration-200", mostrar && "rotate-180")}
        />
      </button>

      {mostrar && (
        <div className="anim-revelar mt-1">
          {insight && (
            <div className="mb-3 flex gap-3 rounded-xl border border-brand-soft bg-brand-soft p-3">
              <Target aria-hidden="true" size={ICON.md} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-semibold text-brand-hover">{insight.titulo}</p>
                <p className="mt-1 text-sm text-ink-muted">{insight.mensagem}</p>
              </div>
            </div>
          )}
          <ProgressoMeso status={status} />
          {aderencia && <AderenciaCard aderencia={aderencia} />}
        </div>
      )}
    </section>
  );
}

function Selo({ children, perigo }: { children: React.ReactNode; perigo?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
        perigo ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-base-800 text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
