import type { ExercicioEfetivo, GrupoMuscular, SessaoTreino, SlotPrograma, VariacaoExercicio } from "./tipos";
import { EXERCICIOS_PPL_V4 } from "./arquivo/pplV4";

// Fonte: "Treinos/programa_ULPPL_meso1.xlsx" (aba "Sessões").
//
// Programa sequencial A Upper → B Lower → C Push → D Pull → E Legs. Cada posição tem a
// variação do Mesociclo 1 e a da coluna "Meso 2 (troca)"; a prescrição (séries, reps,
// descanso, teste de falha) é da posição e vale para as duas.
//
// O biset A6 da planilha ("Rosca na polia baixa + Tríceps corda", 2 séries, partida 12 / 15)
// virou duas posições (6 e 7) ligadas por `bisetCom`, para cada exercício ter o próprio
// histórico de carga.
//
// O PPL anterior está arquivado em `lib/arquivo/pplV4.ts`.

function v(id: string, nome: string, partida: string, notas: string, youtubeId: string | null): VariacaoExercicio {
  return { id, nome, partida, notas, youtubeId };
}

const EXTENSAO_TORACICA = v(
  "extensao-toracica-prono",
  "Extensão torácica em prono (POSTURAL)",
  "peso corporal",
  "Levantar o esterno, não a lombar; pausa 2 s no topo",
  "WJkydq1RVvk",
);

export const SLOTS: SlotPrograma[] = [
  // ===== A — UPPER =====
  { sessao: "A", ordem: 1, grupoMuscular: "Peito", series: 3, reps: "6-9", descanso: "2-3 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("supino-inclinado-maquina", "Supino inclinado na máquina", "45", "Último registro 45×9 (3 exp. sem progredir)", "7_scLkTCwTU"),
    meso2: v("supino-reto-halteres", "Supino reto com halteres", "calibrar", "", "Cjh2fIMQHk0") },
  { sessao: "A", ordem: 2, grupoMuscular: "Costas", series: 3, reps: "6-10", descanso: "2-3 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("puxada-frente-pronada", "Puxada frente pronada", "65", "Começar pela depressão escapular", "mPmfwbc_svw"),
    meso2: v("puxada-neutra-fechada", "Puxada neutra fechada", "calibrar", "", "vUu_4jBxM1c") },
  { sessao: "A", ordem: 3, grupoMuscular: "Costas", series: 3, reps: "8-12", descanso: "2 min", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("remada-apoio-peito-maquina", "Remada com apoio de peito (máquina)", "calibrar", "Sem histórico", "f8AVh4VBbos"),
    meso2: v("remada-cavalinho-apoio-peito", "Remada cavalinho com apoio de peito", "calibrar", "", "c7GF_mIDPyw") },
  { sessao: "A", ordem: 4, grupoMuscular: "Deltoides", series: 2, reps: "8-12", descanso: "2 min", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("desenvolvimento-maquina", "Desenvolvimento na máquina", "calibrar", "Histórico 12→30 kg incoerente", "cAwjHUklmig"),
    meso2: v("desenvolvimento-arnold", "Desenvolvimento Arnold", "calibrar", "", "IIdj90AJArU") },
  { sessao: "A", ordem: 5, grupoMuscular: "Postura", series: 3, reps: "12-20", descanso: "60-90 s", testeFalha: false, composto: false, pesoCorporal: false,
    meso1: v("face-pull-polia", "Face pull na polia (POSTURAL)", "12", "Ombro não sobe; segurar 1 s", "kYMTJAx_dTM"),
    meso2: v("crucifixo-inverso-maquina", "Crucifixo inverso na máquina (POSTURAL)", "calibrar", "", "EWwR2Z-yHjQ") },
  { sessao: "A", ordem: 6, grupoMuscular: "Bíceps", series: 2, reps: "10-15", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false, bisetCom: 7,
    meso1: v("rosca-polia-baixa-barra", "Rosca na polia baixa (barra)", "12", "Biset com o tríceps: alternar sem descanso entre os dois", "0TtZgAuC8Vw"),
    meso2: v("rosca-scott", "Rosca Scott", "calibrar", "Biset com o tríceps: alternar sem descanso entre os dois", "wWKrF4iSU_8") },
  { sessao: "A", ordem: 7, grupoMuscular: "Tríceps", series: 2, reps: "10-15", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false, bisetCom: 6,
    meso1: v("triceps-corda", "Tríceps corda", "15", "Biset com a rosca: alternar sem descanso entre os dois", "re-ILvqD1RE"),
    meso2: v("triceps-barra-reta", "Tríceps barra reta", "calibrar", "Biset com a rosca: alternar sem descanso entre os dois", "er01XwtbP6g") },

  // ===== B — LOWER =====
  { sessao: "B", ordem: 1, grupoMuscular: "Quadríceps", series: 3, reps: "6-10", descanso: "2-3 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("hack-squat", "Hack squat", "30", "Último 30×9", "Whp712OHPl8"),
    meso2: v("agachamento-smith", "Agachamento no Smith", "calibrar", "Tronco vertical, pés levemente à frente", "7p_qycgzx4U") },
  { sessao: "B", ordem: 2, grupoMuscular: "Posterior", series: 3, reps: "8-12", descanso: "2 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("flexora-sentada", "Flexora sentada", "calibrar", "Histórico 120/50/210 kg incoerente", "t9sTSr-JYSs"),
    meso2: v("flexora-sentada-unilateral", "Flexora sentada unilateral", "calibrar", "", "Qsc45sDpvbM") },
  { sessao: "B", ordem: 3, grupoMuscular: "Quadríceps", series: 3, reps: "10-12", descanso: "2 min", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("leg-press-45", "Leg press 45°", "50", "Confirmar se 50 kg é total real (o carrinho entra no total?) e manter o critério", "waAxlYvtCcI"),
    meso2: v("leg-press-unilateral", "Leg press unilateral", "calibrar", "", "gICYf0sOwYI") },
  { sessao: "B", ordem: 4, grupoMuscular: "Glúteo", series: 3, reps: "8-12", descanso: "90 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("elevacao-pelvica-maquina", "Elevação pélvica na máquina", "calibrar", "Histórico 150→15 kg incoerente", "UVucPKyQVLU"),
    meso2: v("hip-thrust-barra", "Hip thrust com barra", "calibrar", "", "6sTO9ejM-Ew") },
  { sessao: "B", ordem: 5, grupoMuscular: "Panturrilha", series: 4, reps: "10-15", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("panturrilha-em-pe", "Panturrilha em pé", "42,5", "Pausa no alongamento e no topo", "of5Z7yj-HqY"),
    meso2: v("panturrilha-leg-press", "Panturrilha no leg press", "calibrar", "Pausa no alongamento e no topo", "Ua7jx6wKyMw") },
  { sessao: "B", ordem: 6, grupoMuscular: "Core", series: 3, reps: "10-15", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("abdominal-polia-alta", "Abdominal na polia alta", "calibrar", "Lombar sem dor, flexão vem do abdome", "kc0PRn372lo"),
    meso2: v("abdominal-maquina", "Abdominal na máquina", "calibrar", "Lombar sem dor, flexão vem do abdome", "0kLWho-pEdQ") },

  // ===== C — PUSH =====
  { sessao: "C", ordem: 1, grupoMuscular: "Peito", series: 4, reps: "6-9", descanso: "2-3 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("supino-maquina-convergente", "Supino na máquina (convergente)", "70", "Último 70×9", "bKSvckCwvh4"),
    meso2: v("supino-inclinado-halteres", "Supino inclinado com halteres", "calibrar", "", null) },
  { sessao: "C", ordem: 2, grupoMuscular: "Deltoides", series: 3, reps: "8-12", descanso: "2 min", testeFalha: false, composto: true, pesoCorporal: false,
    meso1: v("desenvolvimento-sentado-halteres", "Desenvolvimento sentado com halteres", "18", "Último 18×10", "eufDL9MmF8A"),
    meso2: v("desenvolvimento-maquina", "Desenvolvimento na máquina", "calibrar", "", "cAwjHUklmig") },
  { sessao: "C", ordem: 3, grupoMuscular: "Peito", series: 3, reps: "10-15", descanso: "90 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("crossover-polia-alta", "Crossover na polia alta", "25", "Último 25×12", "pdMWt71MPlw"),
    meso2: v("peck-deck", "Peck deck (voador)", "calibrar", "", "J1YnmuweOkM") },
  { sessao: "C", ordem: 4, grupoMuscular: "Deltoides", series: 4, reps: "12-20", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("elevacao-lateral-polia-unilateral", "Elevação lateral na polia (unilateral)", "calibrar", "Histórico 8→2,5 kg incoerente", "3vbYw9xklBc"),
    meso2: v("elevacao-lateral-maquina", "Elevação lateral na máquina", "calibrar", "", "7KmaeJ4z66s") },
  { sessao: "C", ordem: 5, grupoMuscular: "Tríceps", series: 3, reps: "10-15", descanso: "60-90 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("triceps-overhead-polia-corda", "Tríceps overhead na polia (corda)", "17", "Último 17×14", "mRozZKkGIfg"),
    meso2: v("triceps-frances-halter", "Tríceps francês com halter", "calibrar", "", "IJ6J7EKprsc") },

  // ===== D — PULL =====
  { sessao: "D", ordem: 1, grupoMuscular: "Costas", series: 3, reps: "6-10", descanso: "2-3 min", testeFalha: false, composto: true, pesoCorporal: false,
    meso1: v("graviton-neutra", "Graviton pegada neutra (assistência)", "14", "Registrar a ASSISTÊNCIA: quanto menor, mais difícil — progredir = descer o número", "aYPEH4WRo9Q"),
    meso2: v("puxada-frente-supinada", "Puxada frente supinada", "calibrar", "", "uA3IrbUAVKA") },
  { sessao: "D", ordem: 2, grupoMuscular: "Costas", series: 3, reps: "8-12", descanso: "2 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("remada-maquina-neutra", "Remada na máquina pegada neutra", "65", "Último 65×12 → subir", "hfhEieRoWfo"),
    meso2: v("remada-apoio-peito", "Remada com apoio de peito", "calibrar", "", "f8AVh4VBbos") },
  { sessao: "D", ordem: 3, grupoMuscular: "Costas", series: 3, reps: "10-12", descanso: "90 s", testeFalha: false, composto: false, pesoCorporal: false,
    meso1: v("remada-unilateral-halter", "Remada unilateral com halter (apoio no banco)", "24", "Último 24×10", "m4h4jT9patY"),
    meso2: v("remada-unilateral-polia", "Remada unilateral na polia", "calibrar", "", null) },
  { sessao: "D", ordem: 4, grupoMuscular: "Postura", series: 3, reps: "12-15", descanso: "60 s", testeFalha: false, composto: false, pesoCorporal: false,
    meso1: v("y-raise-prono", "Y-raise prono no banco inclinado 30° (POSTURAL)", "5", "Trapézio inferior; ombro não sobe", "yR7cIRWw9ZY"),
    meso2: v("crucifixo-inverso-polia-cruzada", "Crucifixo inverso na polia cruzada (POSTURAL)", "calibrar", "", "CfLXDFh110w") },
  { sessao: "D", ordem: 5, grupoMuscular: "Postura", series: 3, reps: "8-12", descanso: "60 s", testeFalha: false, composto: false, pesoCorporal: true,
    meso1: EXTENSAO_TORACICA,
    meso2: EXTENSAO_TORACICA },
  { sessao: "D", ordem: 6, grupoMuscular: "Bíceps", series: 3, reps: "10-12", descanso: "60-90 s", testeFalha: false, composto: false, pesoCorporal: false,
    meso1: v("rosca-inclinada-halteres", "Rosca inclinada com halteres", "10", "Estagnada em 10 kg há 4 exposições", "HhHHBj3qTJ4"),
    meso2: v("rosca-bayesian-polia", "Rosca bayesian na polia", "calibrar", "", "S6HnE1fDlaI") },

  // ===== E — LEGS =====
  { sessao: "E", ordem: 1, grupoMuscular: "Quadríceps", series: 3, reps: "6-10", descanso: "2-3 min", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("agachamento-smith", "Agachamento no Smith", "calibrar", "Tronco vertical, pés levemente à frente", "7p_qycgzx4U"),
    meso2: v("hack-squat", "Hack squat", "calibrar", "", "Whp712OHPl8") },
  { sessao: "E", ordem: 2, grupoMuscular: "Posterior", series: 3, reps: "10-15", descanso: "90 s", testeFalha: true, composto: true, pesoCorporal: false,
    meso1: v("flexora-deitada", "Flexora deitada", "calibrar", "Quadril colado no banco", "2-ULaRrQa7c"),
    meso2: v("flexora-sentada", "Flexora sentada", "calibrar", "", "t9sTSr-JYSs") },
  { sessao: "E", ordem: 3, grupoMuscular: "Quadríceps", series: 3, reps: "8-12", descanso: "90 s", testeFalha: false, composto: false, pesoCorporal: false,
    meso1: v("bulgaro-halteres", "Agachamento búlgaro com halteres", "7,5", "Tronco ereto; joelho alinhado", "IGf9fR4Y7Iw"),
    meso2: v("passada-estatica-smith", "Passada estática no Smith", "calibrar", "Tronco ereto; joelho alinhado", null) },
  { sessao: "E", ordem: 4, grupoMuscular: "Quadríceps", series: 3, reps: "12-15", descanso: "60-90 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("cadeira-extensora", "Cadeira extensora", "50", "Último 50×12", "el3oHblB5DM"),
    meso2: v("leg-press-unilateral", "Leg press unilateral", "calibrar", "", "gICYf0sOwYI") },
  { sessao: "E", ordem: 5, grupoMuscular: "Panturrilha", series: 4, reps: "10-15", descanso: "60 s", testeFalha: true, composto: false, pesoCorporal: false,
    meso1: v("panturrilha-sentado", "Panturrilha sentado", "22,5", "Último 20×12", "Vp788-iQqiI"),
    meso2: v("panturrilha-em-pe-unilateral", "Panturrilha em pé unilateral", "calibrar", "", "Xb-nuSxLVSY") },
  { sessao: "E", ordem: 6, grupoMuscular: "Core", series: 2, reps: "30-45 s/lado", descanso: "45 s", testeFalha: false, composto: false, pesoCorporal: true,
    meso1: v("prancha-lateral", "Prancha lateral", "peso corporal", "Quadril não cai", "iNbH7_edNI8"),
    meso2: v("prancha-frontal-carga", "Prancha frontal com carga", "calibrar", "", "0Mwk0RRUCxE") },
];

export const SESSOES: SessaoTreino[] = ["A", "B", "C", "D", "E"];

export const SESSAO_NOME: Record<SessaoTreino, string> = {
  A: "Upper",
  B: "Lower",
  C: "Push",
  D: "Pull",
  E: "Legs",
};

export const SESSAO_LABEL: Record<SessaoTreino, string> = {
  A: "A — Upper (peito, costas, ombro, braços + postural)",
  B: "B — Lower (quadríceps, posterior, glúteo, panturrilha, core)",
  C: "C — Push (peito, ombro, tríceps)",
  D: "D — Pull (costas, bíceps + postural)",
  E: "E — Legs (quadríceps, posterior, panturrilha, core)",
};

// Mesos ímpares usam a variação do Meso 1, pares a do Meso 2. A planilha só define os dois;
// alternar é o jeito de continuar trocando todos os exercícios a cada mesociclo.
function variacaoDoMeso(slot: SlotPrograma, meso: number): VariacaoExercicio {
  return meso % 2 === 1 ? slot.meso1 : slot.meso2;
}

export function getSessaoCompleta(sessao: SessaoTreino, meso: number): ExercicioEfetivo[] {
  return SLOTS.filter((s) => s.sessao === sessao)
    .sort((a, b) => a.ordem - b.ordem)
    .map((slot) => {
      const { meso1: _m1, meso2: _m2, ...prescricao } = slot;
      return { ...prescricao, ...variacaoDoMeso(slot, meso) };
    });
}

export function gruposDaSessao(sessao: SessaoTreino): GrupoMuscular[] {
  return Array.from(new Set(SLOTS.filter((s) => s.sessao === sessao).map((s) => s.grupoMuscular)));
}

// Resolve nome/grupo de qualquer id que possa estar no histórico: exercícios do programa
// atual (meso 1 e 2) e, para registros antigos, o catálogo arquivado do PPL.
const CATALOGO = new Map<string, { nome: string; grupoMuscular: GrupoMuscular }>();
for (const e of EXERCICIOS_PPL_V4) CATALOGO.set(e.id, e);
for (const s of SLOTS) {
  CATALOGO.set(s.meso1.id, { nome: s.meso1.nome, grupoMuscular: s.grupoMuscular });
  CATALOGO.set(s.meso2.id, { nome: s.meso2.nome, grupoMuscular: s.grupoMuscular });
}

export function getExercicio(id: string): { nome: string; grupoMuscular: GrupoMuscular } | undefined {
  return CATALOGO.get(id);
}

// Converte a "Partida (kg)" da planilha em número, quando é um número ("42,5" → 42.5).
export function partidaKg(partida: string): number | null {
  const n = Number(partida.replace(",", "."));
  return Number.isFinite(n) && partida.trim() !== "" ? n : null;
}
