import { exportarTudo, registrarAoGravar } from "./storage";

// Envia o histórico (mesmo JSON do backup) para /api/sync, de onde o servidor MCP lê.
// O token fica em `biofit:syncToken` — fora do prefixo "treino:" de propósito, para nunca
// entrar em backup, snapshot de migração nem no que é enviado ao servidor.

const KEY_TOKEN = "biofit:syncToken";
const KEY_ULTIMO = "biofit:syncUltimo";
const ATRASO_MS = 3000;

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

export async function sincronizarAgora(): Promise<ResultadoSync> {
  const token = getTokenSync();
  if (!token) return { ok: false, motivo: "Token não configurado." };
  // Nunca envia um aparelho sem histórico: sobrescreveria o do servidor.
  const backup = exportarTudo();
  if (!backup.dados["treino:log"] && !backup.dados["treino:sessoesPorDia"]) {
    return { ok: false, motivo: "Sem histórico neste aparelho." };
  }
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(backup),
    });
    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
      return { ok: false, motivo: corpo.erro ?? `Erro ${res.status}` };
    }
    const quando = new Date().toISOString();
    try {
      window.localStorage.setItem(KEY_ULTIMO, quando);
    } catch {
      // ignore
    }
    return { ok: true, quando };
  } catch {
    return { ok: false, motivo: "Sem conexão." };
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

function agendar(): void {
  if (!getTokenSync()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void sincronizarAgora(), ATRASO_MS);
}

// Liga o envio automático: depois de cada gravação (com atraso), ao abrir o app e ao
// esconder a aba. Retorna a função que desliga.
export function iniciarSync(): () => void {
  registrarAoGravar(agendar);
  const aoEsconder = () => {
    if (document.visibilityState === "hidden") void sincronizarAgora();
  };
  document.addEventListener("visibilitychange", aoEsconder);
  agendar();
  return () => {
    registrarAoGravar(null);
    document.removeEventListener("visibilitychange", aoEsconder);
    if (timer) clearTimeout(timer);
  };
}
