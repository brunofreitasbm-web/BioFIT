"use client";

import type { Exercicio } from "@/lib/tipos";
import { alternativasParaExercicio } from "@/lib/exercicios";
import { GrupoBadge } from "./GrupoBadge";

export function SeletorExercicio({
  original,
  substitutoAtualId,
  onEscolher,
  onFechar,
}: {
  original: Exercicio;
  substitutoAtualId: string | null;
  onEscolher: (novoId: string | null) => void;
  onFechar: () => void;
}) {
  const alternativas = alternativasParaExercicio(original.id);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Mudar exercício"
      onKeyDown={(e) => {
        if (e.key === "Escape") onFechar();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mudar exercício</h2>
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
          Vale só por hoje. Todas as opções trabalham o mesmo grupo muscular: <GrupoBadge grupo={original.grupoMuscular} />
        </p>

        <button
          type="button"
          onClick={() => onEscolher(null)}
          aria-pressed={!substitutoAtualId}
          className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${
            !substitutoAtualId ? "border-brand bg-brand-soft" : "border-line bg-base-700"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{original.nome}</p>
            <p className="text-[11px] text-ink-muted">
              Original do plano · {original.series}×{original.reps}
            </p>
          </div>
          {!substitutoAtualId && (
            <span className="text-accent" aria-hidden="true">
              ✓
            </span>
          )}
        </button>

        <div className="space-y-2">
          {alternativas.map((alt) => {
            const selecionado = substitutoAtualId === alt.id;
            return (
              <button
                key={alt.id}
                type="button"
                onClick={() => onEscolher(alt.id)}
                aria-pressed={selecionado}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${
                  selecionado ? "border-brand bg-brand-soft" : "border-line bg-base-700"
                }`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-base-600">
                  {alt.youtubeId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.youtube.com/vi/${alt.youtubeId}/default.jpg`}
                      alt={alt.nome}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alt.nome}</p>
                  <p className="text-[11px] text-ink-muted">
                    {alt.bloco > 0 ? `Bloco ${alt.bloco} · ` : ""}
                    {alt.series}×{alt.reps}
                  </p>
                </div>
                {selecionado && (
                  <span className="text-accent" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
