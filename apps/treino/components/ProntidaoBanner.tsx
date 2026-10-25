"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import type { Prontidao } from "@/lib/prontidao";

// Mostra em uma linha que o treino de hoje está levando em conta a recuperação; o detalhe e o
// "desfazer" ficam recolhidos. Só aparece quando há ajuste (atenção/baixa e fora do deload).
export function ProntidaoBanner({ prontidao, ignorado, onAlternar }: { prontidao: Prontidao | null; ignorado: boolean; onAlternar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const ajuste = prontidao?.ajuste;
  if (!prontidao || !ajuste) return null;
  const baixa = prontidao.nivel === "baixa";

  return (
    <div className={cn("mb-3 rounded-xl border px-3", baixa ? "border-danger/30 bg-danger-soft" : "border-brand/30 bg-brand-soft")}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex min-h-11 w-full items-center gap-2 text-left"
      >
        <AlertTriangle aria-hidden="true" size={ICON.sm} className={cn("shrink-0", baixa ? "text-danger" : "text-brand")} />
        <span className={cn("min-w-0 flex-1 text-xs font-semibold", baixa ? "text-danger" : "text-brand")}>
          {ignorado ? "Ajuste de recuperação desligado hoje" : baixa ? "Treino ajustado: recuperação baixa" : "Treino ajustado: atenção à recuperação"}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={ICON.sm}
          className={cn("shrink-0 text-ink-faint transition-transform duration-200", aberto && "rotate-180")}
        />
      </button>
      {aberto && (
        <div className="anim-revelar pb-2.5">
          {!ignorado && (
            <ul className="list-disc space-y-0.5 pl-6 text-[11px] text-ink-muted">
              <li>Alvo de RIR +{ajuste.rirExtra} em todos os exercícios (pare mais longe da falha).</li>
              <li>Carga sem subir hoje; a progressão fica para o próximo treino.</li>
              {ajuste.reduzirSeries > 0 && <li>Se precisar, faça {ajuste.reduzirSeries} série a menos por exercício (mínimo 2). A contagem do treino não muda.</li>}
              <li>Sem teste de falha.</li>
            </ul>
          )}
          <button
            type="button"
            onClick={onAlternar}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-base-900/60 px-3 text-xs font-semibold text-ink"
          >
            <Undo2 aria-hidden="true" size={ICON.sm} />
            {ignorado ? "Aplicar o ajuste" : "Ignorar hoje e treinar como planejado"}
          </button>
        </div>
      )}
    </div>
  );
}
