import { arred, desvio, ehNum, intervaloIso, media, somarDiasIso } from "./estatistica";
import type { DiaForca, TreinoGarmin } from "./tipos";

// Carga interna unificada: o que o coração sentiu (Garmin) + o que a barra pesou (BioFIT).
//
// - TRIMP de Edwards: minutos em cada zona de FC × peso da zona (1 a 5). Sem zonas, estima a
//   zona pela FC média da atividade contra a FC máxima dela.
// - Força: cada série preenchida soma UA_POR_SERIE. A FC mal enxerga o esforço mecânico de uma
//   série de 6 repetições, então o TRIMP sozinho subestima um treino de perna pesado.
//
// Unidade arbitrária, mas estável: serve para comparar dias do mesmo atleta, não para comparar
// com outras pessoas.

export const PESO_ZONA = [1, 2, 3, 4, 5] as const;
export const UA_POR_SERIE = 3;

export function trimpTreino(t: TreinoGarmin): number {
  if (t.zonasFcS && t.zonasFcS.length === 5) {
    return t.zonasFcS.reduce((acc, seg, i) => acc + (seg / 60) * PESO_ZONA[i], 0);
  }
  if (!ehNum(t.duracaoMin) || !ehNum(t.fcMedia) || !ehNum(t.fcMax) || t.fcMax <= 0) return 0;
  const f = t.fcMedia / t.fcMax;
  const zona = f < 0.6 ? 1 : f < 0.7 ? 2 : f < 0.8 ? 3 : f < 0.9 ? 4 : 5;
  return t.duracaoMin * zona;
}

export interface CargaDia {
  data: string;
  trimp: number;
  forca: number;
  total: number;
}

// Série contínua (dias sem treino valem 0) de `inicio` a `fim`.
export function serieCarga(inicio: string, fim: string, treinos: TreinoGarmin[], forca: DiaForca[]): CargaDia[] {
  const trimpPorDia = new Map<string, number>();
  for (const t of treinos) trimpPorDia.set(t.data, (trimpPorDia.get(t.data) ?? 0) + trimpTreino(t));
  const seriesPorDia = new Map<string, number>();
  for (const f of forca) seriesPorDia.set(f.data, (seriesPorDia.get(f.data) ?? 0) + f.series);
  return intervaloIso(inicio, fim).map((data) => {
    const trimp = trimpPorDia.get(data) ?? 0;
    const f = (seriesPorDia.get(data) ?? 0) * UA_POR_SERIE;
    return { data, trimp: arred(trimp), forca: arred(f), total: arred(trimp + f) };
  });
}

export type ZonaAcwr = "baixa" | "ideal" | "alta" | "muito-alta";

export function zonaAcwr(r: number): ZonaAcwr {
  return r < 0.8 ? "baixa" : r <= 1.3 ? "ideal" : r <= 1.5 ? "alta" : "muito-alta";
}

export interface ResumoCarga {
  data: string;
  aguda: number; // média diária dos últimos 7 dias
  cronica: number; // média diária dos últimos 28 dias
  acwr: number | null;
  zona: ZonaAcwr | null;
  monotonia: number | null; // média/desvio dos últimos 7 dias (Foster)
  strain: number | null; // soma semanal × monotonia
  confiavel: boolean; // ≥ 21 dias de histórico antes da data
}

function janela(serie: CargaDia[], ate: string, dias: number): number[] {
  const ini = somarDiasIso(ate, -(dias - 1));
  return serie.filter((c) => c.data >= ini && c.data <= ate).map((c) => c.total);
}

export function resumoCarga(serie: CargaDia[], data: string): ResumoCarga | null {
  const j7 = janela(serie, data, 7);
  const j28 = janela(serie, data, 28);
  if (j7.length === 0) return null;
  const aguda = media(j7) ?? 0;
  const cronica = media(j28) ?? 0;
  const acwr = cronica > 0 ? arred(aguda / cronica, 2) : null;
  const sd = desvio(j7);
  const monotonia = sd && sd > 0 ? arred(aguda / sd, 2) : null;
  const soma7 = j7.reduce((a, b) => a + b, 0);
  return {
    data,
    aguda: arred(aguda),
    cronica: arred(cronica),
    acwr,
    zona: acwr === null ? null : zonaAcwr(acwr),
    monotonia,
    strain: monotonia === null ? null : arred(soma7 * monotonia, 0),
    confiavel: j28.length >= 21,
  };
}

// Carga dos últimos 3 dias contra o que seria o normal (3 × média diária dos 28 dias anteriores).
// 1,0 = igual ao habitual; 2,0 = o dobro. null sem histórico.
export function carga72Relativa(serie: CargaDia[], data: string): number | null {
  const ultimos3 = janela(serie, data, 3);
  const base = janela(serie, somarDiasIso(data, -3), 28);
  const mediaBase = media(base);
  if (ultimos3.length < 3 || mediaBase === null || mediaBase <= 0) return null;
  return arred(ultimos3.reduce((a, b) => a + b, 0) / (3 * mediaBase), 2);
}
