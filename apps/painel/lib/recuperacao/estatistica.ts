export type Num = number | null | undefined;

export const ehNum = (x: Num): x is number => typeof x === "number" && Number.isFinite(x);

export function validos(xs: Num[]): number[] {
  return xs.filter(ehNum);
}

export function media(xs: Num[]): number | null {
  const v = validos(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Desvio-padrão amostral. Precisa de ao menos 2 valores.
export function desvio(xs: Num[]): number | null {
  const v = validos(xs);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

export function mediana(xs: Num[]): number | null {
  const v = validos(xs).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

export const limitar = (x: number, min = 0, max = 100) => Math.min(max, Math.max(min, x));
export const arred = (x: number, casas = 1) => Math.round(x * 10 ** casas) / 10 ** casas;

// z-score de `valor` contra a amostra. null se a amostra for pequena ou sem variação.
export function zscore(valor: Num, amostra: Num[], minimo = 7): number | null {
  if (!ehNum(valor)) return null;
  const v = validos(amostra);
  if (v.length < minimo) return null;
  const dp = desvio(v);
  const m = media(v);
  if (dp === null || m === null || dp === 0) return null;
  return (valor - m) / dp;
}

export interface Correlacao {
  r: number;
  n: number;
  inclinacao: number;
  intercepto: number;
}

// Pearson + reta de mínimos quadrados. null com menos de 5 pares ou sem variação em x ou y.
export function correlacao(pares: { x: number; y: number }[]): Correlacao | null {
  const n = pares.length;
  if (n < 5) return null;
  const mx = pares.reduce((a, p) => a + p.x, 0) / n;
  const my = pares.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pares) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0 || syy === 0) return null;
  const inclinacao = sxy / sxx;
  return { r: sxy / Math.sqrt(sxx * syy), n, inclinacao, intercepto: my - inclinacao * mx };
}

// Confiança qualitativa: depende do número de pares e da força da correlação.
export function confiancaDe(n: number, r: number | null): "baixa" | "media" | "alta" {
  const forca = r === null ? 0 : Math.abs(r);
  if (n >= 40 && forca >= 0.3) return "alta";
  if (n >= 20 && forca >= 0.25) return "media";
  return "baixa";
}

// ===== Datas (strings YYYY-MM-DD, sempre em UTC para não sofrer com fuso/horário de verão) =====

const MS_DIA = 86_400_000;

export function somarDiasIso(iso: string, dias: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10);
}

export function diasEntreIso(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_DIA);
}

// Dia da semana 0 (domingo) a 6.
export function diaDaSemana(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

// Lista contínua de datas de `inicio` a `fim`, inclusive.
export function intervaloIso(inicio: string, fim: string): string[] {
  const out: string[] = [];
  for (let d = inicio; d <= fim; d = somarDiasIso(d, 1)) out.push(d);
  return out;
}
