import type { GrupoMuscular, SessaoTreino } from "./tipos";
import { exerciciosDoBloco, getExercicio } from "./exercicios";
import { getLog } from "./storage";

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

// Os grupos musculares de cada posição (ex.: PUSH #1) são os mesmos em todos os blocos,
// então usar o Bloco 1 como referência é suficiente para saber quais grupos uma sessão trabalha.
export function gruposDaSessao(tipo: SessaoTreino): GrupoMuscular[] {
  return Array.from(new Set(exerciciosDoBloco(1, tipo).map((e) => e.grupoMuscular)));
}

export function statusDescansoPorSessao(tipo: SessaoTreino, hojeISO: string): StatusGrupo[] {
  const grupos = gruposDaSessao(tipo);
  const log = getLog().filter((s) => (s.cargaKg !== null || s.reps !== null) && s.data < hojeISO);

  return grupos.map((grupo) => {
    let ultimaData: string | null = null;
    for (const s of log) {
      const exercicio = getExercicio(s.exercicioId);
      if (exercicio?.grupoMuscular === grupo && (!ultimaData || s.data > ultimaData)) {
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

export function calcularExposicao(tipo: SessaoTreino, blocoStartISO: string, hojeISO: string, diasTreinadosPorTipo: string[]): number {
  const passados = diasTreinadosPorTipo.filter((d) => d >= blocoStartISO && d < hojeISO).length;
  return Math.min(passados + 1, 4);
}
