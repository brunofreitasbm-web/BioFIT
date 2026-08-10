export type GrupoMuscular =
  | "Peito"
  | "Costas"
  | "Deltoides"
  | "Bíceps"
  | "Tríceps"
  | "Quadríceps"
  | "Posterior"
  | "Panturrilha"
  | "Postura";

export type SessaoTreino = "PUSH" | "PULL" | "LEGS";
export type Sessao = SessaoTreino | "POSTURAL";
export type EscolhaDoDia = SessaoTreino | "DESCANSO";

export interface Exercicio {
  id: string;
  bloco: number; // 1-4, 0 = postural (fixo, não rotaciona)
  sessao: Sessao;
  ordem: number;
  nome: string;
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  descanso: string;
  cadencia?: string;
  notas: string;
  youtubeId: string | null;
}

export interface SerieRegistrada {
  exercicioId: string;
  data: string; // YYYY-MM-DD
  serieNumero: number;
  cargaKg: number | null;
  reps: number | null;
  observacoes?: string;
  registradoEm: string; // ISO timestamp
}

export interface RegistroSessao {
  data: string; // YYYY-MM-DD
  sessaoTipo: SessaoTreino;
  bloco: number;
  inicioISO: string;
  fimISO: string | null;
}
