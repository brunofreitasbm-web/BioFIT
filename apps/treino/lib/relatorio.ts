import { getLog, getTodasSessoes } from "./storage";
import { getExercicio } from "./exercicios";
import { toISODate } from "./program";
import type { GrupoMuscular, SessaoTreino } from "./tipos";

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
  "Glúteo",
  "Panturrilha",
  "Postura",
  "Core",
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

export type TipoFrequencia = SessaoTreino | "PPL";

export interface FrequenciaSessao {
  tipo: TipoFrequencia;
  sessoesConcluidas: number;
  ultimaData: string | null;
}

// A–E do programa atual + um balde "PPL" para as sessões do programa arquivado, para o
// período "Tudo" não esconder o histórico anterior.
const TIPOS_SESSAO: TipoFrequencia[] = ["A", "B", "C", "D", "E", "PPL"];

function tipoFrequencia(sessaoTipo: string): TipoFrequencia {
  return (TIPOS_SESSAO as string[]).includes(sessaoTipo) ? (sessaoTipo as TipoFrequencia) : "PPL";
}

// Frequência de treinos por tipo: quantas sessões concluídas no período e a data mais
// recente de cada uma, para ver "quais treinos" o usuário fez.
export function calcularFrequenciaPorSessao(periodoDias: number | "tudo", hoje: Date = new Date()): FrequenciaSessao[] {
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));
  const contagem = new Map<TipoFrequencia, number>();
  const ultima = new Map<TipoFrequencia, string>();
  for (const tipo of TIPOS_SESSAO) contagem.set(tipo, 0);

  for (const lista of Object.values(getTodasSessoes())) {
    for (const sessao of lista) {
      if (!sessao.fimISO) continue;
      if (dataLimite && sessao.data < dataLimite) continue;
      const tipo = tipoFrequencia(sessao.sessaoTipo);
      contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
      const atual = ultima.get(tipo);
      if (!atual || sessao.data > atual) ultima.set(tipo, sessao.data);
    }
  }

  return TIPOS_SESSAO.map((tipo) => ({
    tipo,
    sessoesConcluidas: contagem.get(tipo) ?? 0,
    ultimaData: ultima.get(tipo) ?? null,
  })).filter((f) => f.tipo !== "PPL" || f.sessoesConcluidas > 0);
}

export interface FrequenciaGrupo {
  grupo: GrupoMuscular;
  diasTreinados: number;
  ultimaData: string | null;
}

// Frequência por grupo muscular: em quantos dias distintos do período o grupo apareceu
// em alguma série registrada, e a data mais recente — complementa o volume (séries) com
// "com que regularidade" cada grupo foi treinado.
export function calcularFrequenciaPorGrupo(periodoDias: number | "tudo", hoje: Date = new Date()): FrequenciaGrupo[] {
  const log = getLog();
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));

  const diasPorGrupo = new Map<GrupoMuscular, Set<string>>();
  for (const grupo of TODOS_GRUPOS) diasPorGrupo.set(grupo, new Set());

  for (const serie of log) {
    if (serie.cargaKg === null && serie.reps === null) continue;
    if (dataLimite && serie.data < dataLimite) continue;
    const exercicio = getExercicio(serie.exercicioId);
    if (!exercicio) continue;
    diasPorGrupo.get(exercicio.grupoMuscular)?.add(serie.data);
  }

  return TODOS_GRUPOS.map((grupo) => {
    const dias = diasPorGrupo.get(grupo) ?? new Set<string>();
    const ordenados = Array.from(dias).sort();
    return {
      grupo,
      diasTreinados: dias.size,
      ultimaData: ordenados.length > 0 ? ordenados[ordenados.length - 1] : null,
    };
  }).sort((a, b) => b.diasTreinados - a.diasTreinados);
}
