import { getTodasSessoes } from "./storage";
import { toISODate, DIAS_TRABALHO, DIAS_DELOAD, CICLO_TOTAL_DIAS, SEMANAS_TRABALHO, type StatusPrograma } from "./program";

const TIPOS_SESSAO = 3; // PUSH, PULL, LEGS
export const SESSOES_ESPERADAS_SEMANA = 2 * TIPOS_SESSAO; // 6 (Seg-Sáb, 2x por tipo)

function addDays(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

// Conta sessões de treino CONCLUÍDAS (fimISO preenchido) cuja data cai em [inicio, fimExclusivo).
function contarSessoesConcluidas(inicio: Date, fimExclusivo: Date): number {
  const inicioISO = toISODate(inicio);
  const fimISO = toISODate(fimExclusivo);
  let total = 0;
  for (const lista of Object.values(getTodasSessoes())) {
    for (const sessao of lista) {
      if (sessao.fimISO && sessao.data >= inicioISO && sessao.data < fimISO) total++;
    }
  }
  return total;
}

export interface ProgressoSemanaInfo {
  semana: number;
  isDeload: boolean;
  concluidas: number;
  esperado: number;
  pct: number; // 0-100
}

// Progresso da semana corrente (ou da semana de deload) dentro do ciclo de 8 semanas + deload.
export function progressoSemana(status: StatusPrograma): ProgressoSemanaInfo {
  const duracao = status.isDeload ? DIAS_DELOAD : 7;
  const offsetSemana = status.isDeload ? DIAS_TRABALHO : (status.semana - 1) * 7;
  const inicioSemana = addDays(status.cicloStartDate, offsetSemana);
  const fimExclusivo = addDays(inicioSemana, duracao);
  const concluidas = Math.min(contarSessoesConcluidas(inicioSemana, fimExclusivo), SESSOES_ESPERADAS_SEMANA);
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

// Os 9 segmentos do ciclo de 63 dias (8 semanas de trabalho + 1 de deload) a partir do
// início do ciclo em que "hoje" cai.
export function progressoCiclo(status: StatusPrograma): SegmentoCiclo[] {
  const segmentos: SegmentoCiclo[] = [];
  for (let i = 0; i < SEMANAS_TRABALHO; i++) {
    const inicio = addDays(status.cicloStartDate, i * 7);
    const fimExclusivo = addDays(inicio, 7);
    const concluidas = Math.min(contarSessoesConcluidas(inicio, fimExclusivo), SESSOES_ESPERADAS_SEMANA);
    segmentos.push({
      label: `S${i + 1}`,
      concluidas,
      esperado: SESSOES_ESPERADAS_SEMANA,
      pct: (concluidas / SESSOES_ESPERADAS_SEMANA) * 100,
      atual: !status.isDeload && status.semana === i + 1,
    });
  }

  const inicioDeload = addDays(status.cicloStartDate, DIAS_TRABALHO);
  const fimDeload = addDays(inicioDeload, DIAS_DELOAD);
  const concluidasDeload = Math.min(contarSessoesConcluidas(inicioDeload, fimDeload), SESSOES_ESPERADAS_SEMANA);
  segmentos.push({
    label: "Deload",
    concluidas: concluidasDeload,
    esperado: SESSOES_ESPERADAS_SEMANA,
    pct: (concluidasDeload / SESSOES_ESPERADAS_SEMANA) * 100,
    atual: status.isDeload,
  });

  return segmentos;
}

export { CICLO_TOTAL_DIAS };
