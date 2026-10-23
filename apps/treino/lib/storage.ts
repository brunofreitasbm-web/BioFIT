import type {
  EscolhaDoDia,
  PalpiteCalibracao,
  RegistroBikeIndoor,
  RegistroCorpo,
  RegistroPostura,
  RegistroSessao,
  SerieRegistrada,
  SessaoTreino,
} from "./tipos";
import { CHAVES_STORAGE_PPL_V4 } from "./arquivo/pplV4";
import {
  dadosDoBackup,
  diasTreinadosUnicosEm,
  erroMedioCalibracaoEm,
  KEY_ARQUIVO_PPL,
  KEY_BIKE,
  KEY_CALIBRACAO,
  KEY_CORPO,
  KEY_ESCOLHAS,
  KEY_INICIO,
  KEY_LOG,
  KEY_POSTURA,
  KEY_REMOVIDOS,
  KEY_SESSOES,
  KEY_VERSAO,
  sessoesConcluidasEm,
  ultimaExecucaoEm,
  type DadosTreino,
  type SessaoConcluida,
} from "./dados";
import { chaveBike, chavePostura, chavesAlteradas, chaveSerie, mesclar, registrarRemocao, type Removido } from "./merge";

export type { SessaoConcluida };
const VERSAO_PROGRAMA = "ulppl-meso1";

// Gancho chamado após cada gravação, para o envio ao servidor (lib/sync.ts) agendar um sync.
let aoGravar: (() => void) | null = null;
export function registrarAoGravar(fn: (() => void) | null): void {
  aoGravar = fn;
}
function gravarLocal(chave: string, valor: string): void {
  window.localStorage.setItem(chave, valor);
  aoGravar?.();
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
  anotarRemocao(chaveSerie({ exercicioId, data, serieNumero }));
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

// ===== Migração PPL → U/L/PPL Meso 1 =====
// Roda uma vez por dispositivo. Tira um snapshot de TODAS as chaves do app para
// `treino:arquivo:ppl-v4` (nada se perde), apaga as chaves que só existiam no PPL e
// recomeça a contagem do programa a partir de hoje. Séries, sessões e bike continuam:
// são histórico real e aparecem nos relatórios.

export function migrarParaMeso1(hojeISO: string): void {
  if (typeof window === "undefined") return;
  try {
    const ls = window.localStorage;
    if (ls.getItem(KEY_VERSAO) === VERSAO_PROGRAMA) return;

    const snapshot: Record<string, string> = {};
    for (let i = 0; i < ls.length; i++) {
      const chave = ls.key(i);
      if (chave && (chave.startsWith("treino:") || chave.startsWith("draft_session_"))) {
        snapshot[chave] = ls.getItem(chave) ?? "";
      }
    }
    if (Object.keys(snapshot).length > 0) {
      ls.setItem(KEY_ARQUIVO_PPL, JSON.stringify({ arquivadoEm: new Date().toISOString(), chaves: snapshot }));
    }

    for (const chave of CHAVES_STORAGE_PPL_V4) ls.removeItem(chave);
    for (const chave of Object.keys(snapshot)) {
      if (chave.startsWith("draft_session_")) ls.removeItem(chave);
    }
    ls.setItem(KEY_INICIO, hojeISO);
    ls.setItem(KEY_VERSAO, VERSAO_PROGRAMA);
  } catch {
    // sem storage (aba privada, cota cheia): o app segue funcionando sem migrar
  }
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
    gravarLocal(KEY_BIKE, JSON.stringify(map));
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
    anotarRemocao(chaveBike(data));
    gravarLocal(KEY_BIKE, JSON.stringify(map));
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



// ===== Composição corporal (importada pelo MCP; o app só lê) =====

export function getTodosCorpo(): Record<string, RegistroCorpo> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_CORPO);
    return raw ? (JSON.parse(raw) as Record<string, RegistroCorpo>) : {};
  } catch {
    return {};
  }
}

// ===== Postura (avaliação por foto; o app grava, o MCP só lê) =====

export function getTodasPosturas(): Record<string, RegistroPostura> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_POSTURA);
    return raw ? (JSON.parse(raw) as Record<string, RegistroPostura>) : {};
  } catch {
    return {};
  }
}

export function salvarPostura(registro: RegistroPostura): boolean {
  try {
    gravarLocal(KEY_POSTURA, JSON.stringify({ ...getTodasPosturas(), [registro.chave]: registro }));
    return true;
  } catch {
    return false;
  }
}

export function removerPostura(chave: string): void {
  const todas = getTodasPosturas();
  if (!todas[chave]) return;
  delete todas[chave];
  anotarRemocao(chavePostura(chave));
  gravarLocal(KEY_POSTURA, JSON.stringify(todas));
}

// ===== Lápides (remoções) e leitura em bloco =====

function getRemovidos(): Removido[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_REMOVIDOS);
    return raw ? (JSON.parse(raw) as Removido[]) : [];
  } catch {
    return [];
  }
}

// Grava sem disparar o sync: quem chama já grava a chave principal logo em seguida.
function anotarRemocao(chave: string): void {
  try {
    window.localStorage.setItem(KEY_REMOVIDOS, JSON.stringify(registrarRemocao(getRemovidos(), chave, new Date().toISOString())));
  } catch {
    // sem storage: a remoção vale só neste aparelho
  }
}

// Tudo de uma vez, no formato das funções puras de lib/dados.ts.
export function lerDadosLocais(): DadosTreino {
  if (typeof window === "undefined") return dadosDoBackup({});
  const ls = window.localStorage;
  return dadosDoBackup({
    [KEY_LOG]: ls.getItem(KEY_LOG),
    [KEY_SESSOES]: ls.getItem(KEY_SESSOES),
    [KEY_BIKE]: ls.getItem(KEY_BIKE),
    [KEY_CALIBRACAO]: ls.getItem(KEY_CALIBRACAO),
    [KEY_ESCOLHAS]: ls.getItem(KEY_ESCOLHAS),
    [KEY_CORPO]: ls.getItem(KEY_CORPO),
    [KEY_POSTURA]: ls.getItem(KEY_POSTURA),
    [KEY_INICIO]: ls.getItem(KEY_INICIO),
  });
}

// ===== Backup (export/import) =====
// Tudo que o app guarda vive em chaves "treino:*" do localStorage deste navegador. O backup
// é um JSON com o valor bruto de cada chave, para restaurar em outro aparelho ou após limpar
// os dados do site.

const CHAVES_BACKUP = [KEY_LOG, KEY_INICIO, KEY_SESSOES, KEY_ESCOLHAS, KEY_BIKE, KEY_CALIBRACAO, KEY_VERSAO, KEY_ARQUIVO_PPL, KEY_REMOVIDOS, KEY_CORPO, KEY_POSTURA];
// Chaves que guardam texto puro (não JSON).
const CHAVES_TEXTO = [KEY_INICIO, KEY_VERSAO];
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

// Aplica o que o servidor devolveu no sync, mesclando com o que está aqui agora (uma série
// gravada durante o envio não se perde). Não dispara o sync de novo. Retorna se algo mudou.
export function aplicarDadosSincronizados(remoto: Record<string, string>): boolean {
  if (typeof window === "undefined") return false;
  const local = exportarTudo().dados;
  const conhecidos = Object.fromEntries(Object.entries(remoto).filter(([k]) => CHAVES_BACKUP.includes(k)));
  const mesclado = mesclar(conhecidos, local);
  const alteradas = chavesAlteradas(local, mesclado).filter((k) => CHAVES_BACKUP.includes(k));
  try {
    for (const chave of alteradas) window.localStorage.setItem(chave, mesclado[chave]);
  } catch {
    return false;
  }
  return alteradas.length > 0;
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
    // Backups feitos no PPL trazem chaves que não existem mais: são ignoradas.
    if (CHAVES_STORAGE_PPL_V4.includes(chave)) continue;
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
