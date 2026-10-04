import type { ExercicioEfetivo, GrupoMuscular, SessaoTreino } from "./tipos";
import { getExercicio, gruposDaSessao } from "./exercicios";
import { getLog } from "./storage";
import type { StatusPrograma } from "./program";

// Recomendação geral de hipertrofia: pelo menos 48h entre sessões que treinam o mesmo grupo muscular.
export const MIN_DIAS_DESCANSO = 2;

export interface StatusGrupo {
  grupo: GrupoMuscular;
  ultimaData: string | null;
  diasDesdeUltimo: number | null;
  emRecuperacao: boolean;
}

function diasEntre(dataAnteriorISO: string, dataAtualISO: string): number {
  const a = new Date(dataAnteriorISO + "T00:00:00").getTime();
  const b = new Date(dataAtualISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function statusDescansoPorSessao(tipo: SessaoTreino, hojeISO: string): StatusGrupo[] {
  const grupos = gruposDaSessao(tipo);
  const log = getLog().filter((s) => (s.cargaKg !== null || s.reps !== null) && s.data < hojeISO);

  return grupos.map((grupo) => {
    let ultimaData: string | null = null;
    for (const s of log) {
      if (getExercicio(s.exercicioId)?.grupoMuscular === grupo && (!ultimaData || s.data > ultimaData)) {
        ultimaData = s.data;
      }
    }
    const diasDesdeUltimo = ultimaData ? diasEntre(ultimaData, hojeISO) : null;
    return {
      grupo,
      ultimaData,
      diasDesdeUltimo,
      emRecuperacao: diasDesdeUltimo !== null && diasDesdeUltimo < MIN_DIAS_DESCANSO,
    };
  });
}

// Alvo de esforço por rodada (aba "Guia"):
//   rodada 1 + "Teste falha" = última série até a falha técnica (calibração do RIR)
//   rodadas 1–4 = compostos (exercícios 1–2) param com 1–2 reps sobrando; isolados com 0–1
//   rodada 5 (deload) = longe da falha
export interface AlvoEsforco {
  rirAlvo: string;
  label: string;
  testeFalha: boolean;
}

export function alvoDeEsforco(exercicio: ExercicioEfetivo, status: StatusPrograma): AlvoEsforco {
  if (status.isDeload) return { rirAlvo: "3-4", label: "Deload: carga −10%, longe da falha", testeFalha: false };
  if (status.rodada === 1 && exercicio.testeFalha) {
    return { rirAlvo: "0 na última", label: "Calibração: última série até a falha técnica", testeFalha: true };
  }
  return exercicio.composto
    ? { rirAlvo: "1-2", label: "Composto", testeFalha: false }
    : { rirAlvo: "0-1", label: "Isolado", testeFalha: false };
}

// e1RM (Epley), como na aba "Registro": compara exposições com reps diferentes.
export function e1rm(cargaKg: number, reps: number): number {
  return Math.round(cargaKg * (1 + reps / 30) * 10) / 10;
}

// Converte o texto de descanso da planilha ("2-3 min", "90 s", "60-90 s") em segundos,
// usando o maior valor da faixa (o timer de descanso deve dar o tempo cheio, não o mínimo).
export function parseDescansoSegundos(descanso: string): number | null {
  const matches = [...descanso.matchAll(/(\d+)\s*(min|s)/g)];
  if (matches.length === 0) return null;
  let maiorSegundos = 0;
  for (const [, numeroStr, unidade] of matches) {
    const segundos = unidade === "min" ? Number(numeroStr) * 60 : Number(numeroStr);
    if (segundos > maiorSegundos) maiorSegundos = segundos;
  }
  return maiorSegundos || null;
}
