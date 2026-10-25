"use client";

import { BarChart3, Dumbbell } from "lucide-react";
import { EstadoVazio } from "@/components/EstadoVazio";
import { useEffect, useState } from "react";
import {
  calcularFrequenciaPorGrupo,
  calcularFrequenciaPorSessao,
  type FrequenciaGrupo,
  type FrequenciaSessao,
} from "@/lib/relatorio";
import { corCalor } from "@/lib/cor";
import { cn } from "@/lib/cn";
import { SESSAO_NOME } from "@/lib/exercicios";
import { RelatorioTabs } from "@/components/RelatorioTabs";
import { HeatmapAnual } from "@/components/HeatmapAnual";

const PERIODOS: { label: string; valor: number | "tudo" }[] = [
  { label: "7 dias", valor: 7 },
  { label: "30 dias", valor: 30 },
  { label: "Tudo", valor: "tudo" },
];

function nomeTipo(tipo: FrequenciaSessao["tipo"]): string {
  return SESSAO_NOME[tipo];
}

function formatarDataBR(dataIso: string | null): string {
  if (!dataIso) return "—";
  try {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataIso;
  }
}

export default function FrequenciaPage() {
  const [periodo, setPeriodo] = useState<number | "tudo">(30);
  const [porSessao, setPorSessao] = useState<FrequenciaSessao[]>([]);
  const [porGrupo, setPorGrupo] = useState<FrequenciaGrupo[]>([]);

  useEffect(() => {
    setPorSessao(calcularFrequenciaPorSessao(periodo));
    setPorGrupo(calcularFrequenciaPorGrupo(periodo));
  }, [periodo]);

  const maxDias = Math.max(1, ...porGrupo.map((g) => g.diasTreinados));
  const totalSessoes = porSessao.reduce((sum, s) => sum + s.sessoesConcluidas, 0);

  return (
    <div className="p-4 space-y-6">
      <header className="mb-2 space-y-2">
        <h1 className="text-xl font-semibold text-ink">Frequência de Treinos</h1>
        <p className="text-sm text-ink-muted">Quais treinos e grupos musculares você tem feito com mais regularidade</p>
        <RelatorioTabs ativa="/relatorio/frequencia" />
      </header>

      {/* Últimos 12 meses — independe do seletor de período abaixo */}
      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-ink">Últimos 12 meses</h2>
        <HeatmapAnual />
      </section>

      {/* Seletor de Período */}
      <div className="flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPeriodo(p.valor)}
            aria-pressed={periodo === p.valor}
            className={cn(
              "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors",
              periodo === p.valor ? "border-brand bg-brand text-on-solid shadow-sm" : "border-line bg-base-800 text-ink-muted hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Frequência por tipo de treino */}
      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Quais Treinos</h2>
          <span className="text-xs text-ink-faint">{totalSessoes} sessão(ões) concluída(s)</span>
        </div>

        {totalSessoes === 0 ? (
          <EstadoVazio Icone={Dumbbell} texto="Nenhum treino concluído no período selecionado." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {porSessao.map((s) => (
              <div key={s.tipo} className="rounded-lg border border-line/60 bg-base-900 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-soft px-1 text-xs font-bold text-brand">
                    {s.tipo}
                  </span>
                  <span className="text-xs font-semibold text-ink">{nomeTipo(s.tipo)}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink">{s.sessoesConcluidas}</p>
                <p className="text-[11px] text-ink-muted">
                  {s.sessoesConcluidas === 1 ? "sessão" : "sessões"} · última em {formatarDataBR(s.ultimaData)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Frequência por grupo muscular */}
      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Quais Grupos Musculares</h2>
          <span className="text-xs text-ink-faint">Dias distintos no período</span>
        </div>

        {porGrupo.every((g) => g.diasTreinados === 0) ? (
          <EstadoVazio
            Icone={BarChart3}
            texto="Ainda não há séries registradas neste período. Marque suas séries na aba Hoje para a frequência por grupo aparecer aqui."
          />
        ) : (
          <div className="space-y-2.5">
            {porGrupo.map((g) => (
              <div key={g.grupo} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{g.grupo}</span>
                  <span className="text-ink-faint">
                    {g.diasTreinados} {g.diasTreinados === 1 ? "dia" : "dias"} · última em {formatarDataBR(g.ultimaData)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-base-900 dark:bg-base-700">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${(g.diasTreinados / maxDias) * 100}%`,
                      backgroundColor: g.diasTreinados > 0 ? corCalor(g.diasTreinados / maxDias) : "transparent",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
