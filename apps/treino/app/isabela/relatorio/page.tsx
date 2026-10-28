"use client";

import { useEffect, useState } from "react";
import { calcularVolumePorGrupo, evolucaoRecente, semanasNoPeriodo, totalSeriesNoPeriodo, type EvolucaoRecente, type VolumeGrupo } from "@/lib/isabela/relatorio";
import { getTodasSessoes } from "@/lib/isabela/storage";
import type { RegistroSessao } from "@/lib/isabela/tipos";
import { cn } from "@/lib/isabela/cn";
import { RelatorioTabs } from "@/components/isabela/RelatorioTabs";
import { BackupCard } from "@/components/isabela/BackupCard";
import { SeriesPorMusculo } from "@/components/isabela/SeriesPorMusculo";
import { EvolucaoRM } from "@/components/isabela/EvolucaoRM";
import { BarChart3, Dumbbell, Check, History, Timer, TrendingUp } from "lucide-react";
import { EstadoVazio } from "@/components/isabela/EstadoVazio";
import { ICON, STROKE } from "@/lib/isabela/icones";

const PERIODOS: { label: string; valor: number | "tudo" }[] = [
  { label: "7 dias", valor: 7 },
  { label: "30 dias", valor: 30 },
  { label: "Tudo", valor: "tudo" },
];

function formatarHora(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatarDataBR(dataIso: string): string {
  try {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataIso;
  }
}

function formatarDuracaoMs(ms: number): string {
  const min = Math.max(1, Math.round(ms / (1000 * 60)));
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return `${min} min`;
}

export default function RelatorioPage() {
  const [periodo, setPeriodo] = useState<number | "tudo">(7);
  const [volumes, setVolumes] = useState<VolumeGrupo[] | null>(null);
  const [semanas, setSemanas] = useState(1);
  const [evolucao, setEvolucao] = useState<EvolucaoRecente[]>([]);
  const [historicoCompleto, setHistoricoCompleto] = useState(false);

  // Treinos de Força
  const [sessoesForca, setSessoesForca] = useState<RegistroSessao[]>([]);
  const [totalMinutosForca, setTotalMinutosForca] = useState<number>(0);
  const [sessoesForcaCount, setSessoesForcaCount] = useState<number>(0);

  useEffect(() => {
    setVolumes(calcularVolumePorGrupo(periodo));
    setSemanas(semanasNoPeriodo(periodo));
    setEvolucao(evolucaoRecente());
    const agora = new Date();

    // Sessões de treino de força
    const sessoesMap = getTodasSessoes();
    const listaFiltrada: RegistroSessao[] = [];
    let minForcaSum = 0;
    let countForca = 0;

    Object.values(sessoesMap).forEach((lista) => {
      lista.forEach((sessao) => {
        if (periodo !== "tudo") {
          const sessaoData = new Date(sessao.data + "T00:00:00");
          const diffDias = (agora.getTime() - sessaoData.getTime()) / (1000 * 3600 * 24);
          if (diffDias > periodo) return;
        }

        listaFiltrada.push(sessao);

        if (sessao.fimISO) {
          countForca += 1;
          const duracaoMs = new Date(sessao.fimISO).getTime() - new Date(sessao.inicioISO).getTime();
          minForcaSum += Math.max(0, Math.round(duracaoMs / (1000 * 60)));
        }
      });
    });

    // Ordenar do mais recente para o mais antigo
    listaFiltrada.sort((a, b) => {
      if (a.data !== b.data) return b.data.localeCompare(a.data);
      return new Date(b.inicioISO).getTime() - new Date(a.inicioISO).getTime();
    });

    setSessoesForca(listaFiltrada);
    setTotalMinutosForca(minForcaSum);
    setSessoesForcaCount(countForca);
  }, [periodo]);

  return (
    <div className="p-4 space-y-6">
      <header className="mb-2 space-y-2">
        <h1 className="text-3xl font-extrabold uppercase leading-none text-ink">Relatório</h1>
        <RelatorioTabs ativa="/isabela/relatorio" />
      </header>

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

      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi Icone={Dumbbell} valor={String(sessoesForcaCount)} rotulo="sessões" />
        <Kpi Icone={BarChart3} valor={volumes ? String(totalSeriesNoPeriodo(volumes)) : "–"} rotulo="séries" />
        <Kpi Icone={Timer} valor={String(totalMinutosForca)} rotulo="min de treino" />
      </div>
      {/* Séries por grupo muscular, contra a faixa semanal */}
      {volumes && (
        <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <BarChart3 aria-hidden="true" size={ICON.md} className="text-ink-muted" /> Volume por Grupo Muscular
          </h2>
          {volumes.filter((v) => v.seriesFeitas > 0).length === 0 ? (
            <EstadoVazio Icone={BarChart3} texto="Nenhuma série registrada no período selecionado." />
          ) : (
            <>
              <SeriesPorMusculo volumes={volumes} semanas={semanas} />
            </>
          )}
          <p className="text-center text-xs text-ink-faint">
            Inclui séries indiretas (meia série para o músculo auxiliar, ex.: supino → tríceps).
          </p>
        </section>
      )}

      {/* Evolução do 1RM estimado */}
      {evolucao.length > 0 && (
        <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
            <TrendingUp aria-hidden="true" size={ICON.md} className="text-ink-muted" /> 1RM estimado
          </h2>
          <p className="mb-1 text-xs text-ink-muted">Última sessão contra a anterior, em kg.</p>
          <EvolucaoRM itens={evolucao} />
        </section>
      )}

      {/* Histórico Diário de Sessões de Treino */}
      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <History aria-hidden="true" size={ICON.md} className="text-ink-muted" /> Histórico de Treinos Diários
          </h2>
          <span className="text-xs text-ink-faint">{sessoesForca.length} registro(s)</span>
        </div>

        {sessoesForca.length === 0 ? (
          <EstadoVazio Icone={Dumbbell} texto="Nenhum treino iniciado ou concluído no período selecionado." />
        ) : (
          <div className="space-y-2.5">
            {(historicoCompleto ? sessoesForca : sessoesForca.slice(0, 5)).map((sessao, index) => {
              const estaConcluido = Boolean(sessao.fimISO);
              const inicioHora = formatarHora(sessao.inicioISO);
              const fimHora = sessao.fimISO ? formatarHora(sessao.fimISO) : null;
              const duracaoMs = sessao.fimISO
                ? new Date(sessao.fimISO).getTime() - new Date(sessao.inicioISO).getTime()
                : 0;

              return (
                <div
                  key={`${sessao.data}-${sessao.sessaoTipo}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-line/60 bg-base-900 px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", estaConcluido ? "bg-accent-soft text-accent" : "bg-brand-soft text-brand")}>
                      {sessao.sessaoTipo}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-ink">{formatarDataBR(sessao.data)}</p>
                      <p className="text-xs text-ink-muted">
                        Início: {inicioHora} {fimHora ? `· Fim: ${fimHora}` : "· Em andamento"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {estaConcluido ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                        <Check aria-hidden="true" size={ICON.xs} strokeWidth={STROKE.forte} /> {formatarDuracaoMs(duracaoMs)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                        <Timer aria-hidden="true" size={ICON.xs} strokeWidth={STROKE.forte} /> Em andamento
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {sessoesForca.length > 5 && (
          <button
            type="button"
            onClick={() => setHistoricoCompleto((v) => !v)}
            aria-expanded={historicoCompleto}
            className="toque min-h-11 w-full text-center text-xs font-semibold text-brand"
          >
            {historicoCompleto ? "Mostrar menos" : `Ver todos (${sessoesForca.length})`}
          </button>
        )}
      </section>

      <BackupCard />
    </div>
  );
}

function Kpi({ Icone, valor, rotulo }: { Icone: typeof Dumbbell; valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-line bg-base-800 p-3 shadow-sm">
      <Icone aria-hidden="true" size={ICON.sm} className="mb-1 text-ink-faint" />
      <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink">{valor}</p>
      <p className="mt-1 text-xs text-ink-muted">{rotulo}</p>
    </div>
  );
}
