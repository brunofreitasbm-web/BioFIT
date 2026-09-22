import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  EscolhaDoDia,
  LogTroca,
  RegistroBikeIndoor,
  RegistroSessao,
  SerieRegistrada,
  SessaoTreino,
} from "./tipos";
import { getExercicio } from "./exercicios";

// Porta o storage.ts do app web (localStorage, síncrono) pro AsyncStorage do RN, que é
// assíncrono. Pra manter a mesma ergonomia de leitura síncrona em toda a lógica de negócio
// portada (program.ts, progresso.ts, etc.), tudo fica num cache em memória hidratado uma
// única vez no boot (`hydrateStorage`) — depois disso os getters leem só da memória, e os
// setters escrevem na memória e persistem em background no AsyncStorage.
const KEYS = {
  LOG: "treino:log",
  INICIO: "treino:dataInicio",
  SESSOES: "treino:sessoesPorDia",
  ESCOLHAS: "treino:escolhaPorDia",
  PROGRAMA_ATUAL: "treino:programaAtual",
  LOG_TROCAS: "treino:logTrocas",
  BIKE: "treino:bikeIndoor",
} as const;

const cache = new Map<string, string>();
let hydrated = false;

export async function hydrateStorage(): Promise<void> {
  if (hydrated) return;
  const pairs = await AsyncStorage.multiGet(Object.values(KEYS));
  for (const [k, v] of pairs) if (v != null) cache.set(k, v);
  hydrated = true;
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = cache.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    cache.set(key, raw);
    void AsyncStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

// ===== Data de início do programa =====

export function getDataInicio(): string | null {
  return cache.get(KEYS.INICIO) ?? null;
}

export function setDataInicio(iso: string): boolean {
  cache.set(KEYS.INICIO, iso);
  void AsyncStorage.setItem(KEYS.INICIO, iso);
  return true;
}

// ===== Log de séries registradas =====

export function getLog(): SerieRegistrada[] {
  return readJSON(KEYS.LOG, []);
}

function saveLog(log: SerieRegistrada[]): boolean {
  return writeJSON(KEYS.LOG, log);
}

export function upsertSerie(entry: SerieRegistrada): boolean {
  const log = getLog();
  const idx = log.findIndex(
    (s) => s.exercicioId === entry.exercicioId && s.data === entry.data && s.serieNumero === entry.serieNumero,
  );
  if (idx >= 0) log[idx] = entry;
  else log.push(entry);
  return saveLog(log);
}

export function removerSerie(exercicioId: string, data: string, serieNumero: number): boolean {
  const log = getLog().filter((s) => !(s.exercicioId === exercicioId && s.data === data && s.serieNumero === serieNumero));
  return saveLog(log);
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

export function getTodasSessoes(): Record<string, RegistroSessao[]> {
  return readJSON(KEYS.SESSOES, {});
}

function saveSessoesPorDia(map: Record<string, RegistroSessao[]>): boolean {
  return writeJSON(KEYS.SESSOES, map);
}

export function getSessoesDoDia(data: string): RegistroSessao[] {
  return getTodasSessoes()[data] ?? [];
}

export function getSessaoAtiva(data: string, sessaoTipo: SessaoTreino): RegistroSessao | null {
  return getSessoesDoDia(data).find((r) => r.sessaoTipo === sessaoTipo) ?? null;
}

export function iniciarSessao(data: string, sessaoTipo: SessaoTreino): boolean {
  const map = getTodasSessoes();
  const lista = map[data] ?? [];
  const idx = lista.findIndex((r) => r.sessaoTipo === sessaoTipo);
  const novo: RegistroSessao = { data, sessaoTipo, inicioISO: new Date().toISOString(), fimISO: null };
  if (idx >= 0) lista[idx] = novo;
  else lista.push(novo);
  map[data] = lista;
  return saveSessoesPorDia(map);
}

export function terminarSessao(data: string, sessaoTipo: SessaoTreino): boolean {
  const map = getTodasSessoes();
  const lista = map[data] ?? [];
  const atual = lista.find((r) => r.sessaoTipo === sessaoTipo);
  if (!atual) return false;
  atual.fimISO = new Date().toISOString();
  return saveSessoesPorDia(map);
}

export function reabrirSessao(data: string, sessaoTipo: SessaoTreino): boolean {
  const map = getTodasSessoes();
  const lista = map[data] ?? [];
  const atual = lista.find((r) => r.sessaoTipo === sessaoTipo);
  if (!atual) return false;
  atual.fimISO = null;
  return saveSessoesPorDia(map);
}

// ===== Escolha manual da sessão do dia (sobrepõe a sugestão de calendário) =====

function getEscolhas(): Record<string, EscolhaDoDia> {
  return readJSON(KEYS.ESCOLHAS, {});
}

export function getSessaoEscolhida(data: string): EscolhaDoDia | null {
  return getEscolhas()[data] ?? null;
}

export function setSessaoEscolhida(data: string, valor: EscolhaDoDia): boolean {
  const map = getEscolhas();
  map[data] = valor;
  return writeJSON(KEYS.ESCOLHAS, map);
}

export function limparSessaoEscolhida(data: string): boolean {
  const map = getEscolhas();
  delete map[data];
  return writeJSON(KEYS.ESCOLHAS, map);
}

// ===== Programa Atual (escolha persistente por slot) e Log de Trocas =====

export function getEscolhaPrograma(): Record<string, string> {
  return readJSON(KEYS.PROGRAMA_ATUAL, {});
}

export function setEscolhaPrograma(map: Record<string, string>): boolean {
  return writeJSON(KEYS.PROGRAMA_ATUAL, map);
}

export function getLogTrocas(): LogTroca[] {
  return readJSON(KEYS.LOG_TROCAS, []);
}

export function adicionarLogTroca(entry: LogTroca): boolean {
  const log = getLogTrocas();
  log.push(entry);
  return writeJSON(KEYS.LOG_TROCAS, log);
}

// ===== Histórico por tipo de sessão (para descanso por grupo muscular e exposição real) =====

export function diasTreinadosPorTipo(tipo: SessaoTreino): string[] {
  const dias = new Set<string>();
  for (const s of getLog()) {
    if (s.cargaKg === null && s.reps === null) continue;
    const exercicio = getExercicio(s.exercicioId);
    if (exercicio?.sessao === tipo) dias.add(s.data);
  }
  for (const lista of Object.values(getTodasSessoes())) {
    for (const sessao of lista) {
      if (sessao.sessaoTipo === tipo && sessao.fimISO) dias.add(sessao.data);
    }
  }
  return Array.from(dias).sort();
}

export function diasTreinadosUnicos(): string[] {
  const dias = new Set(getLog().map((s) => s.data));
  for (const lista of Object.values(getTodasSessoes())) {
    for (const sessao of lista) {
      if (sessao.fimISO) dias.add(sessao.data);
    }
  }
  return Array.from(dias).sort();
}

// ===== Bike Indoor =====

export function getBikeIndoor(data: string): RegistroBikeIndoor | null {
  const map = readJSON<Record<string, RegistroBikeIndoor>>(KEYS.BIKE, {});
  return map[data] ?? null;
}

export function saveBikeIndoor(entry: RegistroBikeIndoor): boolean {
  const map = readJSON<Record<string, RegistroBikeIndoor>>(KEYS.BIKE, {});
  map[entry.data] = entry;
  return writeJSON(KEYS.BIKE, map);
}

export function removerBikeIndoor(data: string): boolean {
  const map = readJSON<Record<string, RegistroBikeIndoor>>(KEYS.BIKE, {});
  delete map[data];
  return writeJSON(KEYS.BIKE, map);
}

export function getTodosBikeIndoor(): Record<string, RegistroBikeIndoor> {
  return readJSON(KEYS.BIKE, {});
}
