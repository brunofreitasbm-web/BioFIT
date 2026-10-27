import type { GrupoMuscular, SessaoTreino } from "./tipos";

// Mesociclos 2 e 3 (hipertrofia, 5 sessões/semana, ~55 min por sessão).
// Fonte: documento "Mesociclos 2 e 3 — hipertrofia, 5 sessões por semana" (projeto PersonalTrainer).
//
// Diferente do Meso 1 (prescrição compartilhada por posição + variação alternada), aqui cada
// meso define a sessão inteira: séries, reps e descanso por exercício, e o número de posições
// pode mudar (Meso 2: C=6 e D=7). `exercicios.ts` resolve nome/vídeo/imagem pelo `id`; ids já
// usados no Meso 1 mantêm o histórico de carga. Ids novos precisam de `nome`.
//
// Esforço (RIR declarado; o real tende a ser ~+1, ver calibração de RIR do app):
//  Meso 2 (acúmulo): R1 3 · R2 2 · R3 1–2 (isolados 1) · R4 1 (isolados 0–1)
//  Meso 3 (intensificação): R1 2 · R2 1–2 · R3 1 (isolados 0–1) · R4 1 (0 na última série do isolado)
// Sem teste de falha (as cargas de partida vêm do histórico/calibração, não de um teste).
// Rodada 5 = deload, como no Meso 1 (−10% carga, metade das séries, RIR 3–4).

export interface DefExercicioMeso {
  id: string;
  grupoMuscular: GrupoMuscular;
  series: number;
  reps: string;
  descanso: string;
  nome?: string; // obrigatório para ids que não existem no Meso 1
  partida?: string;
  notas?: string;
  pesoCorporal?: boolean;
  bisetCom?: number; // ordem do par no biset
}

type Lista = DefExercicioMeso[];
const e = (
  id: string,
  grupoMuscular: GrupoMuscular,
  series: number,
  reps: string,
  descanso: string,
  extra: Partial<DefExercicioMeso> = {},
): DefExercicioMeso => ({ id, grupoMuscular, series, reps, descanso, ...extra });

const BISET = "Biset: alternar sem descanso entre os dois";

const MESO2: Record<SessaoTreino, Lista> = {
  // 22 séries
  A: [
    e("supino-inclinado-halteres", "Peito", 3, "6-10", "2-3 min"),
    e("puxada-frente-supinada", "Costas", 3, "8-12", "2 min"),
    e("remada-baixa-triangulo", "Costas", 3, "8-12", "2 min", { nome: "Remada baixa na polia (triângulo)" }),
    e("elevacao-lateral-halteres", "Deltoides", 4, "12-20", "60-90 s", { nome: "Elevação lateral com halteres", notas: "Carga registrada por halter" }),
    e("face-pull-polia", "Postura", 3, "12-20", "60-90 s", { partida: "12" }),
    e("rosca-bayesian-polia", "Bíceps", 3, "10-15", "60 s", { bisetCom: 7, notas: BISET + " (unilateral)" }),
    e("triceps-barra-reta", "Tríceps", 3, "8-12", "60 s", { bisetCom: 6, notas: BISET + " (polia alta)" }),
  ],
  // 23
  B: [
    e("leg-press-45", "Quadríceps", 4, "8-12", "2-3 min"),
    e("flexora-sentada", "Posterior", 4, "8-12", "2 min"),
    e("cadeira-extensora", "Quadríceps", 3, "10-15", "90 s"),
    e("elevacao-pelvica-maquina", "Glúteo", 4, "8-12", "90 s"),
    e("panturrilha-em-pe", "Panturrilha", 5, "10-15", "60 s"),
    e("abdominal-polia-alta", "Core", 3, "10-15", "60 s"),
  ],
  // 23
  C: [
    e("supino-reto-halteres", "Peito", 4, "6-10", "2-3 min", { notas: "Carga registrada por halter" }),
    e("desenvolvimento-arnold", "Deltoides", 4, "8-12", "2 min", { notas: "Carga registrada por halter" }),
    e("peck-deck", "Peito", 4, "10-15", "90 s"),
    e("crucifixo-polia-baixa", "Peito", 3, "10-15", "90 s", { nome: "Crucifixo na polia baixa (ascendente)" }),
    e("elevacao-lateral-banco-inclinado", "Deltoides", 4, "12-20", "60 s", { nome: "Elevação lateral no banco inclinado (de lado)", notas: "Carga registrada por halter" }),
    e("triceps-frances-halter", "Tríceps", 4, "10-15", "60-90 s", { notas: "Unilateral" }),
  ],
  // 23
  D: [
    e("puxada-neutra-fechada", "Costas", 3, "8-12", "2 min", { notas: "Triângulo" }),
    e("remada-cavalinho-apoio-peito", "Costas", 3, "8-12", "2 min"),
    e("pullover-polia", "Costas", 3, "10-15", "90 s", { nome: "Pullover na polia" }),
    e("crucifixo-inverso-polia-cruzada", "Postura", 4, "12-20", "60-90 s"),
    e("y-raise-prono", "Postura", 3, "12-15", "60 s", { partida: "5" }),
    e("extensao-toracica-prono", "Postura", 3, "8-12", "60 s", { pesoCorporal: true }),
    e("rosca-martelo-halteres", "Bíceps", 4, "10-12", "60-90 s", { nome: "Rosca martelo com halteres", notas: "Carga registrada por halter" }),
  ],
  // 23
  E: [
    e("hack-squat", "Quadríceps", 4, "6-10", "2-3 min"),
    e("flexora-deitada", "Posterior", 4, "10-15", "2 min"),
    e("leg-press-unilateral", "Quadríceps", 3, "8-12", "2 min", { notas: "Por perna; registrar a carga total do carrinho" }),
    e("elevacao-pelvica-maquina", "Glúteo", 4, "8-12", "90 s"),
    e("panturrilha-sentado", "Panturrilha", 5, "12-20", "60 s"),
    e("prancha-lateral", "Core", 3, "30-45 s/lado", "45 s", { pesoCorporal: true }),
  ],
};

const MESO3: Record<SessaoTreino, Lista> = {
  // 23
  A: [
    e("supino-inclinado-maquina", "Peito", 3, "5-8", "2-3 min", { partida: "55", notas: "Referência do Meso 1: 55×9" }),
    e("puxada-frente-pronada", "Costas", 3, "6-10", "2-3 min", { partida: "75", notas: "Referência do Meso 1: 75×8" }),
    e("remada-apoio-peito-maquina", "Costas", 3, "8-12", "2 min"),
    e("elevacao-lateral-halteres", "Deltoides", 4, "12-20", "60-90 s", { nome: "Elevação lateral com halteres", notas: "Carga registrada por halter" }),
    e("face-pull-polia", "Postura", 3, "12-20", "60-90 s", { partida: "12" }),
    e("rosca-scott", "Bíceps", 4, "8-12", "60 s", { bisetCom: 7, notas: BISET + " (máquina)" }),
    e("triceps-corda", "Tríceps", 3, "10-15", "60 s", { bisetCom: 6, notas: BISET + " (pushdown)" }),
  ],
  // 23
  B: [
    e("hack-squat", "Quadríceps", 4, "5-8", "2-3 min"),
    e("flexora-sentada", "Posterior", 4, "8-12", "2 min"),
    e("leg-press-45", "Quadríceps", 3, "8-12", "2 min"),
    e("elevacao-pelvica-maquina", "Glúteo", 4, "6-10", "90 s"),
    e("panturrilha-em-pe", "Panturrilha", 5, "8-12", "60 s"),
    e("abdominal-polia-alta", "Core", 3, "8-12", "60 s"),
  ],
  // 23
  C: [
    e("supino-maquina-convergente", "Peito", 4, "5-8", "2-3 min"),
    e("desenvolvimento-sentado-halteres", "Deltoides", 4, "6-10", "2-3 min", { notas: "Carga registrada por halter" }),
    e("crossover-polia-alta", "Peito", 3, "10-15", "90 s"),
    e("elevacao-lateral-banco-inclinado", "Deltoides", 4, "12-20", "60 s", { nome: "Elevação lateral no banco inclinado (de lado)", notas: "Carga registrada por halter" }),
    e("triceps-overhead-polia-corda", "Tríceps", 4, "10-15", "60-90 s"),
    e("peck-deck", "Peito", 4, "10-15", "90 s"),
  ],
  // 23
  D: [
    e("graviton-neutra", "Costas", 3, "5-8", "2-3 min", { notas: "Registrar a ASSISTÊNCIA: progredir = diminuir o número" }),
    e("remada-maquina-neutra", "Costas", 3, "8-12", "2 min"),
    e("remada-alta-polia-corda", "Postura", 3, "12-15", "90 s", { nome: "Remada alta na polia (corda)" }),
    e("crucifixo-inverso-maquina", "Postura", 4, "12-20", "60-90 s"),
    e("y-raise-prono", "Postura", 3, "12-15", "60 s", { partida: "5" }),
    e("extensao-toracica-prono", "Postura", 3, "8-12", "60 s", { pesoCorporal: true }),
    e("rosca-inclinada-halteres", "Bíceps", 4, "10-12", "60-90 s", { notas: "Carga registrada por halter" }),
  ],
  // 23
  E: [
    e("agachamento-smith", "Quadríceps", 3, "6-10", "2-3 min"),
    e("flexora-deitada", "Posterior", 5, "10-15", "2 min"),
    e("cadeira-extensora", "Quadríceps", 3, "12-15", "90 s"),
    e("elevacao-pelvica-maquina", "Glúteo", 4, "8-12", "90 s"),
    e("panturrilha-sentado", "Panturrilha", 5, "10-15", "60 s"),
    e("prancha-lateral", "Core", 3, "30-45 s/lado", "45 s", { pesoCorporal: true }),
  ],
};

// Mesos de hipertrofia definidos sem depender do Meso 1 (que continua em SLOTS).
export const PROGRAMA_MESOS_23: Record<2 | 3, Record<SessaoTreino, Lista>> = { 2: MESO2, 3: MESO3 };

// O programa roda em ciclo de 3 mesociclos: 1 (SLOTS) → 2 → 3 → 1 → …
export const MESOS_NO_CICLO = 3;
export function posicaoNoCiclo(meso: number): 1 | 2 | 3 {
  return ((((meso - 1) % MESOS_NO_CICLO) + MESOS_NO_CICLO) % MESOS_NO_CICLO + 1) as 1 | 2 | 3;
}
