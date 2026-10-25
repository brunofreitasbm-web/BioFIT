// Mantém a tela ligada enquanto o treino está em andamento (Screen Wake Lock API).
// Adaptado de openGym (frontend/src/lib/wakelock.js, AGPL-3.0,
// https://github.com/DuarteSantos8/openGym). O navegador solta o lock sozinho quando a aba
// sai de foco; por isso ele é pedido de novo no `visibilitychange`. Sem suporte (Safari < 16.4,
// navegador antigo), tudo vira no-op.

type Sentinela = { release: () => Promise<void> };
type WakeLockNav = Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<Sentinela> } };

let sentinela: Sentinela | null = null;
let ativo = false;

async function pedir(): Promise<void> {
  const wl = (navigator as WakeLockNav).wakeLock;
  if (!wl || document.visibilityState !== "visible") return;
  try {
    sentinela = await wl.request("screen");
  } catch {
    sentinela = null; // bateria fraca, permissão negada etc.
  }
}

function aoMudarVisibilidade(): void {
  if (ativo && document.visibilityState === "visible") void pedir();
}

export function manterTelaLigada(): void {
  if (typeof window === "undefined" || ativo) return;
  ativo = true;
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
  void pedir();
}

export function liberarTela(): void {
  if (typeof window === "undefined" || !ativo) return;
  ativo = false;
  document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  void sentinela?.release().catch(() => {});
  sentinela = null;
}
