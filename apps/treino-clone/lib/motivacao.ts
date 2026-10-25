import { getSessaoCompleta, SESSAO_LABEL } from "./exercicios";
import { proximaDaFila, RODADAS_TREINO, type StatusPrograma } from "./program";
import type { SessaoTreino } from "./tipos";

export interface Insight {
  titulo: string;
  mensagem: string;
}

export function labelRodada(status: StatusPrograma): string {
  return status.isDeload
    ? `Meso ${status.meso} · deload (rodada 5)`
    : `Meso ${status.meso} · rodada ${status.rodada} de ${RODADAS_TREINO}`;
}

export function gerarInsightHoje(status: StatusPrograma, sessaoHoje: SessaoTreino | null): Insight {
  if (!sessaoHoje) {
    return {
      titulo: "Dia de descanso",
      mensagem:
        "Sem treino hoje — amanhã é o próximo da fila, não importa o dia da semana. Registre um dia leve (caminhada, mobilidade) para manter sua sequência.",
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

  return {
    titulo: labelRodada(status),
    mensagem: `Compostos param com 1–2 reps sobrando, isolados com 0–1. Se todas as séries saem com as mesmas reps, você está longe da falha.`,
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
