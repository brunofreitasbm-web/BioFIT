"use client";

import { useMemo } from "react";
import { GraficoTempo } from "@/components/GraficoTempo";
import { cruzarIntervalos } from "@/lib/ai/contextoIntegrado";
import type { GarminJanela } from "@/lib/ai/prompts";
import { getMedicoes } from "@/lib/bioimpedancia";
import type { DadosPainel } from "@/lib/recuperacao/painel";
import { getLog } from "@/lib/storage";
import { Cartao } from "./Cartao";

const fmt = (v: number | null, un = "") => (v === null ? "—" : `${v > 0 && un === "kg" ? "+" : ""}${v.toLocaleString("pt-BR")}${un ? ` ${un}` : ""}`);

export function AbaCorpo({ d }: { d: DadosPainel }) {
  const medicoes = useMemo(() => getMedicoes(), []);
  const janela: GarminJanela = useMemo(
    () => ({
      diario: d.painel.dias.map((x) => ({
        data: x.data,
        sonoHoras: x.sonoMin === null ? null : Math.round((x.sonoMin / 60) * 10) / 10,
        sonoScore: x.sonoScore,
        hrvMs: x.hrvMs,
        fcRepouso: x.fcRepouso,
        passos: x.passos,
        estresse: x.estresse,
        bodyBattery: x.bodyBatteryAcordar,
      })),
      treinos: [],
    }),
    [d],
  );
  const intervalos = useMemo(() => cruzarIntervalos(medicoes, getLog(), janela, 8), [medicoes, janela]);

  const serie = (f: (m: (typeof medicoes)[number]) => number | null) => medicoes.flatMap((m) => (f(m) === null ? [] : [{ data: m.data, valor: f(m) as number }]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Cartao titulo="Peso">
          <GraficoTempo pontos={serie((m) => m.pesoKg)} unidade="kg" rotulo="peso" />
        </Cartao>
        <Cartao titulo="Gordura corporal">
          <GraficoTempo pontos={serie((m) => m.gorduraPct)} unidade="%" rotulo="gordura" />
        </Cartao>
        <Cartao titulo="Massa magra">
          <GraficoTempo pontos={serie((m) => m.massaMagraKg)} unidade="kg" rotulo="massa magra" />
        </Cartao>
      </div>
      <Cartao titulo="O que aconteceu entre cada medição" sub="Treino e recuperação média em cada intervalo, ao lado da variação do corpo">
        {intervalos.length === 0 ? (
          <p className="text-sm text-ink-muted">Precisa de pelo menos duas bioimpedâncias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Intervalo</th>
                  <th className="pr-3 font-medium">Peso</th>
                  <th className="pr-3 font-medium">Gordura</th>
                  <th className="pr-3 font-medium">Massa magra</th>
                  <th className="pr-3 font-medium">Treinos/sem</th>
                  <th className="pr-3 font-medium">Séries/sem</th>
                  <th className="pr-3 font-medium">Sono (h)</th>
                  <th className="pr-3 font-medium">FC rep.</th>
                  <th className="font-medium">VFC</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {intervalos.map((i) => (
                  <tr key={i.de + i.ate} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-ink-muted">
                      {i.de.slice(5)} → {i.ate.slice(5)} ({i.dias} d)
                    </td>
                    <td className="pr-3">{fmt(i.delta.pesoKg, "kg")}</td>
                    <td className="pr-3">{fmt(i.delta.gorduraPp, "p.p.")}</td>
                    <td className="pr-3">{fmt(i.delta.massaMagraKg, "kg")}</td>
                    <td className="pr-3">{i.treino.treinosPorSemana}</td>
                    <td className="pr-3">{i.treino.seriesPorSemana}</td>
                    <td className="pr-3">{fmt(i.garmin?.sonoHoras ?? null)}</td>
                    <td className="pr-3">{fmt(i.garmin?.fcRepouso ?? null)}</td>
                    <td>{fmt(i.garmin?.hrvMs ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              Células com “—” são intervalos anteriores ao início da coleta Garmin. Bioimpedância mistura hidratação e hora do dia com mudança real: leia tendência, não um ponto.
            </p>
          </div>
        )}
      </Cartao>
    </div>
  );
}
