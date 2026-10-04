import type { GrupoMuscular } from "../tipos";

// ARQUIVO — programa PPL 6x (planilha_hipertrofia_v4.xlsx, hoje em Treinos/arquivo/).
// Substituído em 04/10/2026 pelo programa sequencial U/L/Push/Pull/Legs (Mesociclo 1).
//
// Não é usado para montar treino. Existe só para que as séries antigas do localStorage
// (ids `b1-push-1`, `postural-3`, ...) continuem resolvendo nome e grupo muscular nos
// relatórios. Não adicione nada aqui.

export type SessaoLegada = "PUSH" | "PULL" | "LEGS";

export interface ExercicioLegado {
  id: string;
  nome: string;
  grupoMuscular: GrupoMuscular;
}

export const EXERCICIOS_PPL_V4: ExercicioLegado[] = [
  { id: "b1-push-1", nome: "Supino reto com barra", grupoMuscular: "Peito" },
  { id: "b2-push-1", nome: "Supino inclinado na máquina", grupoMuscular: "Peito" },
  { id: "b3-push-1", nome: "Supino na máquina (convergente)", grupoMuscular: "Peito" },
  { id: "b4-push-1", nome: "Supino reto com halteres", grupoMuscular: "Peito" },
  { id: "b1-push-2", nome: "Desenvolvimento sentado com halteres", grupoMuscular: "Deltoides" },
  { id: "b2-push-2", nome: "Desenvolvimento na máquina", grupoMuscular: "Deltoides" },
  { id: "b3-push-2", nome: "Desenvolvimento Arnold", grupoMuscular: "Deltoides" },
  { id: "b4-push-2", nome: "Desenvolvimento militar em pé (barra)", grupoMuscular: "Deltoides" },
  { id: "b1-push-3", nome: "Crucifixo na polia baixa (ascendente)", grupoMuscular: "Peito" },
  { id: "b2-push-3", nome: "Peck deck (voador)", grupoMuscular: "Peito" },
  { id: "b3-push-3", nome: "Crossover na polia alta", grupoMuscular: "Peito" },
  { id: "b4-push-3", nome: "Crucifixo reto com halteres", grupoMuscular: "Peito" },
  { id: "b1-push-4", nome: "Elevação lateral com halteres", grupoMuscular: "Deltoides" },
  { id: "b2-push-4", nome: "Elevação lateral na polia (unilateral)", grupoMuscular: "Deltoides" },
  { id: "b3-push-4", nome: "Elevação lateral no banco inclinado", grupoMuscular: "Deltoides" },
  { id: "b4-push-4", nome: "Elevação lateral na máquina", grupoMuscular: "Deltoides" },
  { id: "b1-push-5", nome: "Tríceps na polia (corda)", grupoMuscular: "Tríceps" },
  { id: "b2-push-5", nome: "Tríceps na polia alta (barra reta)", grupoMuscular: "Tríceps" },
  { id: "b3-push-5", nome: "Tríceps francês unilateral (halter)", grupoMuscular: "Tríceps" },
  { id: "b4-push-5", nome: "Paralelas no Graviton (tronco ereto)", grupoMuscular: "Tríceps" },
  { id: "b1-push-6", nome: "Tríceps francês sentado com halter (2 mãos)", grupoMuscular: "Tríceps" },
  { id: "b2-push-6", nome: "Tríceps overhead na polia (corda)", grupoMuscular: "Tríceps" },
  { id: "b3-push-6", nome: "Tríceps coice na polia (kickback)", grupoMuscular: "Tríceps" },
  { id: "b4-push-6", nome: "Tríceps overhead unilateral na polia", grupoMuscular: "Tríceps" },
  { id: "b1-pull-1", nome: "Puxada frente pronada", grupoMuscular: "Costas" },
  { id: "b2-pull-1", nome: "Graviton (barra fixa assistida), pegada neutra", grupoMuscular: "Costas" },
  { id: "b3-pull-1", nome: "Puxada frente supinada", grupoMuscular: "Costas" },
  { id: "b4-pull-1", nome: "Puxada neutra fechada", grupoMuscular: "Costas" },
  { id: "b1-pull-2", nome: "Remada curvada com barra", grupoMuscular: "Costas" },
  { id: "b2-pull-2", nome: "Remada com apoio de peito (máquina/banco)", grupoMuscular: "Costas" },
  { id: "b3-pull-2", nome: "Remada cavalinho (T-bar)", grupoMuscular: "Costas" },
  { id: "b4-pull-2", nome: "Remada Pendlay (ou curvada com halteres)", grupoMuscular: "Costas" },
  { id: "b1-pull-3", nome: "Remada baixa (triângulo)", grupoMuscular: "Costas" },
  { id: "b2-pull-3", nome: "Remada unilateral com halter", grupoMuscular: "Costas" },
  { id: "b3-pull-3", nome: "Remada na máquina pegada neutra", grupoMuscular: "Costas" },
  { id: "b4-pull-3", nome: "Remada alta na polia p/ posterior (rope)", grupoMuscular: "Costas" },
  { id: "b1-pull-4", nome: "Face pull na polia", grupoMuscular: "Deltoides" },
  { id: "b2-pull-4", nome: "Y-raise prono no banco inclinado 30°", grupoMuscular: "Deltoides" },
  { id: "b3-pull-4", nome: "Crucifixo inverso na polia cruzada (em pé)", grupoMuscular: "Deltoides" },
  { id: "b4-pull-4", nome: "Crucifixo inverso na máquina", grupoMuscular: "Deltoides" },
  { id: "b1-pull-5", nome: "Rosca direta com barra", grupoMuscular: "Bíceps" },
  { id: "b2-pull-5", nome: "Rosca alternada com halteres", grupoMuscular: "Bíceps" },
  { id: "b3-pull-5", nome: "Rosca martelo", grupoMuscular: "Bíceps" },
  { id: "b4-pull-5", nome: "Rosca Scott", grupoMuscular: "Bíceps" },
  { id: "b1-pull-6", nome: "Rosca inclinada com halteres", grupoMuscular: "Bíceps" },
  { id: "b2-pull-6", nome: "Rosca na polia baixa (barra)", grupoMuscular: "Bíceps" },
  { id: "b3-pull-6", nome: "Rosca bayesian na polia (unilateral)", grupoMuscular: "Bíceps" },
  { id: "b4-pull-6", nome: "Rosca martelo na polia (corda)", grupoMuscular: "Bíceps" },
  { id: "b1-legs-1", nome: "Agachamento goblet pesado (ou belt squat, se houver)", grupoMuscular: "Quadríceps" },
  { id: "b2-legs-1", nome: "Hack squat", grupoMuscular: "Quadríceps" },
  { id: "b3-legs-1", nome: "Agachamento frontal", grupoMuscular: "Quadríceps" },
  { id: "b4-legs-1", nome: "Agachamento no Smith", grupoMuscular: "Quadríceps" },
  { id: "b1-legs-2", nome: "Flexora sentada (seated leg curl)", grupoMuscular: "Posterior" },
  { id: "b2-legs-2", nome: "Flexora deitada", grupoMuscular: "Posterior" },
  { id: "b3-legs-2", nome: "Flexora sentada unilateral", grupoMuscular: "Posterior" },
  { id: "b4-legs-2", nome: "Hip thrust com barra", grupoMuscular: "Posterior" },
  { id: "b1-legs-3", nome: "Leg press 45°", grupoMuscular: "Quadríceps" },
  { id: "b2-legs-3", nome: "Agachamento búlgaro com halteres", grupoMuscular: "Quadríceps" },
  { id: "b3-legs-3", nome: "Leg press unilateral", grupoMuscular: "Quadríceps" },
  { id: "b4-legs-3", nome: "Cadeira extensora", grupoMuscular: "Quadríceps" },
  { id: "b1-legs-4", nome: "Elevação pélvica na máquina", grupoMuscular: "Posterior" },
  { id: "b2-legs-4", nome: "Extensão de quadril na polia (unilateral)", grupoMuscular: "Posterior" },
  { id: "b3-legs-4", nome: "Elevação pélvica unilateral", grupoMuscular: "Posterior" },
  { id: "b4-legs-4", nome: "Flexora deitada", grupoMuscular: "Posterior" },
  { id: "b1-legs-5", nome: "Panturrilha em pé", grupoMuscular: "Panturrilha" },
  { id: "b2-legs-5", nome: "Panturrilha sentado", grupoMuscular: "Panturrilha" },
  { id: "b3-legs-5", nome: "Panturrilha no leg press", grupoMuscular: "Panturrilha" },
  { id: "b4-legs-5", nome: "Panturrilha em pé unilateral", grupoMuscular: "Panturrilha" },
  { id: "b1-legs-6", nome: "Prancha frontal com carga", grupoMuscular: "Core" },
  { id: "b2-legs-6", nome: "Abdominal na polia alta (cable crunch)", grupoMuscular: "Core" },
  { id: "b3-legs-6", nome: "Abdominal na máquina", grupoMuscular: "Core" },
  { id: "b4-legs-6", nome: "Prancha lateral (30 s por lado)", grupoMuscular: "Core" },
  { id: "postural-1", nome: "Extensão torácica no rolo (foam roller)", grupoMuscular: "Postura" },
  { id: "postural-2", nome: "Wall slide", grupoMuscular: "Postura" },
  { id: "postural-3", nome: "Band pull-apart (pegada pronada)", grupoMuscular: "Postura" },
  { id: "postural-4", nome: "Chin tuck (retração cervical)", grupoMuscular: "Postura" },
  { id: "postural-5", nome: "Extensão torácica em prono", grupoMuscular: "Postura" },
];

// Chaves do localStorage que só faziam sentido no PPL (banco de exercícios por slot, log
// de trocas, escolha do dia). Na migração elas vão para o snapshot de arquivo e saem do ar.
export const CHAVES_STORAGE_PPL_V4 = ["treino:programaAtual", "treino:logTrocas", "treino:escolhaPorDia"];
