import { diasTreinadosUnicos } from "./storage";
import { getSessaoCompleta, SESSAO_LABEL } from "./exercicios";
import { addDiasISO, proximaDaFila, RODADAS_TREINO, type StatusPrograma } from "./program";
import type { SessaoTreino } from "./tipos";

export function calcularStreak(hojeISO: string, diasTreinados: string[] = diasTreinadosUnicos()): number {
  const dias = new Set(diasTreinados);
  if (dias.size === 0) return 0;
  let streak = 0;
  let cursor = hojeISO;
  // se hoje ainda não treinou, começa a contagem em ontem
  if (!dias.has(cursor)) cursor = addDiasISO(cursor, -1);
  while (dias.has(cursor)) {
    streak++;
    cursor = addDiasISO(cursor, -1);
  }
  return streak;
}

export interface Insight {
  titulo: string;
  mensagem: string;
}

export function labelRodada(status: StatusPrograma): string {
  return status.isDeload
    ? `Meso ${status.meso} · deload (rodada 5)`
    : `Meso ${status.meso} · rodada ${status.rodada} de ${RODADAS_TREINO}`;
}

export function gerarInsightHoje(status: StatusPrograma, hojeISO: string, sessaoHoje: SessaoTreino | null): Insight {
  if (!sessaoHoje) {
    return {
      titulo: "Dia de descanso",
      mensagem:
        "Sem treino hoje — amanhã é o próximo da fila, não importa o dia da semana. Se quiser, use para o cardio Z2 (30–40 min, longe das sessões B e E).",
    };
  }

  if (status.isDeload) {
    return {
      titulo: `${labelRodada(status)}`,
      mensagem: "Metade das séries, mesmas reps, carga −10%, longe da falha. Serve para dissipar fadiga antes de trocar todos os exercícios.",
    };
  }

  if (status.rodada === 1) {
    return {
      titulo: `${labelRodada(status)} — calibração`,
      mensagem:
        "Nos exercícios marcados \"Teste de falha\", anote antes da última série quantas reps você ACHA que faz, e vá até a falha técnica. Só em máquina/polia.",
    };
  }

  const streak = calcularStreak(hojeISO);
  return {
    titulo: labelRodada(status),
    mensagem: `${streak >= 2 ? `${streak} dias seguidos. ` : ""}Compostos param com 1–2 reps sobrando, isolados com 0–1. Se todas as séries saem com as mesmas reps, você está longe da falha.`,
  };
}

export function gerarInsightProximo(sessaoHoje: SessaoTreino | null, sugerida: SessaoTreino, meso: number): Insight {
  const proxima = sessaoHoje ? proximaDaFila(sessaoHoje) : sugerida;
  const primeiro = getSessaoCompleta(proxima, meso)[0];
  return {
    titulo: `Próximo da fila: ${proxima}`,
    mensagem: primeiro
      ? `${SESSAO_LABEL[proxima]}. Abre com ${primeiro.nome} (${primeiro.series}×${primeiro.reps}). Faltou um dia? Faça este mesmo — nenhum grupo é pulado por agenda.`
      : `${SESSAO_LABEL[proxima]} a seguir.`,
  };
}
