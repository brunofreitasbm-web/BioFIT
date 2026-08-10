import { diasTreinadosUnicos, getLog } from "./storage";
import { exerciciosDoBloco } from "./exercicios";
import { toISODate, SESSAO_LABEL, type StatusPrograma } from "./program";
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

export function gerarInsightHoje(
  status: StatusPrograma,
  hojeISO: string,
  sessaoHoje: SessaoTreino | null,
  exposicaoAtual: number,
): InsightHoje {
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
      mensagem: `Consistência é o que constrói hipertrofia — você já tem ${totalSeries} séries registradas no total. Hoje é ${SESSAO_LABEL[sessaoHoje]}, bloco ${status.isDeload ? "deload" : status.bloco}. Mantém a técnica antes de perseguir carga.`,
    };
  }

  if (streak >= 1) {
    const abertura =
      streak === 1 ? (treinouHoje ? "Já registrou hoje" : "Você treinou ontem") : `Streak de ${streak} dias`;
    return {
      titulo: `Sessão de hoje: ${sessaoHoje}`,
      mensagem: `${abertura} — continue no ritmo. Bloco ${status.isDeload ? "deload (semana 9)" : status.bloco}${status.isDeload ? "" : `, exposição ${exposicaoAtual}/4`}.`,
    };
  }

  return {
    titulo: `Sessão de hoje: ${sessaoHoje}`,
    mensagem: status.isDeload
      ? "Semana de deload: metade das séries, esforço leve, cargas do Bloco 4 reduzidas em 10%. Objetivo é recuperar, não é dia de recorde."
      : `Bloco ${status.bloco}, exposição ${exposicaoAtual}/4. Primeira sessão do dia — foco em ativar a técnica antes de subir carga.`,
  };
}

export function gerarInsightAmanha(status: StatusPrograma): InsightHoje {
  if (!status.proximaSessaoTipo) {
    return { titulo: "Amanhã: descanso", mensagem: "Sem treino de força amanhã — bom dia para o cardio Z2, se estiver na programação." };
  }
  const bloco = status.isDeload ? 4 : status.bloco;
  const exercicios = exerciciosDoBloco(bloco, status.proximaSessaoTipo);
  const primeiro = exercicios[0];
  return {
    titulo: `Amanhã: ${status.proximaSessaoTipo}`,
    mensagem: primeiro
      ? `${SESSAO_LABEL[status.proximaSessaoTipo]}. Abre com ${primeiro.nome} (${primeiro.series}x${primeiro.reps}). Já pensa na carga hoje à noite para não perder tempo amanhã. Lembre-se: você pode trocar a sessão do dia se preferir treinar outro grupo.`
      : `${SESSAO_LABEL[status.proximaSessaoTipo]} amanhã.`,
  };
}
