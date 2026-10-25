import type { EscolhaDoDia, PalpiteCalibracao, RegistroDiaLeve, RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";
import {
  dadosDoBackup,
  diasTreinadosUnicosEm,
  erroMedioCalibracaoEm,
  KEY_CALIBRACAO,
  KEY_CELEBRADO,
  KEY_DIAS_LEVES,
  KEY_ESCOLHAS,
  KEY_INICIO,
  KEY_LOG,
  KEY_META_SEMANAL,
  KEY_SESSOES,
  sessoesConcluidasEm,
  ultimaExecucaoEm,
  type DadosTreino,
  type SessaoConcluida,
} from "./dados";

export type { SessaoConcluida };

function gravarLocal(chave: string, valor: string): void {
  window.localStorage.setItem(chave, valor);
}

// Primeira abertura: o programa começa hoje. Fica gravado para a contagem não "andar" depois.
export function garantirDataInicio(hojeISO: string): string {
  const atual = getDataInicio();
  if (atual) return atual;
  setDataInicio(hojeISO);
  return hojeISO;
}

export function getDataInicio(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_INICIO);
}

export function setDataInicio(iso: string): boolean {
  try {
    gravarLocal(KEY_INICIO, iso);
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
    gravarLocal(KEY_ESCOLHAS, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function limparSessaoEscolhida(data: string): boolean {
  const map = getEscolhas();
  delete map[data];
  try {
    gravarLocal(KEY_ESCOLHAS, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

// ===== Sessões concluídas do programa (fila A → E) =====

export function sessoesConcluidas(dataInicioISO: string): SessaoConcluida[] {
  return sessoesConcluidasEm({ log: getLog(), sessoes: getTodasSessoes() }, dataInicioISO);
}

export function diasTreinadosUnicos(): string[] {
  return diasTreinadosUnicosEm({ log: getLog(), sessoes: getTodasSessoes() });
}

// ===== Calibração RIR (rodada 1) =====

export function getPalpites(): PalpiteCalibracao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_CALIBRACAO);
    return raw ? (JSON.parse(raw) as PalpiteCalibracao[]) : [];
  } catch {
    return [];
  }
}

export function getPalpite(exercicioId: string, data: string): number | null {
  return getPalpites().find((p) => p.exercicioId === exercicioId && p.data === data)?.palpite ?? null;
}

export function salvarPalpite(entry: PalpiteCalibracao): boolean {
  const lista = getPalpites().filter((p) => !(p.exercicioId === entry.exercicioId && p.data === entry.data));
  lista.push(entry);
  try {
    gravarLocal(KEY_CALIBRACAO, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

// Erro médio (real − palpite) da calibração. O "real" é a última série registrada do
// exercício naquele dia. Erro médio > 2 = você para cedo demais.
export function erroMedioCalibracao(): { amostras: number; erroMedio: number | null } {
  return erroMedioCalibracaoEm({ log: getLog(), palpites: getPalpites() });
}

// ===== Dias leves (caminhada, mobilidade...) =====

export function getDiasLeves(): Record<string, RegistroDiaLeve> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_DIAS_LEVES);
    return raw ? (JSON.parse(raw) as Record<string, RegistroDiaLeve>) : {};
  } catch {
    return {};
  }
}

export function registrarDiaLeve(data: string, atividade: string): boolean {
  try {
    gravarLocal(KEY_DIAS_LEVES, JSON.stringify({ ...getDiasLeves(), [data]: { data, atividade, registradoEm: new Date().toISOString() } }));
    return true;
  } catch {
    return false;
  }
}

export function removerDiaLeve(data: string): boolean {
  const todos = getDiasLeves();
  delete todos[data];
  try {
    gravarLocal(KEY_DIAS_LEVES, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}

// ===== Meta semanal (quantos dias de treino por semana) =====

export const META_SEMANAL_PADRAO = 5;

export function getMetaSemanal(): number {
  if (typeof window === "undefined") return META_SEMANAL_PADRAO;
  const n = Number(window.localStorage.getItem(KEY_META_SEMANAL));
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : META_SEMANAL_PADRAO;
}

export function setMetaSemanal(dias: number): boolean {
  try {
    gravarLocal(KEY_META_SEMANAL, String(Math.min(7, Math.max(1, Math.round(dias)))));
    return true;
  } catch {
    return false;
  }
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
    [KEY_DIAS_LEVES]: ls.getItem(KEY_DIAS_LEVES),
    [KEY_CALIBRACAO]: ls.getItem(KEY_CALIBRACAO),
    [KEY_ESCOLHAS]: ls.getItem(KEY_ESCOLHAS),
    [KEY_INICIO]: ls.getItem(KEY_INICIO),
  });
}

// ===== Backup (export/import) =====
// Tudo que o app guarda vive em chaves "treino:*" do localStorage deste navegador. O backup
// é um JSON com o valor bruto de cada chave, para restaurar em outro aparelho ou após limpar
// os dados do site.

const CHAVES_BACKUP = [KEY_LOG, KEY_INICIO, KEY_SESSOES, KEY_ESCOLHAS, KEY_DIAS_LEVES, KEY_CALIBRACAO, KEY_META_SEMANAL, KEY_CELEBRADO];
// Chaves que guardam texto puro (não JSON).
const CHAVES_TEXTO = [KEY_INICIO, KEY_META_SEMANAL];
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
    if (!CHAVES_TEXTO.includes(chave)) {
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
      if (typeof valor === "string") gravarLocal(chave, valor);
      else window.localStorage.removeItem(chave);
    }
  } catch {
    return "Não foi possível gravar no armazenamento do dispositivo.";
  }
  return null;
}
