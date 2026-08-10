export const ROLES = ["PERSONAL", "ALUNO"] as const;
export type Role = (typeof ROLES)[number];

export const TIPOS_BLOCO = [
  "AQUECIMENTO",
  "SIMPLES",
  "BI_SET",
  "TRI_SET",
  "CIRCUITO",
] as const;
export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export const OBJETIVOS = [
  "EMAGRECIMENTO",
  "HIPERTROFIA",
  "FORCA",
  "RECUPERACAO_POS_LESAO",
] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  EMAGRECIMENTO: "Emagrecimento",
  HIPERTROFIA: "Hipertrofia",
  FORCA: "Força",
  RECUPERACAO_POS_LESAO: "Recuperação pós-lesão",
};

export const GRUPOS_MUSCULARES = [
  "PEITO",
  "COSTAS",
  "OMBRO",
  "BICEPS",
  "TRICEPS",
  "QUADRICEPS",
  "POSTERIOR_COXA",
  "GLUTEO",
  "PANTURRILHA",
  "ABDOMEN",
  "ANTEBRACO",
  "CARDIO",
] as const;
export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number];
