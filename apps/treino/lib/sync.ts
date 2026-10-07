import { exportarTudo, registrarAoGravar } from "./storage";

// Envia o histórico (mesmo JSON do backup) para /api/sync, de onde o servidor MCP lê.
// O token fica em `biofit:syncToken` — fora do prefixo "treino:" de propósito, para nunca
// entrar em backup, snapshot de migração nem no que é enviado ao servidor.

const KEY_TOKEN = "biofit:syncToken";
const KEY_ULTIMO = "biofit:syncUltimo";
const KEY_ERRO = "biofit:syncErro";
const ATRASO_MS = 3000;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 5 * 60 * 1000;
// fetch com keepalive rejeita corpo acima de ~64 KB: acima disso envia sem keepalive.
const LIMITE_KEEPALIVE_BYTES = 60_000;

export type ResultadoSync = { ok: true; quando: string } | { ok: false; motivo: string };

export function getTokenSync(): string {
  try {
    return window.localStorage.getItem(KEY_TOKEN) ?? "";
  } catch {
    return "";
  }
}

export function setTokenSync(token: string): void {
  try {
    if (token) window.localStorage.setItem(KEY_TOKEN, token);
    else window.localStorage.removeItem(KEY_TOKEN);
  } catch {
    // sem storage: o sync simplesmente fica desligado
  }
}

export function getUltimoSync(): string | null {
  try {
    return window.localStorage.getItem(KEY_ULTIMO);
  } catch {
    return null;
  }
}

export function getErroSync(): string | null {
  try {
    return window.localStorage.getItem(KEY_ERRO);
  } catch {
    return null;
  }
}

function setErroSync(motivo: string | null): void {
  try {
    if (motivo) window.localStorage.setItem(KEY_ERRO, motivo);
    else window.localStorage.removeItem(KEY_ERRO);
  } catch {
    // ignore
  }
}

// Erros que não adianta repetir: token errado, formato inválido, trava de histórico.
const SEM_RETRY = new Set([400, 401, 409, 413]);

type Opcoes = { forcar?: boolean; keepalive?: boolean };

let emVoo = false;
let sujoDuranteVoo = false;

export async function sincronizarAgora(opcoes: Opcoes = {}): Promise<ResultadoSync> {
  if (emVoo) {
    sujoDuranteVoo = true;
    return { ok: false, motivo: "Envio já em andamento." };
  }
  emVoo = true;
  try {
    return await enviar(opcoes);
  } finally {
    emVoo = false;
    if (sujoDuranteVoo) {
      sujoDuranteVoo = false;
      agendar();
    }
  }
}

async function enviar({ forcar = false, keepalive = false }: Opcoes): Promise<ResultadoSync> {
  const token = getTokenSync();
  if (!token) return { ok: false, motivo: "Token não configurado." };
  // Nunca envia um aparelho sem histórico: sobrescreveria o do servidor.
  const backup = exportarTudo();
  if (!backup.dados["treino:log"] && !backup.dados["treino:sessoesPorDia"]) {
    return { ok: false, motivo: "Sem histórico neste aparelho." };
  }
  const corpo = JSON.stringify(backup);
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  if (forcar) headers["X-Sync-Forcar"] = "1";
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers,
      body: corpo,
      keepalive: keepalive && corpo.length < LIMITE_KEEPALIVE_BYTES,
    });
    if (!res.ok) {
      const erro = (await res.json().catch(() => ({}))) as { erro?: string };
      const motivo = erro.erro ?? `Erro ${res.status}`;
      setErroSync(motivo);
      if (!SEM_RETRY.has(res.status)) agendarRetry();
      return { ok: false, motivo };
    }
    const quando = new Date().toISOString();
    tentativas = 0;
    setErroSync(null);
    try {
      window.localStorage.setItem(KEY_ULTIMO, quando);
    } catch {
      // ignore
    }
    return { ok: true, quando };
  } catch {
    setErroSync("Sem conexão.");
    agendarRetry();
    return { ok: false, motivo: "Sem conexão." };
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let timerRetry: ReturnType<typeof setTimeout> | null = null;
let tentativas = 0;

function agendar(): void {
  if (!getTokenSync()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void sincronizarAgora(), ATRASO_MS);
}

// Backoff exponencial (5s, 10s, 20s… até 5 min) para falhas de rede ou do servidor.
function agendarRetry(): void {
  if (timerRetry) clearTimeout(timerRetry);
  const atraso = Math.min(RETRY_BASE_MS * 2 ** tentativas, RETRY_MAX_MS);
  tentativas += 1;
  timerRetry = setTimeout(() => void sincronizarAgora(), atraso);
}

// Liga o envio automático: depois de cada gravação (com atraso), ao abrir o app, ao esconder
// a aba e ao voltar a ter conexão. Falhas recuperáveis são repetidas com backoff.
// Retorna a função que desliga.
export function iniciarSync(): () => void {
  registrarAoGravar(agendar);
  const aoEsconder = () => {
    if (document.visibilityState === "hidden" && getTokenSync()) void sincronizarAgora({ keepalive: true });
  };
  const aoVoltarOnline = () => {
    if (getTokenSync()) {
      tentativas = 0;
      void sincronizarAgora();
    }
  };
  document.addEventListener("visibilitychange", aoEsconder);
  window.addEventListener("online", aoVoltarOnline);
  agendar();
  return () => {
    registrarAoGravar(null);
    document.removeEventListener("visibilitychange", aoEsconder);
    window.removeEventListener("online", aoVoltarOnline);
    if (timer) clearTimeout(timer);
    if (timerRetry) clearTimeout(timerRetry);
  };
}
