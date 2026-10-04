import type { SerieRegistrada } from "./tipos";
import { getExercicio } from "./exercicios";

// Envio das séries para uma planilha Google (Apps Script publicado como Web App, ver
// integracoes/google-sheets). Cada alteração entra numa fila no localStorage e é enviada
// quando houver rede; o script faz upsert pela chave da série, então reenviar é seguro.
// Este módulo não importa o storage.ts (o storage é quem o chama).

const KEY_CONFIG = "treino:sync:config";
const KEY_FILA = "treino:sync:fila";
const KEY_STATUS = "treino:sync:status";
const EVENTO = "treino:sync";
const LOTE = 50;
const ESPERA_RETRY_MS = 30_000;

export interface ConfigSync {
  url: string;
  token: string;
}

type Operacao =
  | { tipo: "upsert"; chave: string; serie: SerieRegistrada }
  | { tipo: "remover"; chave: string; exercicioId: string; data: string; serieNumero: number };

export interface StatusSync {
  pendentes: number;
  ultimoEnvio: string | null; // ISO
  erro: string | null;
}

export function chaveSerie(s: Pick<SerieRegistrada, "exercicioId" | "data" | "serieNumero">): string {
  return `${s.data}|${s.exercicioId}|${s.serieNumero}`;
}

function ler<T>(chave: string, padrao: T): T {
  if (typeof window === "undefined") return padrao;
  try {
    const raw = window.localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // cota cheia / aba privada: o histórico local segue valendo, só a fila não persiste
  }
}

export function getConfigSync(): ConfigSync | null {
  const c = ler<Partial<ConfigSync> | null>(KEY_CONFIG, null);
  return c && c.url ? { url: c.url, token: c.token ?? "" } : null;
}

export function salvarConfigSync(config: ConfigSync | null): void {
  if (typeof window === "undefined") return;
  try {
    if (config && config.url.trim()) {
      window.localStorage.setItem(KEY_CONFIG, JSON.stringify({ url: config.url.trim(), token: config.token.trim() }));
    } else {
      window.localStorage.removeItem(KEY_CONFIG);
    }
  } catch {
    // ignore
  }
  avisar();
}

function getFila(): Operacao[] {
  return ler<Operacao[]>(KEY_FILA, []);
}

export function getStatusSync(): StatusSync {
  const s = ler<{ ultimoEnvio: string | null; erro: string | null }>(KEY_STATUS, { ultimoEnvio: null, erro: null });
  return { pendentes: getFila().length, ultimoEnvio: s.ultimoEnvio, erro: s.erro };
}

function guardarStatus(parcial: { ultimoEnvio?: string | null; erro?: string | null }): void {
  const atual = ler<{ ultimoEnvio: string | null; erro: string | null }>(KEY_STATUS, { ultimoEnvio: null, erro: null });
  gravar(KEY_STATUS, { ...atual, ...parcial });
}

function avisar(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function ouvirSync(callback: () => void): () => void {
  window.addEventListener(EVENTO, callback);
  return () => window.removeEventListener(EVENTO, callback);
}

// Só a última operação de cada série interessa: editar 3× antes de haver rede envia 1×.
function enfileirar(ops: Operacao[]): void {
  if (!getConfigSync()) return;
  const porChave = new Map(getFila().map((o) => [o.chave, o]));
  for (const op of ops) {
    porChave.delete(op.chave); // reinsere no fim, preservando a ordem de edição
    porChave.set(op.chave, op);
  }
  gravar(KEY_FILA, Array.from(porChave.values()));
  avisar();
  void enviarPendentes();
}

export function enfileirarSerie(serie: SerieRegistrada): void {
  enfileirar([{ tipo: "upsert", chave: chaveSerie(serie), serie }]);
}

export function enfileirarRemocao(exercicioId: string, data: string, serieNumero: number): void {
  enfileirar([{ tipo: "remover", chave: chaveSerie({ exercicioId, data, serieNumero }), exercicioId, data, serieNumero }]);
}

// Backfill: coloca todo o histórico local na fila (o script atualiza linhas que já existam).
export function enfileirarHistorico(log: SerieRegistrada[]): number {
  enfileirar(log.filter((s) => s.cargaKg !== null || s.reps !== null).map((serie) => ({ tipo: "upsert", chave: chaveSerie(serie), serie })));
  return log.length;
}

function linha(s: SerieRegistrada) {
  const ex = getExercicio(s.exercicioId);
  return {
    chave: chaveSerie(s),
    data: s.data,
    sessao: s.sessao ?? "",
    rodada: s.rodada ?? null,
    exercicioId: s.exercicioId,
    exercicio: ex?.nome ?? s.exercicioId,
    serie: s.serieNumero,
    cargaKg: s.cargaKg,
    reps: s.reps,
    rir: s.rir ?? null,
    observacoes: s.observacoes ?? "",
    registradoEm: s.registradoEm,
  };
}

let enviando = false;
let timerRetry: ReturnType<typeof setTimeout> | null = null;

export async function enviarPendentes(): Promise<void> {
  if (typeof window === "undefined" || enviando) return;
  const config = getConfigSync();
  if (!config) return;
  if (navigator.onLine === false) return;

  enviando = true;
  try {
    for (;;) {
      const lote = getFila().slice(0, LOTE);
      if (lote.length === 0) break;
      const resposta = await fetch(config.url, {
        method: "POST",
        // text/plain evita o preflight CORS, que o Apps Script não responde.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          token: config.token,
          ops: lote.map((o) => (o.tipo === "upsert" ? { op: "upsert", ...linha(o.serie) } : { op: "remover", data: o.data, exercicio: getExercicio(o.exercicioId)?.nome ?? o.exercicioId, serie: o.serieNumero })),
        }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean; erro?: string };
      if (!resposta.ok || !corpo.ok) throw new Error(corpo.erro ?? `HTTP ${resposta.status}`);

      // Tira da fila só o que foi enviado E não mudou desde então (edição durante o envio).
      const enviadas = new Map(lote.map((o) => [o.chave, o]));
      gravar(
        KEY_FILA,
        getFila().filter((o) => !(enviadas.has(o.chave) && JSON.stringify(enviadas.get(o.chave)) === JSON.stringify(o))),
      );
      guardarStatus({ ultimoEnvio: new Date().toISOString(), erro: null });
      avisar();
    }
  } catch (e) {
    guardarStatus({ erro: e instanceof Error ? e.message : "Falha de rede" });
    avisar();
    if (timerRetry === null) {
      timerRetry = setTimeout(() => {
        timerRetry = null;
        void enviarPendentes();
      }, ESPERA_RETRY_MS);
    }
  } finally {
    enviando = false;
  }
}

// Chamado uma vez ao abrir o app: reenvia o que sobrou e reage a volta de rede / app em primeiro plano.
export function iniciarSync(): () => void {
  const tentar = () => void enviarPendentes();
  const aoVoltar = () => {
    if (document.visibilityState === "visible") tentar();
  };
  window.addEventListener("online", tentar);
  document.addEventListener("visibilitychange", aoVoltar);
  tentar();
  return () => {
    window.removeEventListener("online", tentar);
    document.removeEventListener("visibilitychange", aoVoltar);
  };
}
