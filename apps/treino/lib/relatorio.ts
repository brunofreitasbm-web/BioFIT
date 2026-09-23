import { getLog, getTodasSessoes } from "./storage";
import { getExercicio } from "./exercicios";
import { toISODate } from "./program";
import type { GrupoMuscular, SerieRegistrada, SessaoTreino } from "./tipos";

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

export interface FrequenciaSessao {
  tipo: SessaoTreino;
  sessoesConcluidas: number;
  ultimaData: string | null;
}

const TIPOS_SESSAO: SessaoTreino[] = ["PUSH", "PULL", "LEGS"];

// Frequência de treinos por tipo (PUSH/PULL/LEGS): quantas sessões concluídas no
// período e a data mais recente de cada uma, para ver "quais treinos" o usuário fez.
export function calcularFrequenciaPorSessao(periodoDias: number | "tudo", hoje: Date = new Date()): FrequenciaSessao[] {
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));
  const contagem = new Map<SessaoTreino, number>();
  const ultima = new Map<SessaoTreino, string>();
  for (const tipo of TIPOS_SESSAO) contagem.set(tipo, 0);

  for (const lista of Object.values(getTodasSessoes())) {
    for (const sessao of lista) {
      if (!sessao.fimISO) continue;
      if (dataLimite && sessao.data < dataLimite) continue;
      contagem.set(sessao.sessaoTipo, (contagem.get(sessao.sessaoTipo) ?? 0) + 1);
      const atual = ultima.get(sessao.sessaoTipo);
      if (!atual || sessao.data > atual) ultima.set(sessao.sessaoTipo, sessao.data);
    }
  }

  return TIPOS_SESSAO.map((tipo) => ({
    tipo,
    sessoesConcluidas: contagem.get(tipo) ?? 0,
    ultimaData: ultima.get(tipo) ?? null,
  }));
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

// ===== Evolução por exercício =====

// 1RM estimado (Epley). Com 1 rep é a própria carga.
export function estimar1RM(cargaKg: number, reps: number): number {
  return reps <= 1 ? cargaKg : cargaKg * (1 + reps / 30);
}

export interface PontoHistorico {
  data: string; // YYYY-MM-DD
  cargaMaxKg: number;
  melhor1RM: number; // melhor 1RM estimado entre as séries do dia
  melhorSerie: { cargaKg: number; reps: number };
  volumeKg: number; // Σ kg × reps
  series: number;
}

type SerieCompleta = SerieRegistrada & { cargaKg: number; reps: number };

function seriesValidas(exercicioId: string): SerieCompleta[] {
  return getLog().filter(
    (s): s is SerieCompleta =>
      s.exercicioId === exercicioId && s.cargaKg != null && s.cargaKg > 0 && s.reps != null && s.reps > 0,
  );
}

// Uma entrada por dia em que o exercício teve séries com carga e reps, em ordem cronológica.
export function historicoExercicio(exercicioId: string): PontoHistorico[] {
  const porData = new Map<string, PontoHistorico>();
  for (const s of seriesValidas(exercicioId)) {
    const rm = estimar1RM(s.cargaKg, s.reps);
    const p = porData.get(s.data);
    if (!p) {
      porData.set(s.data, {
        data: s.data,
        cargaMaxKg: s.cargaKg,
        melhor1RM: rm,
        melhorSerie: { cargaKg: s.cargaKg, reps: s.reps },
        volumeKg: s.cargaKg * s.reps,
        series: 1,
      });
      continue;
    }
    p.cargaMaxKg = Math.max(p.cargaMaxKg, s.cargaKg);
    if (rm > p.melhor1RM) {
      p.melhor1RM = rm;
      p.melhorSerie = { cargaKg: s.cargaKg, reps: s.reps };
    }
    p.volumeKg += s.cargaKg * s.reps;
    p.series++;
  }
  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
}

export interface RecordesPessoais {
  cargaMax: { kg: number; data: string } | null;
  melhor1RM: { kg: number; data: string; cargaKg: number; reps: number } | null;
}

// Recordes considerando só as datas anteriores a `antesDe` (exclusivo), quando informado.
export function recordesPessoais(exercicioId: string, antesDe?: string): RecordesPessoais {
  let cargaMax: RecordesPessoais["cargaMax"] = null;
  let melhor1RM: RecordesPessoais["melhor1RM"] = null;
  for (const p of historicoExercicio(exercicioId)) {
    if (antesDe && p.data >= antesDe) continue;
    if (!cargaMax || p.cargaMaxKg > cargaMax.kg) cargaMax = { kg: p.cargaMaxKg, data: p.data };
    if (!melhor1RM || p.melhor1RM > melhor1RM.kg) {
      melhor1RM = { kg: p.melhor1RM, data: p.data, cargaKg: p.melhorSerie.cargaKg, reps: p.melhorSerie.reps };
    }
  }
  return { cargaMax, melhor1RM };
}

export interface ResumoExercicio {
  exercicioId: string;
  nome: string;
  grupo: GrupoMuscular;
  sessoes: number;
  ultimaData: string;
  recorde1RM: number;
  variacao1RM: number | null; // último vs primeiro 1RM estimado, em %
}

// Todos os exercícios com histórico (inclusive os que já foram trocados no programa).
export function resumoExercicios(): ResumoExercicio[] {
  const ids = new Set(getLog().map((s) => s.exercicioId));
  const resumo: ResumoExercicio[] = [];
  for (const id of ids) {
    const exercicio = getExercicio(id);
    if (!exercicio) continue;
    const hist = historicoExercicio(id);
    if (hist.length === 0) continue;
    const primeiro = hist[0].melhor1RM;
    const ultimo = hist[hist.length - 1].melhor1RM;
    resumo.push({
      exercicioId: id,
      nome: exercicio.nome,
      grupo: exercicio.grupoMuscular,
      sessoes: hist.length,
      ultimaData: hist[hist.length - 1].data,
      recorde1RM: Math.max(...hist.map((p) => p.melhor1RM)),
      variacao1RM: hist.length > 1 ? ((ultimo - primeiro) / primeiro) * 100 : null,
    });
  }
  return resumo.sort((a, b) => b.ultimaData.localeCompare(a.ultimaData) || a.nome.localeCompare(b.nome));
}
