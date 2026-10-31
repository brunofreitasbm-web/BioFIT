import { arred, diasEntreIso, ehNum, media } from "./estatistica";
import type { DiaForca, DiaRecuperacao } from "./tipos";

// O que aconteceu entre duas medições de bioimpedância: variação do corpo ao lado do treino e da
// recuperação média do mesmo período.

export interface MedicaoCorpo {
  data: string;
  pesoKg: number | null;
  gorduraPct: number | null;
  massaMagraKg: number | null;
}

export interface Intervalo {
  de: string;
  ate: string;
  dias: number;
  delta: { pesoKg: number | null; gorduraPp: number | null; massaMagraKg: number | null };
  treino: { treinosPorSemana: number; seriesPorSemana: number };
  garmin: { diasComDados: number; sonoHoras: number | null; fcRepouso: number | null; hrvMs: number | null } | null;
}

const delta = (a: number | null, b: number | null) => (ehNum(a) && ehNum(b) ? arred(a - b) : null);
const r1 = (n: number | null) => (n === null ? null : arred(n));

export function cruzarIntervalos(medicoes: MedicaoCorpo[], forca: DiaForca[], dias: DiaRecuperacao[], max = 8): Intervalo[] {
  const out: Intervalo[] = [];
  for (let i = Math.max(1, medicoes.length - max); i < medicoes.length; i++) {
    const a = medicoes[i - 1];
    const b = medicoes[i];
    const n = diasEntreIso(a.data, b.data);
    if (n <= 0) continue;
    const semanas = n / 7;
    const treinos = forca.filter((f) => f.data > a.data && f.data <= b.data && f.series > 0);
    const noGarmin = dias.filter((d) => d.data > a.data && d.data <= b.data);
    out.push({
      de: a.data,
      ate: b.data,
      dias: n,
      delta: { pesoKg: delta(b.pesoKg, a.pesoKg), gorduraPp: delta(b.gorduraPct, a.gorduraPct), massaMagraKg: delta(b.massaMagraKg, a.massaMagraKg) },
      treino: {
        treinosPorSemana: arred(treinos.length / semanas),
        seriesPorSemana: arred(treinos.reduce((s, f) => s + f.series, 0) / semanas),
      },
      garmin: noGarmin.length
        ? {
            diasComDados: noGarmin.length,
            sonoHoras: r1(media(noGarmin.map((d) => (d.sonoMin === null ? null : d.sonoMin / 60)))),
            fcRepouso: r1(media(noGarmin.map((d) => d.fcRepouso))),
            hrvMs: r1(media(noGarmin.map((d) => d.hrvMs))),
          }
        : null,
    });
  }
  return out;
}
