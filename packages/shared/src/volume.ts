import type { ExecucaoSerie } from "./schemas";

export function volumeSerie(exec: Pick<ExecucaoSerie, "cargaKg" | "repeticoes">): number {
  return exec.cargaKg * exec.repeticoes;
}

export function volumeTotal(execucoes: Pick<ExecucaoSerie, "cargaKg" | "repeticoes">[]): number {
  return execucoes.reduce((total, exec) => total + volumeSerie(exec), 0);
}
