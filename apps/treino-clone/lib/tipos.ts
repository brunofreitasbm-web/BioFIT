export type GrupoMuscular =
  | "Peito"
  | "Costas"
  | "Deltoides"
  | "Bíceps"
  | "Tríceps"
  | "Quadríceps"
  | "Posterior"
  | "Glúteo"
  | "Panturrilha"
  | "Postura"
  | "Core";

// Sequência fixa A → B → C → D → A. Não existe "treino de quarta": faltou um dia, faz o
// próximo da fila.
export type SessaoTreino = "A" | "B" | "C" | "D";

// Um exercício que pode ocupar uma posição da sessão. O `id` é do EXERCÍCIO, não da posição:
// o mesmo exercício em posições diferentes compartilha o histórico de carga.
export interface VariacaoExercicio {
  id: string;
  nome: string;
  notas: string;
  // Só quando difere do padrão da posição (ex.: prancha em segundos no lugar de repetições).
  reps?: string;
  // Grupos trabalhados indiretamente, com peso (0,5 = meia série por série feita). Entram no
  // volume por grupo do relatório, não na frequência.
  secundarios?: Partial<Record<GrupoMuscular, number>>;
  // Pasta das fotos início/fim em `public/exercicios/`. null = sem foto.
  imagem?: string | null;
}

// Prescrição de uma posição dentro da sessão. `opcoes[0]` é o exercício padrão; as demais são
// trocas com a MESMA biomecânica e o mesmo grupo muscular (máquina ocupada, dor, preferência).
export interface SlotPrograma {
  sessao: SessaoTreino;
  ordem: number;
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  descanso: string;
  composto: boolean; // exercícios principais da sessão: alvo de esforço um pouco menor
  pesoCorporal: boolean; // carga opcional no registro
  opcoes: VariacaoExercicio[];
}

// Slot já resolvido (com a escolha de troca aplicada) — é o formato que a UI consome.
export interface ExercicioEfetivo extends Omit<SlotPrograma, "opcoes" | "reps">, Omit<VariacaoExercicio, "reps"> {
  reps: string;
  slotKey: string; // "A1"
  opcoes: VariacaoExercicio[];
  trocado: boolean; // true quando não é o exercício padrão
}

export interface SerieRegistrada {
  exercicioId: string;
  data: string; // YYYY-MM-DD
  serieNumero: number;
  cargaKg: number | null;
  reps: number | null;
  rir?: number | null;
  sessao?: SessaoTreino;
  observacoes?: string;
  registradoEm: string; // ISO timestamp
}

export interface RegistroSessao {
  data: string; // YYYY-MM-DD
  sessaoTipo: SessaoTreino;
  inicioISO: string;
  fimISO: string | null;
  atualizadoEm?: string; // ISO — última mudança (iniciar/terminar/reabrir)
}
