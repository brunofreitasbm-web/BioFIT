import type { Sessao, SessaoTreino } from "./tipos";

// v4: não existe mais "bloco" como unidade de calendário — os exercícios não rotacionam
// automaticamente (banco de opções trocado manualmente, ver lib/programaAtual.ts). O único
// ciclo de calendário que resta é o deload: a cada 8 semanas corridas (56 dias) de trabalho,
// 1 semana (7 dias) de deload, repetindo indefinidamente a partir do início do programa.
export const DIAS_TRABALHO = 56; // 8 semanas
export const DIAS_DELOAD = 7;
export const CICLO_TOTAL_DIAS = DIAS_TRABALHO + DIAS_DELOAD; // 63 dias
export const SEMANAS_TRABALHO = DIAS_TRABALHO / 7; // 8

// Seg/Qui = PUSH, Ter/Sex = PULL, Qua/Sáb = LEGS, Dom = OFF — usado só como sugestão padrão do dia.
const SESSAO_POR_DIA_SEMANA: Record<number, SessaoTreino | null> = {
  0: null, // domingo
  1: "PUSH",
  2: "PULL",
  3: "LEGS",
  4: "PUSH",
  5: "PULL",
  6: "LEGS",
};

export function sessaoDoDia(data: Date): SessaoTreino | null {
  return SESSAO_POR_DIA_SEMANA[data.getDay()];
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export interface StatusPrograma {
  diasDesdeInicio: number;
  isDeload: boolean;
  semana: number; // 1-8 (não usado durante o deload)
  cicloStartDate: Date; // início do ciclo de 63 dias em que "hoje" cai
  proximaSessaoLabel: string; // amanhã (sugestão de calendário)
  proximaSessaoTipo: SessaoTreino | null;
}

export function getStatusPrograma(dataInicioISO: string, hoje: Date = new Date()): StatusPrograma | null {
  const inicio = startOfDay(new Date(dataInicioISO + "T00:00:00"));
  const t = startOfDay(hoje);
  const dias = diffDays(t, inicio);
  if (dias < 0) return null;

  const cyclePos = dias % CICLO_TOTAL_DIAS;
  const isDeload = cyclePos >= DIAS_TRABALHO;
  const semana = isDeload ? SEMANAS_TRABALHO : Math.floor(cyclePos / 7) + 1;
  const cicloStartDate = addDays(inicio, dias - cyclePos);

  const amanha = addDays(t, 1);
  const sessaoAmanha = sessaoDoDia(amanha);

  return {
    diasDesdeInicio: dias,
    isDeload,
    semana,
    cicloStartDate,
    proximaSessaoLabel: sessaoAmanha ?? "Descanso",
    proximaSessaoTipo: sessaoAmanha,
  };
}

export const SESSAO_LABEL: Record<Sessao, string> = {
  PUSH: "Push (peito, ombro, tríceps)",
  PULL: "Pull (costas, posterior de ombro, bíceps)",
  LEGS: "Legs (pernas, panturrilha)",
  POSTURAL: "Postural",
};
