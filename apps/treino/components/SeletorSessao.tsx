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
              onClick={() => onEscolher(op.tipo)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                selecionado ? "border-brand bg-brand text-white" : "border-line bg-base-800 text-ink-muted",
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
                <span className="text-[10px] font-normal opacity-70">próximo</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onEscolher("DESCANSO")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium",
            efetivo === "DESCANSO" ? "border-brand bg-brand text-white" : "border-line bg-base-800 text-ink-muted",
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
