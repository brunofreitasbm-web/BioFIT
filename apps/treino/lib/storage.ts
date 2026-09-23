import type {
  EscolhaDoDia,
  LogTroca,
  RegistroBikeIndoor,
  RegistroSessao,
  SerieRegistrada,
  SessaoTreino,
} from "./tipos";
import { getExercicio } from "./exercicios";

const KEY_LOG = "treino:log";
const KEY_INICIO = "treino:dataInicio";
const KEY_SESSOES = "treino:sessoesPorDia";
const KEY_ESCOLHAS = "treino:escolhaPorDia";
const KEY_PROGRAMA_ATUAL = "treino:programaAtual";
const KEY_LOG_TROCAS = "treino:logTrocas";
const KEY_BIKE = "treino:bikeIndoor";


export function getDataInicio(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_INICIO);
}

export function setDataInicio(iso: string): boolean {
  try {
    window.localStorage.setItem(KEY_INICIO, iso);
    return true;
  } catch {
    return false;
  }
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

function saveLog(log: SerieRegistrada[]): boolean {
  try {
    window.localStorage.setItem(KEY_LOG, JSON.stringify(log));
    return true;
  } catch {
    return false;
  }
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
// Um dia pode ter mais de um treino (ex.: Legs de manhã, Push à noite), por isso é uma lista por dia.

export function getTodasSessoes(): Record<string, RegistroSessao[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_SESSOES);
    return raw ? (JSON.parse(raw) as Record<string, RegistroSessao[]>) : {};
  } catch {
    return {};
  }
}

function saveSessoesPorDia(map: Record<string, RegistroSessao[]>): boolean {
  try {
    window.localStorage.setItem(KEY_SESSOES, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
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
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(`draft_session_${sessaoTipo}`);
    } catch {
      // ignore
    }
  }
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

export function setSessaoEscolhida(data: string, valor: EscolhaDoDia): boolean {
  const map = getEscolhas();
  map[data] = valor;
  try {
    window.localStorage.setItem(KEY_ESCOLHAS, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function limparSessaoEscolhida(data: string): boolean {
  const map = getEscolhas();
  delete map[data];
  try {
    window.localStorage.setItem(KEY_ESCOLHAS, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

// ===== Programa Atual (escolha persistente por slot) e Log de Trocas =====
// Substitui o antigo esquema de "substituição só por hoje": na v4 trocar um exercício é
// uma decisão do programa (estagnação, dor, falta de equipamento), não um ajuste diário.

export function getEscolhaPrograma(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_PROGRAMA_ATUAL);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function setEscolhaPrograma(map: Record<string, string>): boolean {
  try {
    window.localStorage.setItem(KEY_PROGRAMA_ATUAL, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function getLogTrocas(): LogTroca[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LOG_TROCAS);
    return raw ? (JSON.parse(raw) as LogTroca[]) : [];
  } catch {
    return [];
  }
}

export function adicionarLogTroca(entry: LogTroca): boolean {
  const log = getLogTrocas();
  log.push(entry);
  try {
    window.localStorage.setItem(KEY_LOG_TROCAS, JSON.stringify(log));
    return true;
  } catch {
    return false;
  }
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
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    return map[data] ?? null;
  } catch {
    return null;
  }
}

export function saveBikeIndoor(entry: RegistroBikeIndoor): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    map[entry.data] = entry;
    window.localStorage.setItem(KEY_BIKE, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function removerBikeIndoor(data: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY_BIKE);
    const map = raw ? (JSON.parse(raw) as Record<string, RegistroBikeIndoor>) : {};
    delete map[data];
    window.localStorage.setItem(KEY_BIKE, JSON.stringify(map));
    return true;
  } catch {
    return false;
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



// ===== Backup (export/import) =====
// Tudo que o app guarda vive em chaves "treino:*" do localStorage deste navegador. O backup
// é um JSON com o valor bruto de cada chave, para restaurar em outro aparelho ou após limpar
// os dados do site.

const CHAVES_BACKUP = [KEY_LOG, KEY_INICIO, KEY_SESSOES, KEY_ESCOLHAS, KEY_PROGRAMA_ATUAL, KEY_LOG_TROCAS, KEY_BIKE];
const BACKUP_FORMATO = "biofit-treino-backup";

export interface BackupTreino {
  formato: typeof BACKUP_FORMATO;
  versao: 1;
  exportadoEm: string; // ISO timestamp
  dados: Record<string, string>;
}

export function exportarTudo(): BackupTreino {
  const dados: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (const chave of CHAVES_BACKUP) {
      const valor = window.localStorage.getItem(chave);
      if (valor !== null) dados[chave] = valor;
    }
  }
  return { formato: BACKUP_FORMATO, versao: 1, exportadoEm: new Date().toISOString(), dados };
}

// Valida o arquivo e SUBSTITUI os dados atuais (chaves ausentes no backup são apagadas).
// Retorna uma mensagem de erro, ou null se deu certo.
export function importarTudo(texto: string): string | null {
  if (typeof window === "undefined") return "Indisponível fora do navegador.";
  let backup: unknown;
  try {
    backup = JSON.parse(texto);
  } catch {
    return "Arquivo não é um JSON válido.";
  }
  const b = backup as Partial<BackupTreino>;
  if (!b || b.formato !== BACKUP_FORMATO || b.versao !== 1 || typeof b.dados !== "object" || b.dados === null) {
    return "Arquivo não é um backup do Treino.";
  }
  const dados = b.dados as Record<string, unknown>;
  for (const [chave, valor] of Object.entries(dados)) {
    if (!CHAVES_BACKUP.includes(chave) || typeof valor !== "string") return `Chave inválida no backup: ${chave}`;
    if (chave !== KEY_INICIO) {
      try {
        JSON.parse(valor);
      } catch {
        return `Conteúdo corrompido em ${chave}.`;
      }
    }
  }
  try {
    for (const chave of CHAVES_BACKUP) {
      const valor = dados[chave];
      if (typeof valor === "string") window.localStorage.setItem(chave, valor);
      else window.localStorage.removeItem(chave);
    }
  } catch {
    return "Não foi possível gravar no armazenamento do dispositivo.";
  }
  return null;
}
