// 1RM estimado (Epley). Com 1 rep é a própria carga. Fonte única: o app, o relatório e o
// servidor MCP usavam três cópias que divergiam em reps = 1.
export function estimar1RM(cargaKg: number, reps: number): number {
  return reps <= 1 ? cargaKg : cargaKg * (1 + reps / 30);
}
