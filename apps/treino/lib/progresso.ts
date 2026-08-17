import { getTodasSessoes } from "./storage";
import { toISODate, DIAS_BLOCO, BLOCOS, DIAS_DELOAD, CICLO_TOTAL_DIAS, type StatusPrograma } from "./program";

const EXPOSICOES_POR_TIPO = 4; // ver Guia: 4 exposições por exercício dentro de um bloco normal de 15 dias
const TIPOS_SESSAO = 3; // PUSH, PULL, LEGS
export const SESSOES_ESPERADAS_BLOCO = EXPOSICOES_POR_TIPO * TIPOS_SESSAO; // 12

// A planilha não define um número de exposições para a semana de deload (7 dias corridos,
// sem esse conceito) — estimo pela mesma cadência semanal do programa (2x/semana por tipo),
// ou seja ~2 exposições por tipo = 6 sessões esperadas nos 7 dias.
export const SESSOES_ESPERADAS_DELOAD = 2 * TIPOS_SESSAO; // 6

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

export interface ProgressoBlocoInfo {
  bloco: number;
  isDeload: boolean;
  concluidas: number;
  esperado: number;
  pct: number; // 0-100
}

export function progressoBloco(status: StatusPrograma): ProgressoBlocoInfo {
  const duracao = status.isDeload ? DIAS_DELOAD : DIAS_BLOCO;
  const esperado = status.isDeload ? SESSOES_ESPERADAS_DELOAD : SESSOES_ESPERADAS_BLOCO;
  const fimExclusivo = addDays(status.blocoStartDate, duracao);
  const concluidas = Math.min(contarSessoesConcluidas(status.blocoStartDate, fimExclusivo), esperado);
  return {
    bloco: status.bloco,
    isDeload: status.isDeload,
    concluidas,
    esperado,
    pct: esperado > 0 ? (concluidas / esperado) * 100 : 0,
  };
}

export interface SegmentoCiclo {
  label: string;
  concluidas: number;
  esperado: number;
  pct: number; // 0-100
  atual: boolean;
}

// Os 5 segmentos do ciclo de 67 dias (4 blocos + deload) a partir do início do ciclo em
// que "hoje" cai — reconstruído a partir de `status.diasDesdeInicio % CICLO_TOTAL_DIAS`,
// sem precisar guardar nenhum dado novo.
export function progressoCiclo(status: StatusPrograma, hoje: Date): SegmentoCiclo[] {
  const cyclePos = status.diasDesdeInicio % CICLO_TOTAL_DIAS;
  const cicloStartDate = addDays(hoje, -cyclePos);

  const segmentos: SegmentoCiclo[] = [];
  for (let i = 0; i < BLOCOS; i++) {
    const inicio = addDays(cicloStartDate, i * DIAS_BLOCO);
    const fimExclusivo = addDays(inicio, DIAS_BLOCO);
    const concluidas = Math.min(contarSessoesConcluidas(inicio, fimExclusivo), SESSOES_ESPERADAS_BLOCO);
    segmentos.push({
      label: `B${i + 1}`,
      concluidas,
      esperado: SESSOES_ESPERADAS_BLOCO,
      pct: (concluidas / SESSOES_ESPERADAS_BLOCO) * 100,
      atual: !status.isDeload && status.bloco === i + 1,
    });
  }

  const inicioDeload = addDays(cicloStartDate, BLOCOS * DIAS_BLOCO);
  const fimDeload = addDays(inicioDeload, DIAS_DELOAD);
  const concluidasDeload = Math.min(contarSessoesConcluidas(inicioDeload, fimDeload), SESSOES_ESPERADAS_DELOAD);
  segmentos.push({
    label: "Deload",
    concluidas: concluidasDeload,
    esperado: SESSOES_ESPERADAS_DELOAD,
    pct: (concluidasDeload / SESSOES_ESPERADAS_DELOAD) * 100,
    atual: status.isDeload,
  });

  return segmentos;
}
