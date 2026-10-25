import { getLog, getTodasSessoes } from "./storage";
import { estimar1RM } from "./rm";
export { estimar1RM };
import { getExercicio } from "./exercicios";
import { toISODate } from "./program";
import type { GrupoMuscular, RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";

export interface VolumeGrupo {
  grupo: GrupoMuscular;
  seriesDiretas: number; // séries de exercícios cujo grupo primário é este
  seriesIndiretas: number; // séries ponderadas vindas de exercícios em que é secundário
  seriesFeitas: number; // diretas + indiretas: é o que ordena, pinta o mapa e dá o %
  pct: number; // % da soma do volume efetivo de todos os grupos no período
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

// Volume por grupo contando os secundários: cada série soma 1 no grupo primário e o peso do
// secundário (ex.: 0,5) em cada grupo secundário — supino conta meia série para tríceps.
export function calcularVolumePorGrupo(
  periodoDias: number | "tudo",
  hoje: Date = new Date(),
  log: SerieRegistrada[] = getLog(),
): VolumeGrupo[] {
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));

  const diretas = new Map<GrupoMuscular, number>();
  const indiretas = new Map<GrupoMuscular, number>();

  for (const serie of log) {
    if (serie.cargaKg === null && serie.reps === null) continue; // série não preenchida
    if (dataLimite && serie.data < dataLimite) continue;
    const exercicio = getExercicio(serie.exercicioId);
    if (!exercicio) continue;
    diretas.set(exercicio.grupoMuscular, (diretas.get(exercicio.grupoMuscular) ?? 0) + 1);
    for (const [grupo, peso] of Object.entries(exercicio.secundarios ?? {}) as [GrupoMuscular, number][]) {
      indiretas.set(grupo, (indiretas.get(grupo) ?? 0) + peso);
    }
  }

  const volumes = TODOS_GRUPOS.map((grupo) => {
    const seriesDiretas = diretas.get(grupo) ?? 0;
    const seriesIndiretas = indiretas.get(grupo) ?? 0;
    return { grupo, seriesDiretas, seriesIndiretas, seriesFeitas: seriesDiretas + seriesIndiretas, pct: 0 };
  });
  const totalEfetivo = volumes.reduce((sum, v) => sum + v.seriesFeitas, 0);
  for (const v of volumes) v.pct = totalEfetivo > 0 ? (v.seriesFeitas / totalEfetivo) * 100 : 0;
  return volumes.sort((a, b) => b.seriesFeitas - a.seriesFeitas);
}

// Faixa semanal de séries por grupo para hipertrofia (consenso comum: ~10–20 séries/semana
// por grupo). É uma escolha de treino, não um dado: ajuste aqui e o relatório inteiro segue.
export const META_SERIES_SEMANA = { min: 10, max: 20 } as const;
// Postura e core não seguem a faixa de hipertrofia.
export const GRUPOS_SEM_META: GrupoMuscular[] = ["Postura", "Core"];

// Semanas cobertas pelo período; em "tudo", desde a primeira série registrada.
export function semanasNoPeriodo(periodoDias: number | "tudo", hoje: Date = new Date(), log: SerieRegistrada[] = getLog()): number {
  if (periodoDias !== "tudo") return Math.max(1, periodoDias / 7);
  const primeira = log.reduce<string | null>((min, s) => (min === null || s.data < min ? s.data : min), null);
  if (!primeira) return 1;
  const dias = (hoje.getTime() - new Date(primeira + "T00:00:00").getTime()) / 86_400_000 + 1;
  return Math.max(1, dias / 7);
}

// 4 → "4", 4.5 → "4,5" (as indiretas têm peso fracionário).
export function formatarSeries(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Séries realmente registradas (só as diretas — as indiretas são as mesmas séries contadas
// de novo em outro grupo).
export function totalSeriesNoPeriodo(volumes: VolumeGrupo[]): number {
  return volumes.reduce((sum, v) => sum + v.seriesDiretas, 0);
}

export type TipoFrequencia = SessaoTreino;

export interface FrequenciaSessao {
  tipo: TipoFrequencia;
  sessoesConcluidas: number;
  ultimaData: string | null;
}

const TIPOS_SESSAO: TipoFrequencia[] = ["A", "B", "C", "D"];

// Frequência de treinos por tipo: quantas sessões concluídas no período e a data mais
// recente de cada uma, para ver "quais treinos" o usuário fez.
export function calcularFrequenciaPorSessao(
  periodoDias: number | "tudo",
  hoje: Date = new Date(),
  sessoes: Record<string, RegistroSessao[]> = getTodasSessoes(),
): FrequenciaSessao[] {
  const dataLimite = periodoDias === "tudo" ? null : toISODate(addDays(hoje, -periodoDias + 1));
  const contagem = new Map<TipoFrequencia, number>();
  const ultima = new Map<TipoFrequencia, string>();
  for (const tipo of TIPOS_SESSAO) contagem.set(tipo, 0);

  for (const lista of Object.values(sessoes)) {
    for (const sessao of lista) {
      if (!sessao.fimISO) continue;
      if (dataLimite && sessao.data < dataLimite) continue;
      const tipo = sessao.sessaoTipo;
      contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
      const atual = ultima.get(tipo);
      if (!atual || sessao.data > atual) ultima.set(tipo, sessao.data);
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
export function calcularFrequenciaPorGrupo(
  periodoDias: number | "tudo",
  hoje: Date = new Date(),
  log: SerieRegistrada[] = getLog(),
): FrequenciaGrupo[] {
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

export interface PontoHistorico {
  data: string; // YYYY-MM-DD
  cargaMaxKg: number;
  melhor1RM: number; // melhor 1RM estimado entre as séries do dia
  melhorSerie: { cargaKg: number; reps: number };
  volumeKg: number; // Σ kg × reps
  series: number;
}

type SerieCompleta = SerieRegistrada & { cargaKg: number; reps: number };

function seriesValidas(exercicioId: string, log: SerieRegistrada[]): SerieCompleta[] {
  return log.filter(
    (s): s is SerieCompleta =>
      s.exercicioId === exercicioId && s.cargaKg != null && s.cargaKg > 0 && s.reps != null && s.reps > 0,
  );
}

// Uma entrada por dia em que o exercício teve séries com carga e reps, em ordem cronológica.
export function historicoExercicio(exercicioId: string, log: SerieRegistrada[] = getLog()): PontoHistorico[] {
  const porData = new Map<string, PontoHistorico>();
  for (const s of seriesValidas(exercicioId, log)) {
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
export function recordesPessoais(exercicioId: string, antesDe?: string, log: SerieRegistrada[] = getLog()): RecordesPessoais {
  let cargaMax: RecordesPessoais["cargaMax"] = null;
  let melhor1RM: RecordesPessoais["melhor1RM"] = null;
  for (const p of historicoExercicio(exercicioId, log)) {
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
export function resumoExercicios(log: SerieRegistrada[] = getLog()): ResumoExercicio[] {
  const ids = new Set(log.map((s) => s.exercicioId));
  const resumo: ResumoExercicio[] = [];
  for (const id of ids) {
    const exercicio = getExercicio(id);
    if (!exercicio) continue;
    const hist = historicoExercicio(id, log);
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

export interface EvolucaoRecente {
  exercicioId: string;
  nome: string;
  anterior1RM: number;
  atual1RM: number;
  variacaoPct: number;
  ultimaData: string;
}

// Último 1RM estimado contra o da sessão imediatamente anterior, dos exercícios mais
// recentes. Exercícios com uma só sessão ainda não têm com o que comparar.
export function evolucaoRecente(limite = 6, log: SerieRegistrada[] = getLog()): EvolucaoRecente[] {
  const lista: EvolucaoRecente[] = [];
  for (const r of resumoExercicios(log)) {
    const hist = historicoExercicio(r.exercicioId, log);
    if (hist.length < 2) continue;
    const anterior = hist[hist.length - 2].melhor1RM;
    const atual = hist[hist.length - 1].melhor1RM;
    lista.push({
      exercicioId: r.exercicioId,
      nome: r.nome,
      anterior1RM: anterior,
      atual1RM: atual,
      variacaoPct: anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0,
      ultimaData: r.ultimaData,
    });
  }
  return lista.slice(0, limite);
}
