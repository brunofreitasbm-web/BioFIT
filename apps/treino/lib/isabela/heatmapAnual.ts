import type { SerieRegistrada } from "./tipos";
import { addDiasISO, toISODate } from "./program";

// Grade anual estilo GitHub (53 semanas × 7 dias, segunda a domingo), pintada pelo número de
// séries registradas no dia. Ideia de openGym (frontend/src/components/Heatmap.jsx, AGPL-3.0):
// os 4 níveis de cor são os quartis dos próprios dias treinados, então a escala se ajusta ao
// volume típico de quem usa em vez de depender de um número fixo.

export interface DiaHeatmap {
  data: string; // YYYY-MM-DD
  series: number;
  nivel: 0 | 1 | 2 | 3 | 4;
  futuro: boolean;
}

export function seriesPorDia(log: SerieRegistrada[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of log) {
    if (s.cargaKg === null && s.reps === null) continue; // série não preenchida
    m.set(s.data, (m.get(s.data) ?? 0) + 1);
  }
  return m;
}

function quartis(valores: number[]): [number, number, number] {
  const v = [...valores].sort((a, b) => a - b);
  const q = (p: number) => (v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : 0);
  return [q(0.25), q(0.5), q(0.75)];
}

// Colunas = semanas (a última contém hoje), linhas = seg..dom.
export function gradeAnual(porDia: Map<string, number>, hoje: Date = new Date(), semanas = 53): DiaHeatmap[][] {
  const hojeISO = toISODate(hoje);
  const segundaAtual = addDiasISO(hojeISO, -((hoje.getDay() + 6) % 7));
  const inicio = addDiasISO(segundaAtual, -(semanas - 1) * 7);
  const [t1, t2, t3] = quartis([...porDia.values()].filter((n) => n > 0));
  const nivel = (n: number): DiaHeatmap["nivel"] => (n <= 0 ? 0 : n >= t3 ? 4 : n >= t2 ? 3 : n >= t1 ? 2 : 1);

  const colunas: DiaHeatmap[][] = [];
  for (let w = 0; w < semanas; w++) {
    const col: DiaHeatmap[] = [];
    for (let d = 0; d < 7; d++) {
      const data = addDiasISO(inicio, w * 7 + d);
      const series = porDia.get(data) ?? 0;
      col.push({ data, series, nivel: nivel(series), futuro: data > hojeISO });
    }
    colunas.push(col);
  }
  return colunas;
}
