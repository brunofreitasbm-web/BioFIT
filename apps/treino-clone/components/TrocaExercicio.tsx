"use client";

import { Check, X } from "lucide-react";
import { useBackLayers } from "@/hooks/useBackHandler";
import { ICON, STROKE } from "@/lib/icones";
import { cn } from "@/lib/cn";
import type { ExercicioEfetivo } from "@/lib/tipos";

// Lista as trocas de uma posição. Todas têm o mesmo movimento e o mesmo grupo muscular, então
// a prescrição (séries e repetições) continua valendo. A troca fica salva para os próximos treinos.
export function TrocaExercicio({
  exercicio,
  series,
  onEscolher,
  onFechar,
}: {
  exercicio: ExercicioEfetivo;
  series: number;
  onEscolher: (id: string) => void;
  onFechar: () => void;
}) {
  useBackLayers([{ active: true, back: onFechar }]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onFechar} role="dialog" aria-modal="true" aria-label="Trocar exercício">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Trocar exercício</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center text-ink-muted">
            <X aria-hidden="true" size={ICON.md} />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Mesmo movimento e mesmo grupo ({exercicio.grupoMuscular}): {series} séries de {exercicio.reps} continuam valendo.
        </p>
        <ul className="space-y-2">
          {exercicio.opcoes.map((o, i) => {
            const atual = o.id === exercicio.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onEscolher(o.id)}
                  aria-pressed={atual}
                  className={cn(
                    "toque flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left",
                    atual ? "border-brand bg-brand-soft" : "border-line bg-base-700 hover:border-brand/50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{o.nome}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {i === 0 ? "Padrão" : "Alternativa"}
                      {o.reps ? ` · ${o.reps}` : ""}
                    </span>
                  </span>
                  {atual && <Check aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} className="shrink-0 text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-ink-faint">A carga de cada exercício é lembrada separadamente: ao trocar, comece leve e ache a sua carga.</p>
      </div>
    </div>
  );
}
