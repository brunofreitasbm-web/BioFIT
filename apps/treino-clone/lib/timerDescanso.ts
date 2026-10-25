// Timer de descanso entre séries, global (sobrevive ao card fechar e ao reload).
// Adaptado do padrão de openGym (frontend/src/store/useUI.js + lib/sound.js, AGPL-3.0,
// https://github.com/DuarteSantos8/openGym): guarda o instante ABSOLUTO em que o descanso
// termina (`fimEm`), não um contador. Contador com setTimeout congela quando o celular
// bloqueia a tela ou o navegador joga a aba pra segundo plano; com o instante absoluto,
// basta recalcular `fimEm - agora` ao voltar.

export interface DescansoAtivo {
  fimEm: number; // epoch ms
  totalSeg: number; // duração planejada (para a barra de progresso)
  rotulo: string; // "A1 · Supino reto"
}

const KEY = "treino:timerDescanso";
export const EVENTO_DESCANSO = "treino:timerDescanso";

function emitir(): void {
  window.dispatchEvent(new Event(EVENTO_DESCANSO));
}

export function getDescansoAtivo(): DescansoAtivo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DescansoAtivo;
    return typeof d?.fimEm === "number" && typeof d?.totalSeg === "number" ? d : null;
  } catch {
    return null;
  }
}

function salvar(d: DescansoAtivo | null): void {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    // Sem storage o timer ainda funciona nesta aba; só não sobrevive ao reload.
  }
  emitir();
}

export function iniciarDescanso(segundos: number, rotulo: string, agora: number = Date.now()): void {
  destravarAudio();
  salvar({ fimEm: agora + segundos * 1000, totalSeg: segundos, rotulo });
}

// ±15 s. Nunca deixa o fim antes de agora (pular é outra ação).
export function ajustarDescanso(deltaSeg: number, agora: number = Date.now()): void {
  const d = getDescansoAtivo();
  if (!d) return;
  const fimEm = Math.max(agora, d.fimEm + deltaSeg * 1000);
  salvar({ ...d, fimEm, totalSeg: Math.max(1, d.totalSeg + deltaSeg) });
}

export function pararDescanso(): void {
  salvar(null);
}

// Segundos inteiros que faltam, arredondando pra cima (mostra 0:01 até o último instante).
export function restanteSeg(fimEm: number, agora: number): number {
  return Math.max(0, Math.ceil((fimEm - agora) / 1000));
}

export function formatarMMSS(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ===== Aviso de fim: bipe + vibração =====
// O navegador só libera áudio depois de um gesto do usuário; por isso o AudioContext é criado
// (ou retomado) dentro de `iniciarDescanso`, que roda no toque de confirmar a série.
let audio: AudioContext | null = null;

function destravarAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

export function avisarFimDescanso(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // iOS Safari não tem vibrate.
  }
  if (!audio) return;
  try {
    // Três bipes curtos de 880 Hz.
    const t0 = audio.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.frequency.value = 880;
      const ini = t0 + i * 0.25;
      ganho.gain.setValueAtTime(0.0001, ini);
      ganho.gain.exponentialRampToValueAtTime(0.3, ini + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, ini + 0.15);
      osc.connect(ganho).connect(audio.destination);
      osc.start(ini);
      osc.stop(ini + 0.16);
    }
  } catch {
    // Sem áudio: fica só a vibração/visual.
  }
}
