import type { GrupoMuscular, SessaoTreino } from "./tipos";
import { getExercicio, SLOTS } from "./exercicios";
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

// Os grupos musculares de cada slot são fixos (pertencem à prescrição do slot, não ao
// exercício escolhido nele), então dá pra ler direto de SLOTS.
export function gruposDaSessao(tipo: SessaoTreino): GrupoMuscular[] {
  return Array.from(new Set(SLOTS.filter((s) => s.sessao === tipo).map((s) => s.grupoMuscular)));
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

// Progressão de RIR: acompanha o número de sessões já registradas NAQUELE exercício
// específico (não a sessão de treino em geral). Como trocar um exercício do banco troca
// também o id usado no histórico, a progressão de um exercício recém-trocado reinicia
// sozinha — sem precisar de nenhum reset manual.
//   sessões 1-2 = RIR 2-3 (aprendizado motor) · sessões 3-6 = RIR 2 · sessão 7+ = RIR 1
//   (isoladores podem ir à falha; compostos param em RIR 1)
export interface EstagioRIR {
  sessoesFeitas: number;
  rirAlvo: string;
  label: string;
}

export function calcularEstagioRIR(sessoesFeitas: number): EstagioRIR {
  if (sessoesFeitas < 2) return { sessoesFeitas, rirAlvo: "2-3", label: "Aprendizado motor" };
  if (sessoesFeitas < 6) return { sessoesFeitas, rirAlvo: "2", label: "Progressão" };
  return { sessoesFeitas, rirAlvo: "1", label: "Carga plena" };
}

// Converte o texto de descanso da planilha ("2-3 min", "90 s", "60-90 s", "-") em segundos,
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
