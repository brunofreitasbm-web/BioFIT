"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusDescansoPorSessao } from "@/lib/descanso";
import { SESSOES, SESSAO_NOME } from "@/lib/exercicios";
import type { EscolhaDoDia, SessaoTreino } from "@/lib/tipos";

const OPCOES = SESSOES.map((tipo) => ({ tipo, label: `${tipo} · ${SESSAO_NOME[tipo]}` }));

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
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium text-ink-muted">Treino de hoje — siga a fila A → E</p>
      <div className="flex flex-wrap gap-2">
        {OPCOES.map((op) => {
          const status = statusDescansoPorSessao(op.tipo, hojeISO);
          const algumEmRecuperacao = status.some((s) => s.emRecuperacao);
          const selecionado = efetivo === op.tipo;
          return (
            <button
              key={op.tipo}
              type="button"
              aria-pressed={selecionado}
              onClick={() => onEscolher(op.tipo)}
              className={cn(
                "toque flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold",
                selecionado
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-line bg-base-800 text-ink-muted hover:border-brand/40 hover:text-ink",
              )}
            >
              {op.label}
              {algumEmRecuperacao && (
                <AlertTriangle
                  aria-label="Grupo ainda em recuperação"
                  size={14}
                  strokeWidth={2.25}
                  className={selecionado ? "text-white" : "text-danger"}
                />
              )}
              {op.tipo === sessaoSugerida && !selecionado && (
                <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">próximo</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={efetivo === "DESCANSO"}
          onClick={() => onEscolher("DESCANSO")}
          className={cn(
            "toque min-h-11 rounded-full border px-4 text-sm font-semibold",
            efetivo === "DESCANSO"
              ? "border-brand bg-brand text-white shadow-sm"
              : "border-line bg-base-800 text-ink-muted hover:border-brand/40 hover:text-ink",
          )}
        >
          Descanso
        </button>
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
