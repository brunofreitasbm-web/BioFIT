import type { GrupoMuscular } from "./tipos";

// Liga os 11 grupos musculares da planilha às regiões do desenho (lib/body-paths.ts).
// Postura = face pull, Y-raise, crucifixo inverso e extensão torácica → trapézio (médio/
// inferior) é o alvo comum. Core = abdominal na polia/máquina e pranchas → abdome e oblíquos.
export const REGIOES_DO_GRUPO: Record<GrupoMuscular, string[]> = {
  Peito: ["chest"],
  Costas: ["upper-back"],
  Deltoides: ["deltoids"],
  "Bíceps": ["biceps"],
  "Tríceps": ["triceps"],
  "Quadríceps": ["quadriceps"],
  Posterior: ["hamstring"],
  "Glúteo": ["gluteal"],
  Panturrilha: ["calves"],
  Postura: ["trapezius"],
  Core: ["abs", "obliques"],
};

// Partes que não são músculo: viram só silhueta, nunca recebem cor.
export const PARTES_INERTES = ["head", "hair", "neck", "hands", "feet", "knees", "ankles"];

const GRUPO_DA_REGIAO = new Map<string, GrupoMuscular>(
  (Object.entries(REGIOES_DO_GRUPO) as [GrupoMuscular, string[]][]).flatMap(([g, rs]) => rs.map((r) => [r, g] as const)),
);

export function grupoDaRegiao(regiao: string): GrupoMuscular | null {
  return GRUPO_DA_REGIAO.get(regiao) ?? null;
}

// Intensidade 0–1 de cada grupo, relativa ao grupo mais trabalhado do período (o mapa lê
// como equilíbrio entre grupos, não como volume absoluto).
export function intensidadePorGrupo(series: Partial<Record<GrupoMuscular, number>>): Map<GrupoMuscular, number> {
  const max = Math.max(0, ...Object.values(series).map((n) => n ?? 0));
  const out = new Map<GrupoMuscular, number>();
  for (const [g, n] of Object.entries(series) as [GrupoMuscular, number][]) {
    out.set(g, max > 0 ? n / max : 0);
  }
  return out;
}
