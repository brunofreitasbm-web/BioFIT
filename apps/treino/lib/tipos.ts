import type { SessaoLegada } from "./arquivo/pplV4";

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

// Sequência fixa A → B → C → D → E → A. Não existe "treino de quarta": faltou um dia, faz o
// próximo da fila.
export type SessaoTreino = "A" | "B" | "C" | "D" | "E";
export type EscolhaDoDia = SessaoTreino | "DESCANSO";

// Uma variação de exercício para uma posição da sessão. Cada posição tem uma variação para o
// Mesociclo 1 e outra para o Mesociclo 2 (coluna "Meso 2 (troca)" da planilha).
// O `id` é do EXERCÍCIO, não da posição: o mesmo exercício em sessões/mesos diferentes
// (ex.: Hack squat em B no meso 1 e em E no meso 2) compartilha o histórico de carga.
export interface VariacaoExercicio {
  id: string;
  nome: string;
  partida: string; // "45", "42,5", "calibrar", "peso corporal"
  notas: string;
  youtubeId: string | null;
}

// Prescrição de uma posição dentro da sessão — vale para as duas variações (meso 1 e 2).
export interface SlotPrograma {
  sessao: SessaoTreino;
  ordem: number;
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  descanso: string;
  testeFalha: boolean; // "Teste falha (rod.1)" = SIM
  composto: boolean; // exercícios 1–2 de cada sessão: alvo de esforço RIR 1–2 (isolados: 0–1)
  pesoCorporal: boolean; // carga opcional no registro
  bisetCom?: number; // ordem do par no biset (A6 rosca + tríceps)
  meso1: VariacaoExercicio;
  meso2: VariacaoExercicio;
}

// Slot já resolvido para o mesociclo corrente — é o formato que a UI consome.
export interface ExercicioEfetivo extends Omit<SlotPrograma, "meso1" | "meso2">, VariacaoExercicio {}

export interface SerieRegistrada {
  exercicioId: string;
  data: string; // YYYY-MM-DD
  serieNumero: number;
  cargaKg: number | null;
  reps: number | null;
  rir?: number | null; // só na última série
  sessao?: SessaoTreino; // a partir do meso 1; registros do PPL não têm
  rodada?: number; // 1–5 (5 = deload); só séries registradas depois do envio para a planilha
  observacoes?: string;
  registradoEm: string; // ISO timestamp
}

export interface RegistroSessao {
  data: string; // YYYY-MM-DD
  sessaoTipo: SessaoTreino | SessaoLegada;
  inicioISO: string;
  fimISO: string | null;
}

export interface RegistroBikeIndoor {
  data: string; // YYYY-MM-DD
  tempoMinutos: number;
  concluido: boolean;
  registradoEm: string; // ISO timestamp
}

// Aba "Calibração RIR": na rodada 1, antes da última série de um exercício "Teste falha",
// anota-se o palpite de reps até a falha. O real vem da própria série registrada.
export interface PalpiteCalibracao {
  data: string; // YYYY-MM-DD
  exercicioId: string;
  palpite: number;
}
