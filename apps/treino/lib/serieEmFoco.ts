import type { SerieRegistrada } from "./tipos";

const registrada = (s: SerieRegistrada) => s.cargaKg !== null || s.reps !== null;

// Primeira série do exercício ainda sem registro hoje (1..total); null quando todas estão feitas.
export function proximaSerie(series: SerieRegistrada[], total: number): number | null {
  for (let n = 1; n <= total; n++) {
    const s = series.find((x) => x.serieNumero === n);
    if (!s || !registrada(s)) return n;
  }
  return null;
}

export interface SugestaoFoco {
  cargaKg: number;
  repsPreencher: number;
}

// Carga e reps com que a tela abre para a série `n`: repete a série anterior de hoje; na 1ª
// série usa a sugestão de progressão e, sem ela, a carga inicial e as reps da última vez.
export function valoresIniciais(
  n: number,
  series: SerieRegistrada[],
  ultima: SerieRegistrada[],
  sugestao: SugestaoFoco | null,
  cargaInicial: number | null,
): { kg: string; reps: string } {
  const anterior = series.find((s) => s.serieNumero === n - 1 && registrada(s));
  const daUltima = ultima.find((s) => s.serieNumero === n);
  const kg = anterior?.cargaKg ?? sugestao?.cargaKg ?? cargaInicial ?? null;
  const reps = anterior?.reps ?? sugestao?.repsPreencher ?? daUltima?.reps ?? null;
  return { kg: kg === null ? "" : String(kg), reps: reps === null ? "" : String(reps) };
}

// Soma `passo` ao texto de um campo numérico, sem passar de `min` (vazio conta como 0).
export function ajustar(valor: string, passo: number, min = 0): string {
  const atual = Number(valor.replace(",", "."));
  const base = valor.trim() === "" || Number.isNaN(atual) ? 0 : atual;
  const novo = Math.max(min, Math.round((base + passo) * 100) / 100);
  return String(novo);
}
