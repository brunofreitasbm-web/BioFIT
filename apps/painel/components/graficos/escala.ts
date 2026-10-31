// Utilitários de escala compartilhados pelos gráficos SVG do painel (sem biblioteca externa).

export const MS_DIA = 86_400_000;
export const diaNum = (iso: string) => Math.floor(Date.parse(`${iso}T12:00:00Z`) / MS_DIA);
export const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function extremos(valores: number[], margemPct = 0.12, minimoSpan = 1): [number, number] {
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max - min < minimoSpan) {
    const c = (max + min) / 2;
    min = c - minimoSpan / 2;
    max = c + minimoSpan / 2;
  }
  const m = (max - min) * margemPct;
  return [min - m, max + m];
}

export const fmt = (n: number, casas = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
