"use client";

import { cn } from "@/lib/cn";
import { statusDescansoPorSessao } from "@/lib/descanso";
import type { EscolhaDoDia, SessaoTreino } from "@/lib/tipos";

const OPCOES: { tipo: SessaoTreino; label: string }[] = [
  { tipo: "PUSH", label: "Push" },
  { tipo: "PULL", label: "Pull" },
  { tipo: "LEGS", label: "Legs" },
];

export function SeletorSessao({
  hojeISO,
  sessaoSugerida,
  valorAtual,
  onEscolher,
}: {
  hojeISO: string;
  sessaoSugerida: SessaoTreino | null;
  valorAtual: EscolhaDoDia | null;
  onEscolher: (valor: EscolhaDoDia) => void;
}) {
  const efetivo: EscolhaDoDia | null = valorAtual ?? sessaoSugerida ?? "DESCANSO";

  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium text-ink-muted">Treino de hoje</p>
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
              <span aria-hidden>{algumEmRecuperacao ? "⚠️" : "✅"}</span>
              {op.tipo === sessaoSugerida && !selecionado && (
                <span className="text-[10px] font-normal opacity-70">sugestão</span>
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
            <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              ⚠️{" "}
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
