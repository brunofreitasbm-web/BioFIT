import { diasTreinadosUnicos, getLog } from "./storage";
import { getSessaoCompleta } from "./programaAtual";
import { toISODate, SESSAO_LABEL, SEMANAS_TRABALHO, type StatusPrograma } from "./program";
import type { SessaoTreino } from "./tipos";

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function calcularStreak(hojeISO: string): number {
  const dias = new Set(diasTreinadosUnicos());
  if (dias.size === 0) return 0;
  let streak = 0;
  let cursor = new Date(hojeISO + "T00:00:00");
  // se hoje ainda não treinou, começa a contagem em ontem
  if (!dias.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  while (dias.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function totalSeriesRegistradas(): number {
  return getLog().length;
}

export interface InsightHoje {
  titulo: string;
  mensagem: string;
}

function labelSemana(status: StatusPrograma): string {
  return status.isDeload ? `deload (semana ${SEMANAS_TRABALHO + 1})` : `semana ${status.semana}/${SEMANAS_TRABALHO}`;
}

export function gerarInsightHoje(status: StatusPrograma, hojeISO: string, sessaoHoje: SessaoTreino | null): InsightHoje {
  const streak = calcularStreak(hojeISO);
  const totalSeries = totalSeriesRegistradas();
  const treinouHoje = diasTreinadosUnicos().includes(hojeISO);

  if (!sessaoHoje) {
    return {
      titulo: "Dia de descanso",
      mensagem:
        streak >= 3
          ? `${streak} dias seguidos de treino — hoje o descanso é parte do plano. Aproveite para dormir bem e chegar inteiro na próxima sessão.`
          : "Dia de folga. Se quiser, use para o cardio Z2 ou só para recuperar.",
    };
  }

  if (streak >= 5) {
    return {
      titulo: `${streak} dias seguidos 🔥`,
      mensagem: `Consistência é o que constrói hipertrofia — você já tem ${totalSeries} séries registradas no total. Hoje é ${SESSAO_LABEL[sessaoHoje]}, ${labelSemana(status)}. Mantém a técnica antes de perseguir carga.`,
    };
  }

  if (streak >= 1) {
    const abertura =
      streak === 1 ? (treinouHoje ? "Já registrou hoje" : "Você treinou ontem") : `Streak de ${streak} dias`;
    return {
      titulo: `Sessão de hoje: ${sessaoHoje}`,
      mensagem: `${abertura} — continue no ritmo. ${status.isDeload ? "Semana de deload" : `Semana ${status.semana} de ${SEMANAS_TRABALHO}`}.`,
    };
  }

  return {
    titulo: `Sessão de hoje: ${sessaoHoje}`,
    mensagem: status.isDeload
      ? "Semana de deload: metade das séries, RIR 4, cargas atuais reduzidas em 10%. Objetivo é recuperar, não é dia de recorde."
      : `Semana ${status.semana} de ${SEMANAS_TRABALHO}. Foco em ativar a técnica antes de subir carga.`,
  };
}

export function gerarInsightAmanha(status: StatusPrograma): InsightHoje {
  const proximoIdx = (status.concluidasNaSemana + 1) % 6;
  const sessaoAmanha: SessaoTreino = ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"][proximoIdx];
  const exercicios = getSessaoCompleta(sessaoAmanha);
  const primeiro = exercicios[0];
  return {
    titulo: `Próximo treino: ${sessaoAmanha}`,
    mensagem: primeiro
      ? `${SESSAO_LABEL[sessaoAmanha]}. Abre com ${primeiro.nome} (${primeiro.series}x${primeiro.reps}). Já pensa na carga de referência para não perder tempo. Lembre-se: você pode trocar a sessão do dia se preferir.`
      : `${SESSAO_LABEL[sessaoAmanha]} a seguir.`,
  };
}
