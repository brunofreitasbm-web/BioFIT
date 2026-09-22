import {
  CICLO_TOTAL_DIAS,
  CICLO_TOTAL_SESSOES,
  SEMANAS_TRABALHO,
  SESSOES_DELOAD,
  SESSOES_POR_SEMANA,
  SESSOES_TRABALHO,
  type StatusPrograma,
} from "./program";

export const SESSOES_ESPERADAS_SEMANA = SESSOES_POR_SEMANA; // 6 (Push/Pull/Legs 2x)

export interface ProgressoSemanaInfo {
  semana: number;
  isDeload: boolean;
  concluidas: number;
  esperado: number;
  pct: number; // 0-100
}

// Progresso da semana corrente (ou da semana de deload) dentro do ciclo de 8 semanas + deload.
export function progressoSemana(status: StatusPrograma): ProgressoSemanaInfo {
  const concluidas = Math.min(status.concluidasNaSemana, SESSOES_ESPERADAS_SEMANA);
  return {
    semana: status.semana,
    isDeload: status.isDeload,
    concluidas,
    esperado: SESSOES_ESPERADAS_SEMANA,
    pct: (concluidas / SESSOES_ESPERADAS_SEMANA) * 100,
  };
}

export interface SegmentoCiclo {
  label: string;
  concluidas: number;
  esperado: number;
  pct: number; // 0-100
  atual: boolean;
}

// Os 9 segmentos do ciclo (8 semanas de trabalho + 1 de deload) baseados nas sessões concluídas.
export function progressoCiclo(status: StatusPrograma): SegmentoCiclo[] {
  const posNoCiclo = status.totalConcluidas % CICLO_TOTAL_SESSOES;
  const segmentos: SegmentoCiclo[] = [];

  for (let i = 0; i < SEMANAS_TRABALHO; i++) {
    const minSessoes = i * SESSOES_POR_SEMANA;
    const maxSessoes = (i + 1) * SESSOES_POR_SEMANA;
    let concluidas = 0;
    if (posNoCiclo >= maxSessoes) {
      concluidas = SESSOES_POR_SEMANA;
    } else if (posNoCiclo > minSessoes) {
      concluidas = posNoCiclo - minSessoes;
    }
    const atual = !status.isDeload && status.semana === i + 1;
    segmentos.push({
      label: `S${i + 1}`,
      concluidas,
      esperado: SESSOES_POR_SEMANA,
      pct: (concluidas / SESSOES_POR_SEMANA) * 100,
      atual,
    });
  }

  let concluidasDeload = 0;
  if (posNoCiclo >= CICLO_TOTAL_SESSOES) {
    concluidasDeload = SESSOES_DELOAD;
  } else if (posNoCiclo > SESSOES_TRABALHO) {
    concluidasDeload = posNoCiclo - SESSOES_TRABALHO;
  }
  segmentos.push({
    label: "Deload",
    concluidas: concluidasDeload,
    esperado: SESSOES_DELOAD,
    pct: (concluidasDeload / SESSOES_DELOAD) * 100,
    atual: status.isDeload,
  });

  return segmentos;
}

export { CICLO_TOTAL_DIAS };

