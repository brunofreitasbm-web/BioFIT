"use client";

import { useState } from "react";
import type { ExercicioEfetivo } from "@/lib/tipos";
import { opcoesDoSlot } from "@/lib/exercicios";
import { GrupoBadge } from "./GrupoBadge";

const MOTIVOS = ["Estagnação", "Dor/desconforto", "Falta de equipamento", "Outro"];

export function SeletorExercicio({
  atual,
  onEscolher,
  onFechar,
}: {
  atual: ExercicioEfetivo;
  onEscolher: (novoId: string, motivo: string) => void;
  onFechar: () => void;
}) {
  const opcoes = opcoesDoSlot(atual.sessao, atual.slot).filter((o) => o.id !== atual.id);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Trocar exercício"
      onKeyDown={(e) => {
        if (e.key === "Escape") onFechar();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trocar exercício</h2>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted"
            aria-label="Fechar"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Isso muda o Programa Atual (não é só por hoje) e fica registrado no Log de Trocas. Séries, reps e descanso
          continuam os mesmos, só o exercício muda. Todas as opções trabalham{" "}
          <GrupoBadge grupo={atual.grupoMuscular} />.
        </p>

        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium text-ink-muted">Motivo da troca</p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                aria-pressed={motivo === m}
                className={`min-h-8 rounded-full border px-3 py-1 text-[11px] font-medium ${
                  motivo === m ? "border-brand bg-brand-soft text-brand" : "border-line bg-base-700 text-ink-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2 rounded-xl border border-brand bg-brand-soft p-2.5">
          <p className="truncate text-sm font-medium">{atual.nome}</p>
          <p className="text-[11px] text-ink-muted">
            Atual · {atual.series}×{atual.reps}
          </p>
        </div>

        <div className="space-y-2">
          {opcoes.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => onEscolher(opcao.id, motivo)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-base-700 p-2.5 text-left"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-base-600">
                {opcao.youtubeId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://img.youtube.com/vi/${opcao.youtubeId}/default.jpg`}
                    alt={opcao.nome}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{opcao.nome}</p>
                <p className="text-[11px] text-ink-muted">
                  {atual.series}×{atual.reps}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
