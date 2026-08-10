import { getLog } from "./storage";
import { getExercicio } from "./exercicios";
import { toISODate } from "./program";
import type { GrupoMuscular } from "./tipos";

export interface VolumeGrupo {
  grupo: GrupoMuscular;
  seriesFeitas: number;
  pct: number; // % do total de séries feitas no período
}

const TODOS_GRUPOS: GrupoMuscular[] = [
  "Peito",
  "Costas",
  "Deltoides",
  "Bíceps",
  "Tríceps",
  "Quadríceps",
  "Posterior",
  "Panturrilha",
  "Postura",
];

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function calcularVolumePorGrupo(periodoDias: number | "tudo", hoje: Date = new Date()): VolumeGrupo[] {
  const log = getLog();
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));

  const contagem = new Map<GrupoMuscular, number>();
  for (const grupo of TODOS_GRUPOS) contagem.set(grupo, 0);

  let totalSeries = 0;
  for (const serie of log) {
    if (serie.cargaKg === null && serie.reps === null) continue; // série não preenchida
    if (dataLimite && serie.data < dataLimite) continue;
    const exercicio = getExercicio(serie.exercicioId);
    if (!exercicio) continue;
    contagem.set(exercicio.grupoMuscular, (contagem.get(exercicio.grupoMuscular) ?? 0) + 1);
    totalSeries++;
  }

  return TODOS_GRUPOS.map((grupo) => {
    const seriesFeitas = contagem.get(grupo) ?? 0;
    return { grupo, seriesFeitas, pct: totalSeries > 0 ? (seriesFeitas / totalSeries) * 100 : 0 };
  }).sort((a, b) => b.seriesFeitas - a.seriesFeitas);
}

export function totalSeriesNoPeriodo(volumes: VolumeGrupo[]): number {
  return volumes.reduce((sum, v) => sum + v.seriesFeitas, 0);
}
