import type { RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";
import {
  dadosDoBackup,
  diasTreinadosUnicosEm,
  KEY_CELEBRADO,
  KEY_LOG,
  KEY_SESSOES,
  KEY_TROCAS,
  sessoesConcluidasEm,
  ultimaExecucaoEm,
  type DadosTreino,
  type SessaoConcluida,
} from "./dados";

export type { SessaoConcluida };

function gravarLocal(chave: string, valor: string): void {
  window.localStorage.setItem(chave, valor);
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
    gravarLocal(KEY_LOG, JSON.stringify(log));
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
  return ultimaExecucaoEm(getLog(), exercicioId, antesDe);
}

// Maior carga já usada num exercício antes de `antesDe` (base do selo "carga nova").
export function maiorCargaAntes(exercicioId: string, antesDe: string): number {
  return getLog()
    .filter((s) => s.exercicioId === exercicioId && s.data < antesDe && s.cargaKg != null && s.reps != null && s.reps > 0)
    .reduce((max, s) => Math.max(max, s.cargaKg as number), 0);
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
    gravarLocal(KEY_SESSOES, JSON.stringify(map));
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
  const agora = new Date().toISOString();
  const novo: RegistroSessao = { data, sessaoTipo, inicioISO: agora, fimISO: null, atualizadoEm: agora };
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
  atual.atualizadoEm = atual.fimISO;
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
  atual.atualizadoEm = new Date().toISOString();
  return saveSessoesPorDia(map);
}

// ===== Troca de exercício por posição (A1, B3...) =====

export function getTrocas(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_TROCAS);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// `exercicioId` null volta ao exercício padrão da posição.
export function setTroca(slotKey: string, exercicioId: string | null): boolean {
  const trocas = getTrocas();
  if (exercicioId === null) delete trocas[slotKey];
  else trocas[slotKey] = exercicioId;
  try {
    gravarLocal(KEY_TROCAS, JSON.stringify(trocas));
    return true;
  } catch {
    return false;
  }
}

// ===== Sessões concluídas do programa (fila A → E) =====

export function sessoesConcluidas(): SessaoConcluida[] {
  return sessoesConcluidasEm({ log: getLog(), sessoes: getTodasSessoes() });
}

export function diasTreinadosUnicos(): string[] {
  return diasTreinadosUnicosEm({ log: getLog(), sessoes: getTodasSessoes() });
}

// ===== Marcos já comemorados =====

export interface Celebrado {
  conquistas: string[];
  nivel: number;
  treinos: string[]; // "<data>:<sessão>" dos treinos já comemorados
}

export function getCelebrado(): Celebrado {
  if (typeof window === "undefined") return { conquistas: [], nivel: 1, treinos: [] };
  try {
    const raw = window.localStorage.getItem(KEY_CELEBRADO);
    const c = raw ? (JSON.parse(raw) as Partial<Celebrado>) : {};
    return {
      conquistas: Array.isArray(c.conquistas) ? c.conquistas : [],
      nivel: typeof c.nivel === "number" ? c.nivel : 1,
      treinos: Array.isArray(c.treinos) ? c.treinos : [],
    };
  } catch {
    return { conquistas: [], nivel: 1, treinos: [] };
  }
}

export function setCelebrado(c: Celebrado): boolean {
  try {
    gravarLocal(KEY_CELEBRADO, JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}

// Tudo de uma vez, no formato das funções puras de lib/dados.ts.
export function lerDadosLocais(): DadosTreino {
  if (typeof window === "undefined") return dadosDoBackup({});
  const ls = window.localStorage;
  return dadosDoBackup({
    [KEY_LOG]: ls.getItem(KEY_LOG),
    [KEY_SESSOES]: ls.getItem(KEY_SESSOES),
    [KEY_TROCAS]: ls.getItem(KEY_TROCAS),
  });
}

// ===== Backup (export/import) =====
// Tudo que o app guarda vive em chaves "isabela:*" do localStorage deste navegador. O backup
// é um JSON com o valor bruto de cada chave, para restaurar em outro aparelho ou após limpar
// os dados do site.

const CHAVES_BACKUP = [KEY_LOG, KEY_SESSOES, KEY_TROCAS, KEY_CELEBRADO];
const BACKUP_FORMATO = "treino-clone-backup";

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
    return "Arquivo não é um backup deste app.";
  }
  const dados = b.dados as Record<string, unknown>;
  for (const [chave, valor] of Object.entries(dados)) {
    if (!CHAVES_BACKUP.includes(chave) || typeof valor !== "string") return `Chave inválida no backup: ${chave}`;
    try {
      JSON.parse(valor);
    } catch {
      return `Conteúdo corrompido em ${chave}.`;
    }
  }
  try {
    for (const chave of CHAVES_BACKUP) {
      const valor = dados[chave];
      if (typeof valor === "string") gravarLocal(chave, valor);
      else window.localStorage.removeItem(chave);
    }
  } catch {
    return "Não foi possível gravar no armazenamento do dispositivo.";
  }
  return null;
}
