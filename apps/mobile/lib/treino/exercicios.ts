import type { Exercicio, ExercicioEfetivo, ExercicioPostural, SessaoTreino, SlotPrograma } from "./tipos";

// Fonte: "planilha_hipertrofia_v4.xlsx".
//
// A v4 REMOVEU a rotação automática de 15 dias. Os 24 exercícios que existiam nos antigos
// Blocos 1-4 viraram um BANCO DE OPÇÕES por posição (slot): a prescrição (séries, reps,
// descanso, execução, papel postural, cues) pertence ao SLOT, não ao exercício — por isso
// ela vive em `SLOTS` e vale para qualquer opção escolhida naquele slot.
//
// `origem` em cada item do banco guarda de qual bloco da v3 a opção veio — é só rótulo de
// procedência, não existe mais calendário de blocos. Os ids (`b1-push-1`, ...) foram
// MANTIDOS de propósito para não invalidar o histórico de cargas já registrado no
// localStorage.
//
// O que o usuário treina agora (a escolha atual por slot) está em `lib/programaAtual.ts`.

export const SLOTS: SlotPrograma[] = [
  { sessao: "PUSH", slot: 1, grupoMuscular: "Peito", series: 4, reps: "6-9", descanso: "2-3 min", execucao: "Descida controlada", papelPostural: "INDIRETO", papelPosturalNota: "prática de retração escapular sob carga alta", notas: "Escápulas retraídas e DEPRIMIDAS antes de tirar a barra do apoio, e assim durante toda a série. Se a escápula proteger no meio da série, a carga está alta demais para o objetivo postural." },
  { sessao: "PUSH", slot: 2, grupoMuscular: "Deltoides", series: 3, reps: "8-12", descanso: "2 min", execucao: "Descida controlada", papelPostural: "DIRETO", papelPosturalNota: "exige extensão torácica para amplitude completa", notas: "Sem extensão torácica você não alcança amplitude sem impactar o ombro. Costelas baixas, sem compensar na lombar." },
  { sessao: "PUSH", slot: 3, grupoMuscular: "Peito", series: 3, reps: "10-15", descanso: "90 s", execucao: "Sem impulso no alongamento", papelPostural: "INDIRETO", papelPosturalNota: "carrega peitoral e serrátil em alongamento", notas: "Alongamento máximo controlado na excêntrica. Treina a cadeia anterior em comprimento longo sem encurtá-la." },
  { sessao: "PUSH", slot: 4, grupoMuscular: "Deltoides", series: 3, reps: "12-20", descanso: "60-90 s", execucao: "Sem impulso", papelPostural: "NEUTRO", papelPosturalNota: "vigiar dominância de trapézio superior", notas: "Tronco ereto, sem encolher o ombro. Se o ombro sobe junto, pare a série." },
  { sessao: "PUSH", slot: 5, grupoMuscular: "Tríceps", series: 3, reps: "10-15", descanso: "60-90 s", execucao: "Sem impulso", papelPostural: "NEUTRO", papelPosturalNota: "só manter cabeça neutra", notas: "Cotovelos estáveis; extensão completa sem projetar a cabeça à frente." },
  { sessao: "PUSH", slot: 6, grupoMuscular: "Tríceps", series: 3, reps: "10-15", descanso: "60 s", execucao: "Sem impulso no alongamento", papelPostural: "NEUTRO", papelPosturalNota: "cabeça longa do tríceps em alongamento", notas: "Braço acima da cabeça = cabeça longa em comprimento longo, onde ela mais responde. Cotovelos apontando para frente, sem abrir; descida profunda controlada." },
  { sessao: "PULL", slot: 1, grupoMuscular: "Costas", series: 4, reps: "6-10", descanso: "2-3 min", execucao: "Segurar 1s na contração", papelPostural: "DIRETO", papelPosturalNota: "depressão escapular e trapézio inferior", notas: "Iniciar SEMPRE com depressão escapular antes de flexionar o cotovelo. Peito aberto, olhar neutro." },
  { sessao: "PULL", slot: 2, grupoMuscular: "Costas", series: 4, reps: "8-10", descanso: "2-3 min", execucao: "Segurar 1s na contração", papelPostural: "DIRETO", papelPosturalNota: "trapézio médio e romboides", notas: "Puxar com o cotovelo; escápulas retraem no final. Tronco rígido, sem chicotear." },
  { sessao: "PULL", slot: 3, grupoMuscular: "Costas", series: 3, reps: "10-12", descanso: "90 s", execucao: "Segurar 1s na contração", papelPostural: "DIRETO", papelPosturalNota: "maior volume de retratores da semana", notas: "Amplitude cheia com pausa de 1 s na retração — sem a pausa o trapézio médio quase não trabalha." },
  { sessao: "PULL", slot: 4, grupoMuscular: "Deltoides", series: 3, reps: "12-20", descanso: "60-90 s", execucao: "Segurar 1s, sem impulso", papelPostural: "DIRETO", papelPosturalNota: "slot mais específico para cifose", notas: "Trapézio inferior + deltoide posterior. Carga leve, execução perfeita, ombro NÃO sobe. Não corte este por falta de tempo." },
  { sessao: "PULL", slot: 5, grupoMuscular: "Bíceps", series: 3, reps: "8-12", descanso: "60-90 s", execucao: "Sem impulso", papelPostural: "NEUTRO", papelPosturalNota: "executar em pé, tronco ereto", notas: "Cotovelos fixos ao tronco; descida controlada e completa." },
  { sessao: "PULL", slot: 6, grupoMuscular: "Bíceps", series: 3, reps: "10-15", descanso: "60 s", execucao: "Sem impulso no alongamento", papelPostural: "NEUTRO", papelPosturalNota: "bíceps em ênfase de alongamento", notas: "Variações que deixam o cotovelo atrás ou à frente do tronco para trabalhar a fase alongada. Sem balanço de tronco — se balançar, a carga está alta." },
  { sessao: "LEGS", slot: 1, grupoMuscular: "Quadríceps", series: 4, reps: "6-9", descanso: "2-3 min", execucao: "Descida controlada", papelPostural: "DIRETO", papelPosturalNota: "extensão torácica sustentada sob carga axial", notas: "Agachamento só é possível com a torácica estendida — se ela colapsa, a barra cai à frente. Maior estímulo de extensor torácico com carga alta do programa." },
  { sessao: "LEGS", slot: 2, grupoMuscular: "Posterior", series: 3, reps: "8-12", descanso: "2 min", execucao: "Descida controlada", papelPostural: "NEUTRO", papelPosturalNota: "apoiado, sem carga na coluna", notas: "Substitui o padrão de dobradiça (terra/stiff/good morning) retirado por dor lombar. Amplitude completa, quadril fixo no apoio." },
  { sessao: "LEGS", slot: 3, grupoMuscular: "Quadríceps", series: 3, reps: "10-12", descanso: "90 s", execucao: "Descida controlada", papelPostural: "NEUTRO", papelPosturalNota: "manter tronco ereto no unilateral", notas: "Controle na descida; joelho alinhado com o pé. Nas variações em pé, tronco vertical e escápulas retraídas." },
  { sessao: "LEGS", slot: 4, grupoMuscular: "Posterior", series: 3, reps: "10-15", descanso: "60-90 s", execucao: "Sem impulso", papelPostural: "INDIRETO", papelPosturalNota: "glúteo forte reduz báscula pélvica compensatória", notas: "Pausa de 1 s no pico. Extensão vem do quadril, não da lombar — costelas baixas no topo." },
  { sessao: "LEGS", slot: 5, grupoMuscular: "Panturrilha", series: 4, reps: "10-15", descanso: "45-60 s", execucao: "Pausa no alongamento e no topo", papelPostural: "NEUTRO", papelPosturalNota: "cabeça neutra, sem projetar à frente", notas: "Pausa de 1 s no alongamento total e 1 s no topo." },
  { sessao: "LEGS", slot: 6, grupoMuscular: "Core", series: 3, reps: "10-15 / 30-45 s", descanso: "45-60 s", execucao: "Controle total", papelPostural: "NEUTRO", papelPosturalNota: "core sem comprometer a lombar", notas: "Nas pranchas: lombar neutra, glúteo contraído, sem deixar o quadril cair. Nos crunches: a flexão vem do abdome, não do pescoço, e a lombar fica apoiada. Zero tolerância a dor lombar aqui." },
];

// Banco de opções por slot. `origem` = bloco da v3 de onde a opção veio (rótulo, não calendário).
// O item com origem 1 é o ponto de partida da v4 ("✓ ATUAL" na planilha).
export const EXERCICIOS: Exercicio[] = [
  // ===== PUSH =====
  { id: "b1-push-1", origem: 1, sessao: "PUSH", slot: 1, nome: "Supino reto com barra", grupoMuscular: "Peito", youtubeId: "pCPyqW60Wuk" },
  { id: "b2-push-1", origem: 2, sessao: "PUSH", slot: 1, nome: "Supino inclinado na máquina", grupoMuscular: "Peito", youtubeId: "7_scLkTCwTU" },
  { id: "b3-push-1", origem: 3, sessao: "PUSH", slot: 1, nome: "Supino na máquina (convergente)", grupoMuscular: "Peito", youtubeId: "bKSvckCwvh4" },
  { id: "b4-push-1", origem: 4, sessao: "PUSH", slot: 1, nome: "Supino reto com halteres", grupoMuscular: "Peito", youtubeId: "Cjh2fIMQHk0" },
  { id: "b1-push-2", origem: 1, sessao: "PUSH", slot: 2, nome: "Desenvolvimento sentado com halteres", grupoMuscular: "Deltoides", youtubeId: "eufDL9MmF8A" },
  { id: "b2-push-2", origem: 2, sessao: "PUSH", slot: 2, nome: "Desenvolvimento na máquina", grupoMuscular: "Deltoides", youtubeId: "cAwjHUklmig" },
  { id: "b3-push-2", origem: 3, sessao: "PUSH", slot: 2, nome: "Desenvolvimento Arnold", grupoMuscular: "Deltoides", youtubeId: "IIdj90AJArU" },
  { id: "b4-push-2", origem: 4, sessao: "PUSH", slot: 2, nome: "Desenvolvimento militar em pé (barra)", grupoMuscular: "Deltoides", youtubeId: "2yjwXTZQDDI" },
  { id: "b1-push-3", origem: 1, sessao: "PUSH", slot: 3, nome: "Crucifixo na polia baixa (ascendente)", grupoMuscular: "Peito", youtubeId: "KFl3Re5UbPo" },
  { id: "b2-push-3", origem: 2, sessao: "PUSH", slot: 3, nome: "Peck deck (voador)", grupoMuscular: "Peito", youtubeId: "J1YnmuweOkM" },
  { id: "b3-push-3", origem: 3, sessao: "PUSH", slot: 3, nome: "Crossover na polia alta", grupoMuscular: "Peito", youtubeId: "pdMWt71MPlw" },
  { id: "b4-push-3", origem: 4, sessao: "PUSH", slot: 3, nome: "Crucifixo reto com halteres", grupoMuscular: "Peito", youtubeId: "uDMmccuPVPQ" },
  { id: "b1-push-4", origem: 1, sessao: "PUSH", slot: 4, nome: "Elevação lateral com halteres", grupoMuscular: "Deltoides", youtubeId: "IwWvZ0rlNXs" },
  { id: "b2-push-4", origem: 2, sessao: "PUSH", slot: 4, nome: "Elevação lateral na polia (unilateral)", grupoMuscular: "Deltoides", youtubeId: "3vbYw9xklBc" },
  { id: "b3-push-4", origem: 3, sessao: "PUSH", slot: 4, nome: "Elevação lateral no banco inclinado", grupoMuscular: "Deltoides", youtubeId: "IwWvZ0rlNXs" },
  { id: "b4-push-4", origem: 4, sessao: "PUSH", slot: 4, nome: "Elevação lateral na máquina", grupoMuscular: "Deltoides", youtubeId: "7KmaeJ4z66s" },
  { id: "b1-push-5", origem: 1, sessao: "PUSH", slot: 5, nome: "Tríceps na polia (corda)", grupoMuscular: "Tríceps", youtubeId: "re-ILvqD1RE" },
  { id: "b2-push-5", origem: 2, sessao: "PUSH", slot: 5, nome: "Tríceps na polia alta (barra reta)", grupoMuscular: "Tríceps", youtubeId: "er01XwtbP6g" },
  { id: "b3-push-5", origem: 3, sessao: "PUSH", slot: 5, nome: "Tríceps francês unilateral (halter)", grupoMuscular: "Tríceps", youtubeId: "GSfdxnUdOYA" },
  { id: "b4-push-5", origem: 4, sessao: "PUSH", slot: 5, nome: "Paralelas no Graviton (tronco ereto)", grupoMuscular: "Tríceps", youtubeId: "t_LopJ0nW6M" },
  { id: "b1-push-6", origem: 1, sessao: "PUSH", slot: 6, nome: "Tríceps francês sentado com halter (2 mãos)", grupoMuscular: "Tríceps", youtubeId: "IJ6J7EKprsc" },
  { id: "b2-push-6", origem: 2, sessao: "PUSH", slot: 6, nome: "Tríceps overhead na polia (corda)", grupoMuscular: "Tríceps", youtubeId: "mRozZKkGIfg" },
  { id: "b3-push-6", origem: 3, sessao: "PUSH", slot: 6, nome: "Tríceps coice na polia (kickback)", grupoMuscular: "Tríceps", youtubeId: "ZvF4Oi_6Vtg" },
  { id: "b4-push-6", origem: 4, sessao: "PUSH", slot: 6, nome: "Tríceps overhead unilateral na polia", grupoMuscular: "Tríceps", youtubeId: "w3iAESGWK6M" },
  // ===== PULL =====
  { id: "b1-pull-1", origem: 1, sessao: "PULL", slot: 1, nome: "Puxada frente pronada", grupoMuscular: "Costas", youtubeId: "mPmfwbc_svw" },
  { id: "b2-pull-1", origem: 2, sessao: "PULL", slot: 1, nome: "Graviton (barra fixa assistida), pegada neutra", grupoMuscular: "Costas", youtubeId: "aYPEH4WRo9Q" },
  { id: "b3-pull-1", origem: 3, sessao: "PULL", slot: 1, nome: "Puxada frente supinada", grupoMuscular: "Costas", youtubeId: "uA3IrbUAVKA" },
  { id: "b4-pull-1", origem: 4, sessao: "PULL", slot: 1, nome: "Puxada neutra fechada", grupoMuscular: "Costas", youtubeId: "vUu_4jBxM1c" },
  { id: "b1-pull-2", origem: 1, sessao: "PULL", slot: 2, nome: "Remada curvada com barra", grupoMuscular: "Costas", youtubeId: "_vO2dAnz__c" },
  { id: "b2-pull-2", origem: 2, sessao: "PULL", slot: 2, nome: "Remada com apoio de peito (máquina/banco)", grupoMuscular: "Costas", youtubeId: "f8AVh4VBbos" },
  { id: "b3-pull-2", origem: 3, sessao: "PULL", slot: 2, nome: "Remada cavalinho (T-bar)", grupoMuscular: "Costas", youtubeId: "c7GF_mIDPyw" },
  { id: "b4-pull-2", origem: 4, sessao: "PULL", slot: 2, nome: "Remada Pendlay (ou curvada com halteres)", grupoMuscular: "Costas", youtubeId: "u9Vy-gdu_ew" },
  { id: "b1-pull-3", origem: 1, sessao: "PULL", slot: 3, nome: "Remada baixa (triângulo)", grupoMuscular: "Costas", youtubeId: "f8AVh4VBbos" },
  { id: "b2-pull-3", origem: 2, sessao: "PULL", slot: 3, nome: "Remada unilateral com halter", grupoMuscular: "Costas", youtubeId: "m4h4jT9patY" },
  { id: "b3-pull-3", origem: 3, sessao: "PULL", slot: 3, nome: "Remada na máquina pegada neutra", grupoMuscular: "Costas", youtubeId: "hfhEieRoWfo" },
  { id: "b4-pull-3", origem: 4, sessao: "PULL", slot: 3, nome: "Remada alta na polia p/ posterior (rope)", grupoMuscular: "Costas", youtubeId: "iWYNrcd3Y4Y" },
  { id: "b1-pull-4", origem: 1, sessao: "PULL", slot: 4, nome: "Face pull na polia", grupoMuscular: "Deltoides", youtubeId: "kYMTJAx_dTM" },
  { id: "b2-pull-4", origem: 2, sessao: "PULL", slot: 4, nome: "Y-raise prono no banco inclinado 30°", grupoMuscular: "Deltoides", youtubeId: "yR7cIRWw9ZY" },
  { id: "b3-pull-4", origem: 3, sessao: "PULL", slot: 4, nome: "Crucifixo inverso na polia cruzada (em pé)", grupoMuscular: "Deltoides", youtubeId: "CfLXDFh110w" },
  { id: "b4-pull-4", origem: 4, sessao: "PULL", slot: 4, nome: "Crucifixo inverso na máquina", grupoMuscular: "Deltoides", youtubeId: "EWwR2Z-yHjQ" },
  { id: "b1-pull-5", origem: 1, sessao: "PULL", slot: 5, nome: "Rosca direta com barra", grupoMuscular: "Bíceps", youtubeId: "lkvzj23fWtk" },
  { id: "b2-pull-5", origem: 2, sessao: "PULL", slot: 5, nome: "Rosca alternada com halteres", grupoMuscular: "Bíceps", youtubeId: "AuBN9_8Iihc" },
  { id: "b3-pull-5", origem: 3, sessao: "PULL", slot: 5, nome: "Rosca martelo", grupoMuscular: "Bíceps", youtubeId: "4-dSvYwu9yI" },
  { id: "b4-pull-5", origem: 4, sessao: "PULL", slot: 5, nome: "Rosca Scott", grupoMuscular: "Bíceps", youtubeId: "wWKrF4iSU_8" },
  { id: "b1-pull-6", origem: 1, sessao: "PULL", slot: 6, nome: "Rosca inclinada com halteres", grupoMuscular: "Bíceps", youtubeId: "HhHHBj3qTJ4" },
  { id: "b2-pull-6", origem: 2, sessao: "PULL", slot: 6, nome: "Rosca na polia baixa (barra)", grupoMuscular: "Bíceps", youtubeId: "0TtZgAuC8Vw" },
  { id: "b3-pull-6", origem: 3, sessao: "PULL", slot: 6, nome: "Rosca bayesian na polia (unilateral)", grupoMuscular: "Bíceps", youtubeId: "S6HnE1fDlaI" },
  { id: "b4-pull-6", origem: 4, sessao: "PULL", slot: 6, nome: "Rosca martelo na polia (corda)", grupoMuscular: "Bíceps", youtubeId: "mGR-KmEIaQk" },
  // ===== LEGS =====
  { id: "b1-legs-1", origem: 1, sessao: "LEGS", slot: 1, nome: "Agachamento goblet pesado (ou belt squat, se houver)", grupoMuscular: "Quadríceps", youtubeId: "JO7D6GJ98wY" },
  { id: "b2-legs-1", origem: 2, sessao: "LEGS", slot: 1, nome: "Hack squat", grupoMuscular: "Quadríceps", youtubeId: "Whp712OHPl8" },
  { id: "b3-legs-1", origem: 3, sessao: "LEGS", slot: 1, nome: "Agachamento frontal", grupoMuscular: "Quadríceps", youtubeId: "oN93q_EtZW0" },
  { id: "b4-legs-1", origem: 4, sessao: "LEGS", slot: 1, nome: "Agachamento no Smith", grupoMuscular: "Quadríceps", youtubeId: "7p_qycgzx4U" },
  { id: "b1-legs-2", origem: 1, sessao: "LEGS", slot: 2, nome: "Flexora sentada (seated leg curl)", grupoMuscular: "Posterior", youtubeId: "t9sTSr-JYSs" },
  { id: "b2-legs-2", origem: 2, sessao: "LEGS", slot: 2, nome: "Flexora deitada", grupoMuscular: "Posterior", youtubeId: "2-ULaRrQa7c" },
  { id: "b3-legs-2", origem: 3, sessao: "LEGS", slot: 2, nome: "Flexora sentada unilateral", grupoMuscular: "Posterior", youtubeId: "Qsc45sDpvbM" },
  { id: "b4-legs-2", origem: 4, sessao: "LEGS", slot: 2, nome: "Hip thrust com barra", grupoMuscular: "Posterior", youtubeId: "6sTO9ejM-Ew" },
  { id: "b1-legs-3", origem: 1, sessao: "LEGS", slot: 3, nome: "Leg press 45°", grupoMuscular: "Quadríceps", youtubeId: "waAxlYvtCcI" },
  { id: "b2-legs-3", origem: 2, sessao: "LEGS", slot: 3, nome: "Agachamento búlgaro com halteres", grupoMuscular: "Quadríceps", youtubeId: "IGf9fR4Y7Iw" },
  { id: "b3-legs-3", origem: 3, sessao: "LEGS", slot: 3, nome: "Leg press unilateral", grupoMuscular: "Quadríceps", youtubeId: "gICYf0sOwYI" },
  { id: "b4-legs-3", origem: 4, sessao: "LEGS", slot: 3, nome: "Cadeira extensora", grupoMuscular: "Quadríceps", youtubeId: "el3oHblB5DM" },
  { id: "b1-legs-4", origem: 1, sessao: "LEGS", slot: 4, nome: "Elevação pélvica na máquina", grupoMuscular: "Posterior", youtubeId: "UVucPKyQVLU" },
  { id: "b2-legs-4", origem: 2, sessao: "LEGS", slot: 4, nome: "Extensão de quadril na polia (unilateral)", grupoMuscular: "Posterior", youtubeId: "f3ebTCWwOwg" },
  { id: "b3-legs-4", origem: 3, sessao: "LEGS", slot: 4, nome: "Elevação pélvica unilateral", grupoMuscular: "Posterior", youtubeId: "L4nTaesNm0E" },
  { id: "b4-legs-4", origem: 4, sessao: "LEGS", slot: 4, nome: "Flexora deitada", grupoMuscular: "Posterior", youtubeId: "2-ULaRrQa7c" },
  { id: "b1-legs-5", origem: 1, sessao: "LEGS", slot: 5, nome: "Panturrilha em pé", grupoMuscular: "Panturrilha", youtubeId: "of5Z7yj-HqY" },
  { id: "b2-legs-5", origem: 2, sessao: "LEGS", slot: 5, nome: "Panturrilha sentado", grupoMuscular: "Panturrilha", youtubeId: "Vp788-iQqiI" },
  { id: "b3-legs-5", origem: 3, sessao: "LEGS", slot: 5, nome: "Panturrilha no leg press", grupoMuscular: "Panturrilha", youtubeId: "Ua7jx6wKyMw" },
  { id: "b4-legs-5", origem: 4, sessao: "LEGS", slot: 5, nome: "Panturrilha em pé unilateral", grupoMuscular: "Panturrilha", youtubeId: "Xb-nuSxLVSY" },
  { id: "b1-legs-6", origem: 1, sessao: "LEGS", slot: 6, nome: "Prancha frontal com carga", grupoMuscular: "Core", youtubeId: "0Mwk0RRUCxE" },
  { id: "b2-legs-6", origem: 2, sessao: "LEGS", slot: 6, nome: "Abdominal na polia alta (cable crunch)", grupoMuscular: "Core", youtubeId: "kc0PRn372lo" },
  { id: "b3-legs-6", origem: 3, sessao: "LEGS", slot: 6, nome: "Abdominal na máquina", grupoMuscular: "Core", youtubeId: "0kLWho-pEdQ" },
  { id: "b4-legs-6", origem: 4, sessao: "LEGS", slot: 6, nome: "Prancha lateral (30 s por lado)", grupoMuscular: "Core", youtubeId: "iNbH7_edNI8" },
];

// ===== BLOCO POSTURAL DIÁRIO (em casa, fora da academia) =====
// Não rotaciona e não tem banco de opções: trabalho corretivo depende de frequência alta e
// do MESMO padrão motor repetido. Por isso o postural carrega a própria prescrição.
export const POSTURAL: ExercicioPostural[] = [
  { id: "postural-1", ordem: 1, nome: "Extensão torácica no rolo (foam roller)", grupoMuscular: "Postura", series: 2, reps: "8-10", frequencia: "7x/semana", notas: "Rolo na altura das escápulas, mãos atrás da cabeça, estender a torácica sobre o rolo sem hiperextender a lombar. Mobiliza os segmentos rígidos em extensão — pré-requisito para o exercício 5 funcionar. Faça SEMPRE antes dele.", youtubeId: "IbKGlG2z-g0" },
  { id: "postural-2", ordem: 2, nome: "Wall slide", grupoMuscular: "Postura", series: 2, reps: "10-12", frequencia: "7x/semana", notas: "Costas na parede, lombar neutra, deslizar antebraços mantendo contato. Ativa trapézio inferior e serrátil com a torácica estendida.", youtubeId: "uH4jW37Tzpo" },
  { id: "postural-3", ordem: 3, nome: "Band pull-apart (pegada pronada)", grupoMuscular: "Postura", series: 2, reps: "15-20", frequencia: "7x/semana", notas: "Braços à frente na altura do peito, abrir a faixa com escápulas retraindo no final. Volta lenta e controlada, sem deixar a faixa puxar o braço. Resistência de trapézio médio e romboides.", youtubeId: "mHWlgqPvyxI" },
  { id: "postural-4", ordem: 4, nome: "Chin tuck (retração cervical)", grupoMuscular: "Postura", series: 2, reps: "10 x 3 s", frequencia: "7x/semana", notas: "Deslizar o queixo para trás (sem inclinar), segurar 3 s. A anteriorização de cabeça acompanha a hipercifose; fortalecer flexores profundos do pescoço fecha o circuito.", youtubeId: "-44s2eafc2A" },
  { id: "postural-5", ordem: 5, nome: "Extensão torácica em prono", grupoMuscular: "Postura", series: 3, reps: "8-12", frequencia: "3-4x/semana", notas: "O EXERCÍCIO MAIS IMPORTANTE DESTA ABA. Deitado de bruços, quadril e pernas ANCORADOS (peso do corpo na cama/banco, ou alguém segurando os tornozelos). Levantar o ESTERNO do chão — não a lombar. Amplitude pequena: 5-10 cm bastam. Olhar para o chão o tempo todo, sem estender o pescoço. Pausa de 2 s no topo. SE SENTIR NA LOMBAR: reduza a amplitude pela metade e ancore melhor o quadril. Progressão (avance só ao fechar 3x12 com pausa de 2s, sem dor lombar): E1 braços ao lado do corpo (sem. 1-2) → E2 mãos nas têmporas (sem. 3-5) → E3 braços em Y acima da cabeça (sem. 6-9) → E4 Y + carga de 1-2 kg, progredindo 0,5-1 kg ao fechar 3x12 (sem. 10+). Faça sempre depois do exercício 1 (foam roller).", youtubeId: "WJkydq1RVvk" },
];

export function getSlot(sessao: SessaoTreino, slot: number): SlotPrograma | undefined {
  return SLOTS.find((s) => s.sessao === sessao && s.slot === slot);
}

export function getExercicio(id: string): Exercicio | undefined {
  return EXERCICIOS.find((e) => e.id === id);
}

export function opcoesDoSlot(sessao: SessaoTreino, slot: number): Exercicio[] {
  return EXERCICIOS.filter((e) => e.sessao === sessao && e.slot === slot).sort((a, b) => a.origem - b.origem);
}

// Ponto de partida da v4 para cada slot — o item marcado "✓ ATUAL" na planilha (origem 1,
// exercícios do antigo Bloco 1). Usado como padrão até o usuário trocar algo.
export function getExercicioPadrao(sessao: SessaoTreino, slot: number): Exercicio {
  const padrao = EXERCICIOS.find((e) => e.sessao === sessao && e.slot === slot && e.origem === 1);
  if (!padrao) throw new Error(`Sem exercício padrão para ${sessao} slot ${slot}`);
  return padrao;
}

export function mesclarExercicio(exercicio: Exercicio): ExercicioEfetivo {
  const slotRx = getSlot(exercicio.sessao, exercicio.slot);
  if (!slotRx) throw new Error(`Sem prescrição para ${exercicio.sessao} slot ${exercicio.slot}`);
  return { ...exercicio, ...slotRx };
}

export function getExercicioEfetivo(id: string): ExercicioEfetivo | undefined {
  const exercicio = getExercicio(id);
  return exercicio ? mesclarExercicio(exercicio) : undefined;
}

export const SLOTS_POR_SESSAO: Record<SessaoTreino, number[]> = {
  PUSH: [1, 2, 3, 4, 5, 6],
  PULL: [1, 2, 3, 4, 5, 6],
  LEGS: [1, 2, 3, 4, 5, 6],
};

