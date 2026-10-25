import { estimar1RM } from "./rm";

// Quanto esforço pedir em cada série. Na retomada (primeiros treinos depois de uma pausa) o
// objetivo é só aprender o movimento com carga leve; depois, hipertrofia com margem de segurança.
export function textoDeEsforco(composto: boolean, retomada: boolean): string {
  if (retomada) return "Carga leve: termine cada série sobrando 3-4 repetições";
  return composto ? "Pare quando sobrarem 1-2 repetições" : "Pare quando sobrarem 0-1 repetições";
}

// e1RM (Epley): compara exposições com reps diferentes.
export function e1rm(cargaKg: number, reps: number): number {
  return Math.round(estimar1RM(cargaKg, reps) * 10) / 10;
}

// Converte o texto de descanso ("2 min", "90 s", "60-90 s") em segundos, usando o maior valor
// da faixa (o timer de descanso deve dar o tempo cheio, não o mínimo).
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
