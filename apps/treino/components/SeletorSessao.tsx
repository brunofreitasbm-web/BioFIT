"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusDescansoPorSessao } from "@/lib/descanso";
import { SESSOES, SESSAO_NOME } from "@/lib/exercicios";
import type { EscolhaDoDia, SessaoTreino } from "@/lib/tipos";

const OPCOES = SESSOES.map((tipo) => ({ tipo, label: `Treino ${tipo}, ${SESSAO_NOME[tipo]}` }));

export function SeletorSessao({
  hojeISO,
  sessaoSugerida,
  valorAtual,
  onEscolher,
}: {
  hojeISO: string;
  sessaoSugerida: SessaoTreino;
  valorAtual: EscolhaDoDia | null;
  onEscolher: (valor: EscolhaDoDia) => void;
}) {
  const efetivo: EscolhaDoDia = valorAtual ?? sessaoSugerida;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Fila A → E</p>
        <button
          type="button"
          onClick={() => onEscolher("DESCANSO")}
          aria-pressed={efetivo === "DESCANSO"}
          className={cn(
            "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors",
            efetivo === "DESCANSO" ? "border-brand bg-brand text-brand-ink" : "border-line text-ink-muted hover:text-ink",
          )}
        >
          Descanso hoje
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Sessão de hoje">
        {OPCOES.map((op) => {
          const status = statusDescansoPorSessao(op.tipo, hojeISO);
          const algumEmRecuperacao = status.some((s) => s.emRecuperacao);
          const selecionado = efetivo === op.tipo;
          const proximo = op.tipo === sessaoSugerida;
          return (
            <button
              key={op.tipo}
              type="button"
              onClick={() => onEscolher(op.tipo)}
              aria-pressed={selecionado}
              aria-label={`${op.label}${proximo ? ", próximo da fila" : ""}${algumEmRecuperacao ? ", grupo ainda em recuperação" : ""}`}
              className={cn(
                "relative flex min-h-[64px] flex-col items-center justify-center rounded-xl border transition-all duration-150 active:scale-[0.97]",
                selecionado
                  ? "border-brand bg-brand text-brand-ink shadow-glow"
                  : proximo
                    ? "border-brand/50 bg-base-800 text-ink"
                    : "border-line bg-base-800 text-ink-muted hover:text-ink",
              )}
            >
              <span className="font-display text-2xl font-bold leading-none">{op.tipo}</span>
              <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-wide", selecionado ? "text-brand-ink/80" : "text-ink-faint")}>
                {SESSAO_NOME[op.tipo]}
              </span>
              {algumEmRecuperacao && (
                <AlertTriangle
                  aria-hidden="true"
                  size={12}
                  strokeWidth={2.5}
                  className={cn("absolute right-1 top-1", selecionado ? "text-brand-ink" : "text-danger")}
                />
              )}
              {proximo && !selecionado && (
                <span aria-hidden="true" className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      {efetivo !== "DESCANSO" &&
        (() => {
          const status = statusDescansoPorSessao(efetivo, hojeISO);
          const avisos = status.filter((s) => s.emRecuperacao);
          if (avisos.length === 0) return null;
          return (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              <AlertTriangle aria-hidden="true" size={14} strokeWidth={2.25} className="mt-0.5 shrink-0" />
              {avisos
                .map((a) => `${a.grupo} treinado há ${a.diasDesdeUltimo === 0 ? "hoje" : `${a.diasDesdeUltimo} dia(s)`}`)
                .join(" · ")}{" "}
              — ainda em recuperação, mas a escolha é sua.
            </p>
          );
        })()}
    </div>
  );
}
