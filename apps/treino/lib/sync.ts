import { aplicarDadosSincronizados, exportarTudo, registrarAoGravar } from "./storage";

// Envia o histórico (mesmo JSON do backup) para /api/sync. O servidor mescla com o que já tem
// (inclusive o que o MCP gravou) e devolve o resultado, que é aplicado aqui.
// O token fica em `biofit:syncToken` — fora do prefixo "treino:" de propósito, para nunca
// entrar em backup, snapshot de migração nem no que é enviado ao servidor.

const KEY_TOKEN = "biofit:syncToken";
const KEY_ULTIMO = "biofit:syncUltimo";
const ATRASO_MS = 3000;
export const EVENTO_DADOS_ATUALIZADOS = "biofit:dadosAtualizados";

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
    const corpo = (await res.json().catch(() => ({}))) as { dados?: Record<string, string> };
    if (corpo.dados && aplicarDadosSincronizados(corpo.dados)) {
      window.dispatchEvent(new Event(EVENTO_DADOS_ATUALIZADOS));
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

// Traz o histórico do servidor para este aparelho (navegador novo/limpo). Mescla com o local.
export async function restaurarDoServidor(): Promise<ResultadoSync> {
  const token = getTokenSync();
  if (!token) return { ok: false, motivo: "Token não configurado." };
  try {
    const res = await fetch("/api/sync", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const corpo = (await res.json().catch(() => ({}))) as { erro?: string; dados?: Record<string, string> };
    if (!res.ok || !corpo.dados) return { ok: false, motivo: corpo.erro ?? `Erro ${res.status}` };
    if (aplicarDadosSincronizados(corpo.dados)) window.dispatchEvent(new Event(EVENTO_DADOS_ATUALIZADOS));
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
// esconder a aba; ao voltar para a aba, sincroniza para trazer o que o MCP gravou.
// Retorna a função que desliga.
export function iniciarSync(): () => void {
  registrarAoGravar(agendar);
  const aoMudarVisibilidade = () => {
    if (document.visibilityState === "hidden") void sincronizarAgora();
    else agendar();
  };
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
  agendar();
  return () => {
    registrarAoGravar(null);
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    if (timer) clearTimeout(timer);
  };
}
