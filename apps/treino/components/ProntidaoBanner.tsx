"use client";

import { AlertTriangle, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import type { Prontidao } from "@/lib/prontidao";

// Mostra o que o treino de hoje está levando em conta da recuperação e deixa desfazer com um
// toque. Só aparece quando há ajuste (atenção/baixa e fora do deload).
export function ProntidaoBanner({ prontidao, ignorado, onAlternar }: { prontidao: Prontidao | null; ignorado: boolean; onAlternar: () => void }) {
  const ajuste = prontidao?.ajuste;
  if (!prontidao || !ajuste) return null;
  const baixa = prontidao.nivel === "baixa";

  return (
    <div className={cn("mb-4 rounded-xl border px-3 py-2.5", baixa ? "border-danger/30 bg-danger-soft" : "border-brand/30 bg-brand-soft")}>
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" size={ICON.sm} className={cn("mt-0.5 shrink-0", baixa ? "text-danger" : "text-brand")} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", baixa ? "text-danger" : "text-brand")}>
            {ignorado ? "Ajuste de recuperação desligado hoje" : baixa ? "Treino ajustado: recuperação baixa" : "Treino ajustado: atenção à recuperação"}
          </p>
          {!ignorado && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-ink-muted">
              <li>Alvo de RIR +{ajuste.rirExtra} em todos os exercícios (pare mais longe da falha).</li>
              <li>Carga sem subir hoje; a progressão fica para o próximo treino.</li>
              {ajuste.reduzirSeries > 0 && <li>Se precisar, faça {ajuste.reduzirSeries} série a menos por exercício (mínimo 2). A contagem do treino não muda.</li>}
              <li>Sem teste de falha.</li>
            </ul>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onAlternar}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-base-900/60 px-3 text-xs font-semibold text-ink"
      >
        <Undo2 aria-hidden="true" size={ICON.sm} />
        {ignorado ? "Aplicar o ajuste" : "Ignorar hoje e treinar como planejado"}
      </button>
    </div>
  );
}
