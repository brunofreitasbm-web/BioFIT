import type { Sessao, SessaoTreino } from "./tipos";
import { contarSessoesConcluidasTotal } from "./storage";

// A progressão da periodização é baseada na execução dos treinos (e não em calendário).
// Cada semana do ciclo de treino exige 6 sessões concluídas (Push/Pull/Legs 2x).
// Ciclo total: 8 semanas de treino (48 sessões) + 1 semana de deload (6 sessões) = 54 sessões no total.
export const SESSOES_POR_SEMANA = 6;
export const SEMANAS_TRABALHO = 8;
export const DIAS_TRABALHO = 56; // Mantido para compatibilidade de tipos/labels
export const DIAS_DELOAD = 7;
export const CICLO_TOTAL_DIAS = 63;
export const SESSOES_TRABALHO = SEMANAS_TRABALHO * SESSOES_POR_SEMANA; // 48 sessões
export const SESSOES_DELOAD = 6;
export const CICLO_TOTAL_SESSOES = SESSOES_TRABALHO + SESSOES_DELOAD; // 54 sessões

export const SEQUENCIA_SESSAO: SessaoTreino[] = ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"];

// Seg/Qui = PUSH, Ter/Sex = PULL, Qua/Sáb = LEGS, Dom = OFF — usado apenas como fallback de calendário.
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

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export interface StatusPrograma {
  diasDesdeInicio: number;
  totalConcluidas: number;
  concluidasNaSemana: number;
  esperadoNaSemana: number;
  isDeload: boolean;
  semana: number; // 1-8 (semana de trabalho ou 8 no deload)
  cicloStartDate: Date;
  proximaSessaoLabel: string;
  proximaSessaoTipo: SessaoTreino | null;
}

export function getStatusPrograma(dataInicioISO: string, hoje: Date = new Date()): StatusPrograma | null {
  const inicio = startOfDay(new Date(dataInicioISO + "T00:00:00"));
  const t = startOfDay(hoje);
  const dias = diffDays(t, inicio);
  if (dias < 0) return null;

  const totalConcluidas = contarSessoesConcluidasTotal(dataInicioISO);
  const posNoCiclo = totalConcluidas % CICLO_TOTAL_SESSOES;
  const isDeload = posNoCiclo >= SESSOES_TRABALHO;
  const semana = isDeload ? SEMANAS_TRABALHO : Math.floor(posNoCiclo / SESSOES_POR_SEMANA) + 1;
  const concluidasNaSemana = isDeload
    ? posNoCiclo - SESSOES_TRABALHO
    : posNoCiclo % SESSOES_POR_SEMANA;

  const proximaSessaoTipo = SEQUENCIA_SESSAO[concluidasNaSemana % SESSOES_POR_SEMANA];
  const proximaSessaoLabel = proximaSessaoTipo;

  return {
    diasDesdeInicio: dias,
    totalConcluidas,
    concluidasNaSemana,
    esperadoNaSemana: SESSOES_POR_SEMANA,
    isDeload,
    semana,
    cicloStartDate: inicio,
    proximaSessaoLabel,
    proximaSessaoTipo,
  };
}

export const SESSAO_LABEL: Record<Sessao, string> = {
  PUSH: "Push (peito, ombro, tríceps)",
  PULL: "Pull (costas, posterior de ombro, bíceps)",
  LEGS: "Legs (pernas, panturrilha)",
  POSTURAL: "Postural",
};
