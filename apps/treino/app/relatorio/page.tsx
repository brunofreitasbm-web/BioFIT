"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { calcularVolumePorGrupo, totalSeriesNoPeriodo, type VolumeGrupo } from "@/lib/relatorio";
import { getTodosBikeIndoor, getTodasSessoes } from "@/lib/storage";
import type { RegistroSessao } from "@/lib/tipos";
import { MuscleMap } from "@/components/MuscleMap";
import { cn } from "@/lib/cn";

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

  // Bike
  const [totalMinutosBike, setTotalMinutosBike] = useState<number>(0);
  const [sessoesBikeCount, setSessoesBikeCount] = useState<number>(0);

  // Treinos de Força
  const [sessoesForca, setSessoesForca] = useState<RegistroSessao[]>([]);
  const [totalMinutosForca, setTotalMinutosForca] = useState<number>(0);
  const [sessoesForcaCount, setSessoesForcaCount] = useState<number>(0);

  useEffect(() => {
    setVolumes(calcularVolumePorGrupo(periodo));
    const agora = new Date();

    // 1. Processar Bike Indoor
    const bikeData = getTodosBikeIndoor();
    let minBikeSum = 0;
    let countBike = 0;

    Object.values(bikeData).forEach((item) => {
      if (!item.concluido) return;
      if (periodo !== "tudo") {
        const itemData = new Date(item.data + "T00:00:00");
        const diffDias = (agora.getTime() - itemData.getTime()) / (1000 * 3600 * 24);
        if (diffDias > periodo) return;
      }
      minBikeSum += item.tempoMinutos;
      countBike += 1;
    });

    setTotalMinutosBike(minBikeSum);
    setSessoesBikeCount(countBike);

    // 2. Processar Sessões de Treino de Força
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
        <h1 className="text-xl font-semibold text-ink">Relatório de Evolução</h1>
        <p className="text-sm text-ink-muted">Acompanhamento diário de treinos e volume muscular</p>
        <div className="flex gap-1.5 rounded-full border border-line bg-base-800 p-1 text-xs font-medium">
          <span className="flex-1 rounded-full bg-brand py-1.5 text-center text-white shadow-sm">Visão Geral</span>
          <Link href="/relatorio/frequencia" className="flex-1 rounded-full py-1.5 text-center text-ink-muted hover:text-ink">
            Frequência
          </Link>
        </div>
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
              periodo === p.valor ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-base-800 text-ink-muted hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Resumos em Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card Força */}
        <div className="rounded-xl border border-line bg-base-800 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl" aria-hidden="true">
              🏋️‍♂️
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Treinos de Força</h3>
              <p className="text-xs text-ink-muted">
                {sessoesForcaCount > 0
                  ? `${sessoesForcaCount} sessão(ões) · ${totalMinutosForca} min totais`
                  : "Nenhum treino concluído no período"}
              </p>
            </div>
          </div>
        </div>

        {/* Card Bike Indoor */}
        <div className="rounded-xl border border-line bg-base-800 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl" aria-hidden="true">
              🚴‍♂️
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Bike Indoor (Cardio)</h3>
              <p className="text-xs text-ink-muted">
                {sessoesBikeCount > 0
                  ? `${sessoesBikeCount} sessão(ões) · ${totalMinutosBike} min totais`
                  : "Nenhuma sessão registrada no período"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Diário de Sessões de Treino */}
      <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Histórico de Treinos Diários</h2>
          <span className="text-xs text-ink-faint">{sessoesForca.length} registro(s)</span>
        </div>

        {sessoesForca.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">Nenhum treino iniciado ou concluído no período selecionado.</p>
        ) : (
          <div className="space-y-2.5">
            {sessoesForca.map((sessao, index) => {
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
                      <p className="text-[11px] text-ink-muted">
                        Início: {inicioHora} {fimHora ? `· Fim: ${fimHora}` : "· Em andamento"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {estaConcluido ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                        <span aria-hidden="true">✓</span> {formatarDuracaoMs(duracaoMs)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
                        <span aria-hidden="true">⏱</span> Em andamento
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Relatório de Volume por Grupo Muscular */}
      {volumes && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink">Volume por Grupo Muscular</h2>
          <MuscleMap volumes={volumes} />
          <p className="pt-2 text-center text-xs text-ink-faint">
            Total: {totalSeriesNoPeriodo(volumes)} séries registradas no período
          </p>
        </section>
      )}
    </div>
  );
}
