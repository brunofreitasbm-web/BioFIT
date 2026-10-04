import type { SessaoTreino } from "./tipos";
import { SESSOES } from "./exercicios";
import { getSessoesDoDia, sessoesConcluidas } from "./storage";

// Programa sequencial: 1 rodada = A+B+C+D+E (5 sessões). Rodadas 1–4 = treino, rodada 5 =
// deload, depois troca de mesociclo (todos os exercícios mudam). A contagem é por sessões
// concluídas, não por calendário: semana fraca alonga o meso, mas cada exercício recebe as
// mesmas 4 exposições.
export const SESSOES_POR_RODADA = 5;
export const RODADAS_TREINO = 4;
export const RODADA_DELOAD = 5;
export const SESSOES_POR_MESO = SESSOES_POR_RODADA * RODADA_DELOAD; // 25

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDiasISO(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

export function proximaDaFila(sessao: SessaoTreino): SessaoTreino {
  return SESSOES[(SESSOES.indexOf(sessao) + 1) % SESSOES.length];
}

// Sessão sugerida para hoje: se hoje já começou/terminou alguma sessão do programa, é ela
// (o app não pula para a próxima no meio do dia). Senão, a seguinte à última concluída.
export function sessaoSugerida(dataInicioISO: string, hojeISO: string): SessaoTreino {
  const deHoje = getSessoesDoDia(hojeISO).filter((r) => (SESSOES as string[]).includes(r.sessaoTipo));
  if (deHoje.length > 0) return deHoje[deHoje.length - 1].sessaoTipo as SessaoTreino;
  const concluidas = sessoesConcluidas(dataInicioISO);
  const ultima = concluidas[concluidas.length - 1];
  return ultima ? proximaDaFila(ultima.tipo) : "A";
}

export interface StatusPrograma {
  totalConcluidas: number;
  meso: number; // 1, 2, 3...
  rodada: number; // 1–5 (5 = deload)
  isDeload: boolean;
  concluidasNaRodada: number; // 0–4, sem contar a sessão de hoje
}

// Status da sessão que está sendo feita hoje. A própria sessão de hoje não entra na conta —
// senão, ao terminar a 5ª sessão da rodada, a tela pularia para a rodada seguinte.
export function getStatusPrograma(dataInicioISO: string, hojeISO: string, sessaoHoje: SessaoTreino | null): StatusPrograma {
  const anteriores = sessoesConcluidas(dataInicioISO).filter((s) => !(s.data === hojeISO && s.tipo === sessaoHoje));
  const total = anteriores.length;
  const posNoMeso = total % SESSOES_POR_MESO;
  const rodada = Math.floor(posNoMeso / SESSOES_POR_RODADA) + 1;
  return {
    totalConcluidas: total,
    meso: Math.floor(total / SESSOES_POR_MESO) + 1,
    rodada,
    isDeload: rodada === RODADA_DELOAD,
    concluidasNaRodada: posNoMeso % SESSOES_POR_RODADA,
  };
}

// Deload: metade das séries (arredondando para cima, mínimo 1).
export function seriesDaRodada(series: number, isDeload: boolean): number {
  return isDeload ? Math.max(1, Math.ceil(series / 2)) : series;
}

// ===== Gatilho de aderência (aba "Aderência") =====
// Janela de 14 dias a partir do início. Meta 10 sessões; menos de 8 → o programa cai
// para Upper/Lower 4x, sem renegociação.
export const ADERENCIA_JANELA_DIAS = 14;
export const ADERENCIA_META = 10;
export const ADERENCIA_MINIMO = 8;

export type DecisaoAderencia = "EM_ANDAMENTO" | "MANTER_5X" | "CAIR_UPPER_LOWER";

export interface StatusAderencia {
  inicio: string;
  fim: string; // último dia da janela (inclusivo)
  realizadas: number;
  diasRestantes: number; // 0 quando a janela acabou
  decisao: DecisaoAderencia;
}

// Regra literal da planilha: a decisão só sai quando a janela de 14 dias fecha.
// `diasRestantes` conta hoje; 0 = janela encerrada.
export function decidirAderencia(realizadas: number, diasRestantes: number): DecisaoAderencia {
  if (diasRestantes > 0) return "EM_ANDAMENTO";
  return realizadas >= ADERENCIA_MINIMO ? "MANTER_5X" : "CAIR_UPPER_LOWER";
}

export function getStatusAderencia(dataInicioISO: string, hojeISO: string): StatusAderencia {
  const fim = addDiasISO(dataInicioISO, ADERENCIA_JANELA_DIAS - 1);
  const realizadas = sessoesConcluidas(dataInicioISO).filter((s) => s.data <= fim).length;
  const msPorDia = 86400000;
  const diasAteFim = Math.round((new Date(fim + "T00:00:00").getTime() - new Date(hojeISO + "T00:00:00").getTime()) / msPorDia);
  const diasRestantes = Math.max(0, Math.min(ADERENCIA_JANELA_DIAS, diasAteFim + 1));
  return { inicio: dataInicioISO, fim, realizadas, diasRestantes, decisao: decidirAderencia(realizadas, diasRestantes) };
}
