import type { EscolhaDoDia, RegistroBikeIndoor, RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";
import { getExercicio } from "./exercicios";

const KEY_LOG = "treino:log";
const KEY_INICIO = "treino:dataInicio";
const KEY_SESSOES = "treino:sessoesPorDia";
const KEY_ESCOLHAS = "treino:escolhaPorDia";
const KEY_SUBSTITUICOES = "treino:substituicoes";
const KEY_BIKE = "treino:bikeIndoor";


export function getDataInicio(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_INICIO);
}

export function setDataInicio(iso: string) {
  window.localStorage.setItem(KEY_INICIO, iso);
}

export function getLog(): SerieRegistrada[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LOG);
    return raw ? (JSON.parse(raw) as SerieRegistrada[]) : [];
  } catch {
    return [];
  }
}

function saveLog(log: SerieRegistrada[]) {
  window.localStorage.setItem(KEY_LOG, JSON.stringify(log));
}

export function upsertSerie(entry: SerieRegistrada) {
  const log = getLog();
  const idx = log.findIndex(
    (s) => s.exercicioId === entry.exercicioId && s.data === entry.data && s.serieNumero === entry.serieNumero,
  );
  if (idx >= 0) log[idx] = entry;
  else log.push(entry);
  saveLog(log);
}

export function removerSerie(exercicioId: string, data: string, serieNumero: number) {
  const log = getLog().filter((s) => !(s.exercicioId === exercicioId && s.data === data && s.serieNumero === serieNumero));
  saveLog(log);
}

export function seriesDoExercicioNaData(exercicioId: string, data: string): SerieRegistrada[] {
  return getLog()
    .filter((s) => s.exercicioId === exercicioId && s.data === data)
    .sort((a, b) => a.serieNumero - b.serieNumero);
}

export function ultimaExecucao(exercicioId: string, antesDe?: string): SerieRegistrada[] {
  const registros = getLog().filter((s) => s.exercicioId === exercicioId && (!antesDe || s.data < antesDe));
  if (registros.length === 0) return [];
  const ultimaData = registros.reduce((max, r) => (r.data > max ? r.data : max), registros[0].data);
  return registros.filter((r) => r.data === ultimaData).sort((a, b) => a.serieNumero - b.serieNumero);
}

// ===== Sessões (iniciar/terminar treino) =====
// Um dia pode ter mais de um treino (ex.: Legs de manhã, Push à noite), por isso é uma lista por dia.

function getSessoesPorDia(): Record<string, RegistroSessao[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_SESSOES);
    return raw ? (JSON.parse(raw) as Record<string, RegistroSessao[]>) : {};
  } catch {
    return {};
  }
}

function saveSessoesPorDia(map: Record<string, RegistroSessao[]>) {
  window.localStorage.setItem(KEY_SESSOES, JSON.stringify(map));
}

export function getSessoesDoDia(data: string): RegistroSessao[] {
  return getSessoesPorDia()[data] ?? [];
}

export function getSessaoAtiva(data: string, sessaoTipo: SessaoTreino): RegistroSessao | null {
  return getSessoesDoDia(data).find((r) => r.sessaoTipo === sessaoTipo) ?? null;
}

export function iniciarSessao(data: string, sessaoTipo: SessaoTreino, bloco: number) {
  const map = getSessoesPorDia();
  const lista = map[data] ?? [];
  const idx = lista.findIndex((r) => r.sessaoTipo === sessaoTipo);
  const novo: RegistroSessao = { data, sessaoTipo, bloco, inicioISO: new Date().toISOString(), fimISO: null };
  if (idx >= 0) lista[idx] = novo;
  else lista.push(novo);
  map[data] = lista;
  saveSessoesPorDia(map);
}

export function terminarSessao(data: string, sessaoTipo: SessaoTreino) {
  const map = getSessoesPorDia();
  const lista = map[data] ?? [];
  const atual = lista.find((r) => r.sessaoTipo === sessaoTipo);
  if (atual) {
    atual.fimISO = new Date().toISOString();
    saveSessoesPorDia(map);
  }
}

export function reabrirSessao(data: string, sessaoTipo: SessaoTreino) {
  const map = getSessoesPorDia();
  const lista = map[data] ?? [];
  const atual = lista.find((r) => r.sessaoTipo === sessaoTipo);
  if (atual) {
    atual.fimISO = null;
    saveSessoesPorDia(map);
  }
}

// ===== Escolha manual da sessão do dia (sobrepõe a sugestão de calendário) =====

function getEscolhas(): Record<string, EscolhaDoDia> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_ESCOLHAS);
    return raw ? (JSON.parse(raw) as Record<string, EscolhaDoDia>) : {};
  } catch {
    return {};
  }
}

export function getSessaoEscolhida(data: string): EscolhaDoDia | null {
  return getEscolhas()[data] ?? null;
}

export function setSessaoEscolhida(data: string, valor: EscolhaDoDia) {
  const map = getEscolhas();
  map[data] = valor;
  window.localStorage.setItem(KEY_ESCOLHAS, JSON.stringify(map));
}

export function limparSessaoEscolhida(data: string) {
  const map = getEscolhas();
  delete map[data];
  window.localStorage.setItem(KEY_ESCOLHAS, JSON.stringify(map));
}

// ===== Troca de exercício do dia (mesmo grupo muscular, só para aquele dia) =====

function chaveSubstituicao(data: string, exercicioOriginalId: string): string {
  return `${data}|${exercicioOriginalId}`;
}

function getSubstituicoes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_SUBSTITUICOES);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function getSubstituicao(data: string, exercicioOriginalId: string): string | null {
  return getSubstituicoes()[chaveSubstituicao(data, exercicioOriginalId)] ?? null;
}

export function setSubstituicao(data: string, exercicioOriginalId: string, substitutoId: string) {
  const map = getSubstituicoes();
  map[chaveSubstituicao(data, exercicioOriginalId)] = substitutoId;
  window.localStorage.setItem(KEY_SUBSTITUICOES, JSON.stringify(map));
}

export function removerSubstituicao(data: string, exercicioOriginalId: string) {
  const map = getSubstituicoes();
  delete map[chaveSubstituicao(data, exercicioOriginalId)];
  window.localStorage.setItem(KEY_SUBSTITUICOES, JSON.stringify(map));
}

// ===== Histórico por tipo de sessão (para descanso por grupo muscular e exposição real) =====

export function diasTreinadosPorTipo(tipo: SessaoTreino): string[] {
  const dias = new Set<string>();
  for (const s of getLog()) {
    if (s.cargaKg === null && s.reps === null) continue;
    const exercicio = getExercicio(s.exercicioId);
    if (exercicio?.sessao === tipo) dias.add(s.data);
  }
  for (const lista of Object.values(getSessoesPorDia())) {
    for (const sessao of lista) {
      if (sessao.sessaoTipo === tipo && sessao.fimISO) dias.add(sessao.data);
    }
  }
  return Array.from(dias).sort();
}

export function diasTreinadosUnicos(): string[] {
  const dias = new Set(getLog().map((s) => s.data));
  for (const lista of Object.values(getSessoesPorDia())) {
    for (const sessao of lista) {
      if (sessao.fimISO) dias.add(sessao.data);
    }
  }
  return Array.from(dias).sort();
}

// ===== Bike Indoor =====

export function getBikeIndoor(data: string): RegistroBikeIndoor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    return map[data] ?? null;
  } catch {
    return null;
  }
}

export function saveBikeIndoor(entry: RegistroBikeIndoor) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    map[entry.data] = entry;
    window.localStorage.setItem(KEY_BIKE, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function removerBikeIndoor(data: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    delete map[data];
    window.localStorage.setItem(KEY_BIKE, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getTodosBikeIndoor(): Record<string, RegistroBikeIndoor> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    return raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
  } catch {
    return {};
  }
}

