import type { ExercicioEfetivo, GrupoMuscular, SessaoTreino, SlotPrograma, VariacaoExercicio } from "./tipos";

// Programa de hipertrofia em 4 dias: A Inferior (quadríceps) → B Superior → C Inferior (glúteo e
// posterior) → D Superior. Pensado para quem tem dor lombar: tudo é apoiado em máquina, polia ou
// banco; sem barra nas costas, sem peso morto/stiff, sem remada curvada e sem impacto. É um plano
// de partida, não prescrição médica: dor que aumenta no exercício = parar e trocar (botão
// "Trocar") ou falar com o profissional que acompanha.
//
// Cada posição tem um exercício padrão e trocas com a mesma biomecânica e o mesmo grupo muscular.

function v(id: string, nome: string, notas: string, imagem: string | null = null, extra: Partial<VariacaoExercicio> = {}): VariacaoExercicio {
  return { id, nome, notas, imagem, secundarios: SECUNDARIOS[id], ...extra };
}

// Músculos secundários por exercício (peso 0,5). Conservador: só o sinergista que de fato recebe
// estímulo relevante.
const MEIA = 0.5;
const PRESS = { "Tríceps": MEIA, Deltoides: MEIA };
const PUXADA = { "Bíceps": MEIA };
const AGACHAMENTO = { "Glúteo": MEIA };
const SECUNDARIOS: Record<string, Partial<Record<GrupoMuscular, number>>> = {
  "supino-maquina-convergente": PRESS,
  "supino-reto-halteres": PRESS,
  "supino-inclinado-maquina": PRESS,
  "supino-inclinado-halteres": PRESS,
  "puxada-frente-pronada": PUXADA,
  "puxada-neutra-fechada": PUXADA,
  "puxada-frente-supinada": PUXADA,
  "remada-apoio-peito-maquina": PUXADA,
  "remada-cavalinho-apoio-peito": PUXADA,
  "remada-unilateral-polia": PUXADA,
  "remada-unilateral-halter": PUXADA,
  "remada-maquina-neutra": PUXADA,
  "desenvolvimento-maquina": { "Tríceps": MEIA },
  "desenvolvimento-sentado-halteres": { "Tríceps": MEIA },
  "desenvolvimento-arnold": { "Tríceps": MEIA },
  "leg-press-45": AGACHAMENTO,
  "leg-press-pes-altos": { Posterior: MEIA },
  "hack-squat": AGACHAMENTO,
  "hack-squat-pes-altos": { Posterior: MEIA },
  "passada-estatica-smith": AGACHAMENTO,
  "bulgaro-halteres": AGACHAMENTO,
  "step-up-baixo": AGACHAMENTO,
  "elevacao-pelvica-maquina": { Posterior: MEIA },
  "hip-thrust-barra": { Posterior: MEIA },
  "ponte-gluteo-smith": { Posterior: MEIA },
};

export const SLOTS: SlotPrograma[] = [
  // ===== A — INFERIOR (quadríceps) =====
  { sessao: "A", ordem: 1, grupoMuscular: "Quadríceps", series: 3, reps: "10-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("leg-press-45", "Leg press 45°", "Pés na largura dos ombros, desça só até a lombar não descolar do encosto", "Leg_Press"),
      v("hack-squat", "Hack squat", "Costas e quadril colados no apoio; amplitude sem a lombar descolar", "Hack_Squat"),
    ] },
  { sessao: "A", ordem: 2, grupoMuscular: "Quadríceps", series: 3, reps: "10-12", descanso: "90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("passada-estatica-smith", "Passada estática no Smith (por perna)", "Tronco alto, pé da frente firme; desça reto, sem inclinar à frente", "Smith_Single-Leg_Split_Squat"),
      v("bulgaro-halteres", "Agachamento búlgaro com halteres (por perna)", "Tronco alto; apoie a mão se perder o equilíbrio", "Split_Squat_with_Dumbbells"),
      v("step-up-baixo", "Step-up em degrau baixo (por perna)", "Degrau na altura do joelho ou menos; suba sem impulso"),
    ] },
  { sessao: "A", ordem: 3, grupoMuscular: "Quadríceps", series: 3, reps: "12-15", descanso: "60-90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("cadeira-extensora", "Cadeira extensora", "Costas no encosto; segure 1 s no topo", "Leg_Extensions"),
      v("extensora-unilateral", "Cadeira extensora unilateral", "Uma perna por vez; mesmas regras da extensora", "Leg_Extensions"),
    ] },
  { sessao: "A", ordem: 4, grupoMuscular: "Posterior", series: 3, reps: "12-15", descanso: "60-90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("flexora-sentada", "Flexora sentada", "Quadril encaixado no banco; volta controlada", "Seated_Leg_Curl"),
      v("flexora-deitada", "Flexora deitada", "Sem tirar o quadril do banco nem arquear a lombar", "Lying_Leg_Curls"),
    ] },
  { sessao: "A", ordem: 5, grupoMuscular: "Panturrilha", series: 3, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("panturrilha-sentada", "Panturrilha sentada", "Amplitude completa, pausa de 1 s embaixo", "Seated_Calf_Raise"),
      v("panturrilha-leg-press", "Panturrilha no leg press", "Só a ponta do pé na plataforma; joelhos quase estendidos", "Calf_Press_On_The_Leg_Press_Machine"),
      v("panturrilha-em-pe", "Panturrilha em pé na máquina", "Amplitude completa, sem quicar", "Standing_Calf_Raises"),
    ] },
  { sessao: "A", ordem: 6, grupoMuscular: "Core", series: 2, reps: "8-10 por lado", descanso: "60 s", composto: false, pesoCorporal: true,
    opcoes: [
      v("dead-bug", "Dead bug", "Lombar colada no chão o tempo todo; se descolar, diminua a amplitude"),
      v("bird-dog", "Bird dog", "Coluna neutra, sem girar o quadril; segure 2 s", null),
      v("prancha-frontal", "Prancha frontal", "Corpo alinhado, sem afundar a lombar", "Plank", { reps: "30-45 s" }),
    ] },

  // ===== B — SUPERIOR =====
  { sessao: "B", ordem: 1, grupoMuscular: "Peito", series: 3, reps: "8-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("supino-maquina-convergente", "Supino na máquina (convergente)", "Costas no encosto, escápulas para trás", "Leverage_Chest_Press"),
      v("supino-reto-halteres", "Supino reto com halteres", "Pés firmes no chão; lombar sem arquear além do natural", "Dumbbell_Bench_Press"),
    ] },
  { sessao: "B", ordem: 2, grupoMuscular: "Costas", series: 3, reps: "8-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("puxada-frente-pronada", "Puxada frente (pegada pronada)", "Comece abaixando as escápulas; leve a barra ao peito alto", "Wide-Grip_Lat_Pulldown"),
      v("puxada-neutra-fechada", "Puxada neutra fechada", "Cotovelos para baixo, peito aberto", "V-Bar_Pulldown"),
    ] },
  { sessao: "B", ordem: 3, grupoMuscular: "Costas", series: 3, reps: "10-12", descanso: "90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("remada-apoio-peito-maquina", "Remada na máquina com apoio de peito", "Peito firme no apoio: a lombar não trabalha", "Leverage_Iso_Row"),
      v("remada-cavalinho-apoio-peito", "Remada cavalinho com apoio de peito", "Peito firme no apoio; puxe com os cotovelos", "Lying_T-Bar_Row"),
      v("remada-unilateral-polia", "Remada unilateral na polia (sentada)", "Sentada com tronco ereto; puxe o cotovelo ao quadril", "Seated_One-arm_Cable_Pulley_Rows"),
    ] },
  { sessao: "B", ordem: 4, grupoMuscular: "Deltoides", series: 3, reps: "10-12", descanso: "90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("desenvolvimento-maquina", "Desenvolvimento na máquina", "Costas totalmente apoiadas; não arquear a lombar", "Machine_Shoulder_Military_Press"),
      v("desenvolvimento-sentado-halteres", "Desenvolvimento sentada com halteres", "Banco com encosto alto; costas apoiadas", "Seated_Dumbbell_Press"),
      v("desenvolvimento-arnold", "Desenvolvimento Arnold sentada", "Banco com encosto; movimento lento", "Arnold_Dumbbell_Press"),
    ] },
  { sessao: "B", ordem: 5, grupoMuscular: "Deltoides", series: 3, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("elevacao-lateral-polia", "Elevação lateral na polia (sentada)", "Cotovelo levemente flexionado; suba até a altura do ombro", "Cable_Seated_Lateral_Raise"),
      v("elevacao-lateral-halteres", "Elevação lateral com halteres (sentada)", "Sentada no banco, sem balançar o tronco"),
    ] },
  { sessao: "B", ordem: 6, grupoMuscular: "Tríceps", series: 2, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("triceps-corda", "Tríceps na polia (corda)", "Cotovelos colados ao corpo", "Triceps_Pushdown_-_Rope_Attachment"),
      v("triceps-barra-reta", "Tríceps na polia (barra reta)", "Cotovelos colados ao corpo", "Triceps_Pushdown"),
    ] },
  { sessao: "B", ordem: 7, grupoMuscular: "Bíceps", series: 2, reps: "10-12", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("rosca-polia-baixa-barra", "Rosca na polia baixa", "Cotovelos fixos; sem balançar o tronco", "Standing_Biceps_Cable_Curl"),
      v("rosca-inclinada-halteres", "Rosca inclinada com halteres", "Banco inclinado com encosto; alongue bem embaixo", "Incline_Dumbbell_Curl"),
      v("rosca-scott", "Rosca Scott", "Braços totalmente apoiados", "Preacher_Curl"),
    ] },

  // ===== C — INFERIOR (glúteo e posterior) =====
  { sessao: "C", ordem: 1, grupoMuscular: "Glúteo", series: 3, reps: "8-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("elevacao-pelvica-maquina", "Elevação pélvica na máquina", "Queixo no peito, costelas para baixo; suba sem arquear a lombar", "Barbell_Hip_Thrust"),
      v("hip-thrust-barra", "Hip thrust com barra no banco", "Queixo no peito, costelas para baixo; trave o glúteo no topo", "Barbell_Hip_Thrust"),
      v("ponte-gluteo-smith", "Ponte de glúteo no Smith", "Mesma regra: o glúteo sobe o quadril, a lombar não", "Barbell_Hip_Thrust"),
    ] },
  { sessao: "C", ordem: 2, grupoMuscular: "Glúteo", series: 3, reps: "10-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("leg-press-pes-altos", "Leg press (pés altos e afastados)", "Lombar colada no encosto; desça até onde ela não descolar", "Leg_Press"),
      v("hack-squat-pes-altos", "Hack squat (pés altos e afastados)", "Costas e quadril colados no apoio", "Hack_Squat"),
    ] },
  { sessao: "C", ordem: 3, grupoMuscular: "Posterior", series: 3, reps: "10-12", descanso: "90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("flexora-deitada", "Flexora deitada", "Sem tirar o quadril do banco nem arquear a lombar", "Lying_Leg_Curls"),
      v("flexora-sentada", "Flexora sentada", "Quadril encaixado no banco; volta controlada", "Seated_Leg_Curl"),
    ] },
  { sessao: "C", ordem: 4, grupoMuscular: "Glúteo", series: 3, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("abdutora-maquina", "Cadeira abdutora", "Costas no encosto; abra sem balançar o tronco"),
      v("abducao-polia", "Abdução de quadril na polia", "Segure em apoio firme; tronco parado"),
    ] },
  { sessao: "C", ordem: 5, grupoMuscular: "Glúteo", series: 3, reps: "12-15 por perna", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("extensao-quadril-polia", "Extensão de quadril na polia (por perna)", "Apoie as mãos; o movimento é do quadril, sem arquear a lombar"),
      v("extensao-quadril-maquina", "Extensão de quadril na máquina (por perna)", "Peito apoiado; chute para trás sem arquear a lombar"),
    ] },
  { sessao: "C", ordem: 6, grupoMuscular: "Panturrilha", series: 3, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("panturrilha-em-pe", "Panturrilha em pé na máquina", "Amplitude completa, sem quicar", "Standing_Calf_Raises"),
      v("panturrilha-leg-press", "Panturrilha no leg press", "Só a ponta do pé na plataforma; joelhos quase estendidos", "Calf_Press_On_The_Leg_Press_Machine"),
      v("panturrilha-sentada", "Panturrilha sentada", "Amplitude completa, pausa de 1 s embaixo", "Seated_Calf_Raise"),
    ] },
  { sessao: "C", ordem: 7, grupoMuscular: "Core", series: 2, reps: "10-12 por lado", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("pallof-press", "Pallof press na polia", "Resista à rotação: tronco parado, braços estendem à frente"),
      v("prancha-lateral", "Prancha lateral", "Quadril alto, corpo em linha", "Side_Bridge", { reps: "20-30 s por lado" }),
    ] },

  // ===== D — SUPERIOR =====
  { sessao: "D", ordem: 1, grupoMuscular: "Peito", series: 3, reps: "8-12", descanso: "2 min", composto: true, pesoCorporal: false,
    opcoes: [
      v("supino-inclinado-maquina", "Supino inclinado na máquina", "Costas no encosto, escápulas para trás", "Leverage_Incline_Chest_Press"),
      v("supino-inclinado-halteres", "Supino inclinado com halteres", "Banco inclinado com encosto; pés firmes", "Incline_Dumbbell_Press"),
    ] },
  { sessao: "D", ordem: 2, grupoMuscular: "Costas", series: 3, reps: "10-12", descanso: "90 s", composto: true, pesoCorporal: false,
    opcoes: [
      v("remada-unilateral-polia", "Remada unilateral na polia (sentada)", "Sentada com tronco ereto; puxe o cotovelo ao quadril", "Seated_One-arm_Cable_Pulley_Rows"),
      v("remada-maquina-neutra", "Remada na máquina com apoio de peito (pegada neutra)", "Peito firme no apoio", "Leverage_Iso_Row"),
      v("remada-unilateral-halter", "Remada unilateral com halter (apoio no banco)", "Joelho e mão apoiados no banco, coluna reta; puxe ao quadril", "One-Arm_Dumbbell_Row"),
    ] },
  { sessao: "D", ordem: 3, grupoMuscular: "Costas", series: 3, reps: "10-12", descanso: "90 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("puxada-frente-supinada", "Puxada frente (pegada supinada)", "Cotovelos para baixo, peito aberto", "Underhand_Cable_Pulldowns"),
      v("puxada-neutra-fechada", "Puxada neutra fechada", "Cotovelos para baixo, peito aberto", "V-Bar_Pulldown"),
    ] },
  { sessao: "D", ordem: 4, grupoMuscular: "Deltoides", series: 3, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("crucifixo-inverso-maquina", "Crucifixo inverso na máquina", "Peito apoiado; abra os braços sem encolher o ombro", "Reverse_Machine_Flyes"),
      v("crucifixo-inverso-polia-cruzada", "Crucifixo inverso na polia cruzada", "Tronco ereto, braços quase retos", "Cable_Rear_Delt_Fly"),
      v("face-pull-polia", "Face pull na polia", "Ombro não sobe; segure 1 s", "Face_Pull"),
    ] },
  { sessao: "D", ordem: 5, grupoMuscular: "Peito", series: 2, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("peck-deck", "Voador (peck deck)", "Costas no encosto; junte os braços sem bater os pesos", "Butterfly"),
      v("crossover-polia-alta", "Crossover na polia alta", "Tronco ereto; une as mãos à frente do peito", "Cable_Crossover"),
    ] },
  { sessao: "D", ordem: 6, grupoMuscular: "Tríceps", series: 2, reps: "12-15", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("triceps-overhead-polia-corda", "Tríceps overhead na polia (corda)", "Cotovelos fixos acima da cabeça; costelas para baixo", "Cable_Rope_Overhead_Triceps_Extension"),
      v("triceps-frances-halter", "Tríceps francês com halter (sentada)", "Sentada com encosto; cotovelos fixos", "Standing_Dumbbell_Triceps_Extension"),
    ] },
  { sessao: "D", ordem: 7, grupoMuscular: "Bíceps", series: 2, reps: "10-12", descanso: "60 s", composto: false, pesoCorporal: false,
    opcoes: [
      v("rosca-inclinada-halteres", "Rosca inclinada com halteres", "Banco inclinado com encosto; alongue bem embaixo", "Incline_Dumbbell_Curl"),
      v("rosca-polia-baixa-barra", "Rosca na polia baixa", "Cotovelos fixos; sem balançar o tronco", "Standing_Biceps_Cable_Curl"),
      v("rosca-scott", "Rosca Scott", "Braços totalmente apoiados", "Preacher_Curl"),
    ] },
];

// Grupos de membro inferior: na progressão a carga sobe +5% (superior: menor incremento).
export const GRUPOS_INFERIORES = new Set<GrupoMuscular>(["Quadríceps", "Posterior", "Glúteo", "Panturrilha"]);

export const SESSOES: SessaoTreino[] = ["A", "B", "C", "D"];

export const SESSAO_NOME: Record<SessaoTreino, string> = {
  A: "Inferior · quadríceps",
  B: "Superior",
  C: "Inferior · glúteo e posterior",
  D: "Superior",
};

export const SESSAO_LABEL: Record<SessaoTreino, string> = {
  A: "A — Inferior (quadríceps, posterior, panturrilha, core)",
  B: "B — Superior (peito, costas, ombro, braços)",
  C: "C — Inferior (glúteo, posterior, panturrilha, core)",
  D: "D — Superior (peito, costas, ombro, braços)",
};

export const slotKey = (s: Pick<SlotPrograma, "sessao" | "ordem">) => `${s.sessao}${s.ordem}`;

// `trocas`: posição ("A1") → id do exercício escolhido. Id desconhecido (ou que não é opção
// daquela posição) cai no padrão, para um backup antigo nunca quebrar a tela.
export function getSessaoCompleta(sessao: SessaoTreino, trocas: Record<string, string> = {}): ExercicioEfetivo[] {
  return SLOTS.filter((s) => s.sessao === sessao)
    .sort((a, b) => a.ordem - b.ordem)
    .map((slot) => {
      const { opcoes, reps, ...prescricao } = slot;
      const escolhida = opcoes.find((o) => o.id === trocas[slotKey(slot)]) ?? opcoes[0];
      return { ...prescricao, ...escolhida, reps: escolhida.reps ?? reps, slotKey: slotKey(slot), opcoes, trocado: escolhida !== opcoes[0] };
    });
}

export function gruposDaSessao(sessao: SessaoTreino): GrupoMuscular[] {
  return Array.from(new Set(SLOTS.filter((s) => s.sessao === sessao).map((s) => s.grupoMuscular)));
}

// Resolve nome/grupo de qualquer id que possa estar no histórico (padrão ou troca).
export interface ExercicioCatalogo {
  nome: string;
  grupoMuscular: GrupoMuscular;
  secundarios?: Partial<Record<GrupoMuscular, number>>;
}
const CATALOGO = new Map<string, ExercicioCatalogo>();
for (const s of SLOTS) {
  for (const o of s.opcoes) {
    CATALOGO.set(o.id, { nome: o.nome, grupoMuscular: s.grupoMuscular, secundarios: o.secundarios });
  }
}

export function getExercicio(id: string): ExercicioCatalogo | undefined {
  return CATALOGO.get(id);
}
