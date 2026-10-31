import { carga72Relativa, resumoCarga, serieCarga, type CargaDia, type ResumoCarga } from "./carga";
import { gerarInsights } from "./cruzamentos";
import { calcularProntidao, serieProntidao, type Prontidao } from "./prontidao";
import type { DiaForca, Insight, PainelGarmin } from "./tipos";

// Tudo o que o painel (e o MCP, e o Coach) precisa, calculado de uma vez a partir dos dados
// Garmin e das séries de força registradas no BioFIT. Função pura: sem rede, sem storage.

export interface DadosPainel {
  painel: PainelGarmin;
  forca: DiaForca[];
  carga: CargaDia[];
  hoje: string; // último dia com dados Garmin
  prontidaoHoje: Prontidao;
  prontidaoSerie: Prontidao[]; // uma por dia de painel.dias
  resumo: ResumoCarga | null;
  insights: Insight[];
}

// Séries do log do BioFIT → séries preenchidas por dia.
export function forcaPorDia(log: { data: string; cargaKg: number | null; reps: number | null }[]): DiaForca[] {
  const por = new Map<string, number>();
  for (const s of log) {
    if (s.cargaKg === null && s.reps === null) continue;
    por.set(s.data, (por.get(s.data) ?? 0) + 1);
  }
  return [...por.entries()].map(([data, series]) => ({ data, series })).sort((a, b) => a.data.localeCompare(b.data));
}

export function montarDadosPainel(painel: PainelGarmin, forca: DiaForca[]): DadosPainel | null {
  if (painel.dias.length === 0) return null;
  const hoje = painel.dias[painel.dias.length - 1].data;
  const datas = [painel.dias[0].data, ...painel.treinos.map((t) => t.data), ...forca.map((f) => f.data)].sort();
  const inicio = datas[0];

  const carga = serieCarga(inicio, hoje, painel.treinos, forca);
  const c72 = (data: string) => carga72Relativa(carga, data);
  const prontidaoSerie = serieProntidao(painel.dias, c72);
  return {
    painel,
    forca,
    carga,
    hoje,
    prontidaoHoje: calcularProntidao(painel.dias, hoje, { carga72: c72(hoje) }),
    prontidaoSerie,
    resumo: resumoCarga(carga, hoje),
    insights: gerarInsights(painel.dias, painel.treinos, forca, carga),
  };
}
