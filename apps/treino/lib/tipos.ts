export type GrupoMuscular =
  | "Peito"
  | "Costas"
  | "Deltoides"
  | "Bíceps"
  | "Tríceps"
  | "Quadríceps"
  | "Posterior"
  | "Panturrilha"
  | "Postura"
  | "Core";

export type SessaoTreino = "PUSH" | "PULL" | "LEGS";
export type Sessao = SessaoTreino | "POSTURAL";
export type EscolhaDoDia = SessaoTreino | "DESCANSO";

// DIRETO = treina musculatura/padrão ligado à hipercifose (retratores escapulares,
// trapézio inferior, extensores torácicos). INDIRETO = ajuda por mecanismo secundário.
// NEUTRO = não serve à postura — a única exigência é não reforçar o padrão errado.
export type PapelPostural = "DIRETO" | "INDIRETO" | "NEUTRO";

// A prescrição (séries, reps, descanso, execução, papel postural) pertence à POSIÇÃO
// (slot) dentro da sessão, não ao exercício em si — vale para qualquer opção do banco
// escolhida naquele slot. Ex.: PUSH slot 1 é sempre 4x6-9, seja supino com barra ou
// supino com halteres.
export interface SlotPrograma {
  sessao: SessaoTreino;
  slot: number; // 1-6
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  descanso: string;
  execucao: string; // coluna "Execução" da planilha (cue de execução, não tempo numérico)
  papelPostural: PapelPostural;
  papelPosturalNota: string;
  notas: string;
}

// Uma opção do banco de exercícios para uma posição (slot). `origem` é só rótulo de
// procedência (de qual antigo "Bloco" da v3 a opção veio) — não representa calendário.
export interface Exercicio {
  id: string;
  origem: number;
  sessao: SessaoTreino;
  slot: number; // 1-6
  nome: string;
  grupoMuscular: GrupoMuscular;
  youtubeId: string | null;
}

// Exercício do banco já mesclado com a prescrição do slot — é o formato que a UI consome.
export interface ExercicioEfetivo extends Exercicio, Omit<SlotPrograma, "sessao" | "slot" | "grupoMuscular"> {}

// Bloco postural: não rotaciona e carrega a própria prescrição (não usa o conceito de slot).
export interface ExercicioPostural {
  id: string;
  ordem: number;
  nome: string;
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  frequencia: string; // "7x/semana" ou "3-4x/semana"
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
  inicioISO: string;
  fimISO: string | null;
}

export interface RegistroBikeIndoor {
  data: string; // YYYY-MM-DD
  tempoMinutos: number;
  concluido: boolean;
  registradoEm: string; // ISO timestamp
}

// Registro de troca de exercício de um slot do Programa Atual — espelha a aba "Log de Trocas".
export interface LogTroca {
  data: string; // YYYY-MM-DD
  sessao: SessaoTreino;
  slot: number;
  exercicioAnteriorId: string;
  exercicioNovoId: string;
  sessoesNoAnterior: number;
  cargaReferenciaKg: number | null;
  motivo: string;
}

// Espelha os campos do "Relatório de Avaliações" (bioimpedância InBody) da clínica.
export interface RegistroBioimpedancia {
  data: string; // YYYY-MM-DD
  pesoKg: number;
  percentualGordura: number;
  massaGorduraKg: number;
  massaLivreGorduraKg: number;
  aguaCorporalL: number;
  imc: number;
  taxaMetabolicaBasalKcal: number;
  indiceApendicular: number; // kg/m²
  idadeMetabolica: number;
  nivelGorduraVisceral: number;
  massaMagraSegmentar: {
    bracoDireitoKg: number;
    bracoEsquerdoKg: number;
    troncoKg: number;
    pernaDireitaKg: number;
    pernaEsquerdaKg: number;
  };
}
