import { addDiasISO, TREINOS_POR_SEMANA } from "./program";
import { sessoesConcluidasEm, type DadosTreino } from "./dados";
import type { SerieRegistrada } from "./tipos";

// Gamificação feita para uma coisa só: aderência a 4 treinos por semana. Tudo aqui é CALCULADO
// a partir do histórico (séries e sessões) — nada de contador guardado que possa dessincronizar.
// Apagou uma série por engano? XP, semanas e conquistas se ajustam sozinhos.
//
// Princípios (e por que):
//  - A unidade é a SEMANA, não o dia: com 4 treinos por semana, uma sequência diária quebraria
//    3 vezes por semana por desenho. Semana batida (4 treinos) = a sequência avança.
//  - Recompensa por aparecer, não por desempenho: XP vem de séries registradas e treinos
//    concluídos, nunca de carga. (O avanço de carga tem a própria conquista, "Mais forte".)
//  - Uma semana ruim não zera tudo: a "semana livre" (escudo) cobre 1 semana abaixo da meta;
//    ganha-se 1 a cada 4 semanas seguidas na meta.
//  - A primeira semana é neutra: quem recomeça numa quinta não é punida por não ter 4 dias.
//  - Voltar depois de uma pausa vale conquista: o ponto crítico da aderência é o retorno.

export const META_SEMANAL = TREINOS_POR_SEMANA;
export const XP_SERIE = 10;
export const XP_SESSAO = 100;
export const SEMANAS_PARA_ESCUDO = 4;
export const ESCUDOS_MAX = 1;
export const DIAS_PARADA_PARA_RECOMECO = 7;

// Multiplicador de XP pelas semanas seguidas na meta (antes da semana em curso).
export const MULTIPLICADORES: { aPartirDe: number; fator: number }[] = [
  { aPartirDe: 8, fator: 2 },
  { aPartirDe: 4, fator: 1.5 },
  { aPartirDe: 2, fator: 1.25 },
];

export function multiplicadorDasSemanas(semanasSeguidas: number): number {
  return MULTIPLICADORES.find((m) => semanasSeguidas >= m.aPartirDe)?.fator ?? 1;
}

type Historico = Pick<DadosTreino, "log" | "sessoes">;

// ===== Dias =====

export interface AtividadeDoDia {
  series: number;
  sessoes: number;
}

export function atividadePorDia(h: Historico): Map<string, AtividadeDoDia> {
  const mapa = new Map<string, AtividadeDoDia>();
  const dia = (data: string) => {
    let a = mapa.get(data);
    if (!a) {
      a = { series: 0, sessoes: 0 };
      mapa.set(data, a);
    }
    return a;
  };
  for (const s of h.log) {
    if (s.cargaKg === null && s.reps === null) continue;
    dia(s.data).series++;
  }
  // Treino terminado (ou com série registrada) — mesma regra do resto do app.
  for (const c of sessoesConcluidasEm(h)) dia(c.data).sessoes++;
  return mapa;
}

const treinou = (a: AtividadeDoDia | undefined) => !!a && (a.series > 0 || a.sessoes > 0);

function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((new Date(ateISO + "T00:00:00").getTime() - new Date(deISO + "T00:00:00").getTime()) / 86400000);
}

// ===== Semana (segunda a domingo) =====

export function inicioDaSemana(iso: string): string {
  const dow = new Date(iso + "T00:00:00").getDay(); // 0 = domingo
  return addDiasISO(iso, -((dow + 6) % 7));
}

export interface DiaDaSemana {
  data: string;
  rotulo: string;
  estado: "treinou" | "hoje" | "futuro" | "passado";
}

export interface StatusSemana {
  inicio: string;
  dias: DiaDaSemana[];
  feitos: number; // dias com treino na semana
  meta: number;
  batida: boolean;
  faltam: number;
  diasRestantes: number; // dias que ainda dá para treinar (hoje incluso se ainda não treinou)
  possivel: boolean; // dá para fechar a meta com os dias que restam?
  tudoOuNada: boolean; // só fecha a meta se treinar em todos os dias que restam
}

const ROTULOS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function statusSemana(atividade: Map<string, AtividadeDoDia>, hojeISO: string, meta = META_SEMANAL): StatusSemana {
  const inicio = inicioDaSemana(hojeISO);
  const dias: DiaDaSemana[] = [];
  let feitos = 0;
  for (let i = 0; i < 7; i++) {
    const data = addDiasISO(inicio, i);
    let estado: DiaDaSemana["estado"];
    if (treinou(atividade.get(data))) {
      estado = "treinou";
      feitos++;
    } else if (data === hojeISO) estado = "hoje";
    else if (data > hojeISO) estado = "futuro";
    else estado = "passado";
    dias.push({ data, rotulo: ROTULOS[i], estado });
  }
  const diasRestantes = dias.filter((d) => d.estado === "hoje" || d.estado === "futuro").length;
  const faltam = Math.max(0, meta - feitos);
  return {
    inicio,
    dias,
    feitos,
    meta,
    batida: feitos >= meta,
    faltam,
    diasRestantes,
    possivel: faltam <= diasRestantes,
    tudoOuNada: faltam > 0 && faltam === diasRestantes,
  };
}

// ===== Semanas seguidas na meta, com semana livre =====

export interface EstadoSemanas {
  atual: number; // semanas seguidas na meta (conta a semana em curso se já bateu)
  recorde: number;
  escudos: number;
  totalNaMeta: number;
  semanasProtegidas: string[]; // início das semanas cobertas pela semana livre
  recomecos: number; // voltas depois de 7+ dias sem treinar
  ultimoTreino: string | null;
  diasParada: number; // dias desde o último treino (0 = treinou hoje)
  // Semanas seguidas ANTES de cada semana (início → n): base do multiplicador de XP.
  seguidasAntes: Map<string, number>;
}

export function calcularSemanas(atividade: Map<string, AtividadeDoDia>, hojeISO: string, meta = META_SEMANAL): EstadoSemanas {
  const dias = Array.from(atividade.keys())
    .filter((d) => treinou(atividade.get(d)) && d <= hojeISO)
    .sort();
  const estado: EstadoSemanas = {
    atual: 0,
    recorde: 0,
    escudos: 0,
    totalNaMeta: 0,
    semanasProtegidas: [],
    recomecos: 0,
    ultimoTreino: dias[dias.length - 1] ?? null,
    diasParada: 0,
    seguidasAntes: new Map(),
  };
  if (dias.length === 0) return estado;

  for (let i = 1; i < dias.length; i++) {
    if (diasEntre(dias[i - 1], dias[i]) - 1 >= DIAS_PARADA_PARA_RECOMECO) estado.recomecos++;
  }
  estado.diasParada = diasEntre(estado.ultimoTreino as string, hojeISO);

  const porSemana = new Map<string, number>();
  for (const d of dias) porSemana.set(inicioDaSemana(d), (porSemana.get(inicioDaSemana(d)) ?? 0) + 1);

  const primeira = inicioDaSemana(dias[0]);
  const corrente = inicioDaSemana(hojeISO);
  let seguidas = 0;
  for (let inicio = primeira; inicio <= corrente; inicio = addDiasISO(inicio, 7)) {
    estado.seguidasAntes.set(inicio, seguidas);
    if ((porSemana.get(inicio) ?? 0) >= meta) {
      seguidas++;
      estado.totalNaMeta++;
      estado.recorde = Math.max(estado.recorde, seguidas);
      if (seguidas % SEMANAS_PARA_ESCUDO === 0) estado.escudos = Math.min(ESCUDOS_MAX, estado.escudos + 1);
    } else if (inicio < corrente && inicio !== primeira) {
      // A semana em curso ainda não acabou e a primeira é neutra: só as demais quebram.
      if (estado.escudos > 0 && seguidas > 0) {
        estado.escudos--;
        estado.semanasProtegidas.push(inicio);
      } else seguidas = 0;
    }
  }
  estado.atual = seguidas;
  return estado;
}

// ===== XP e nível =====

export interface Nivel {
  nivel: number;
  titulo: string;
  xpNoNivel: number;
  xpParaProximo: number; // tamanho do nível atual
  fracao: number; // 0–1
}

// XP total necessário para ALCANÇAR o nível n (nível 1 = 0).
export function xpParaAlcancar(n: number): number {
  return (150 * (n - 1) * n) / 2;
}

const TITULOS: { aPartirDe: number; titulo: string }[] = [
  { aPartirDe: 30, titulo: "Lenda" },
  { aPartirDe: 20, titulo: "Imparável" },
  { aPartirDe: 12, titulo: "Força" },
  { aPartirDe: 7, titulo: "Hábito" },
  { aPartirDe: 4, titulo: "Ritmo" },
  { aPartirDe: 1, titulo: "Começo" },
];

export function nivelDoXp(xp: number): Nivel {
  let n = 1;
  while (xpParaAlcancar(n + 1) <= xp) n++;
  const base = xpParaAlcancar(n);
  const tamanho = xpParaAlcancar(n + 1) - base;
  return {
    nivel: n,
    titulo: TITULOS.find((t) => n >= t.aPartirDe)?.titulo ?? "Começo",
    xpNoNivel: xp - base,
    xpParaProximo: tamanho,
    fracao: Math.min(1, (xp - base) / tamanho),
  };
}

export interface ResumoXp {
  total: number;
  hoje: number; // XP ganho hoje, já com multiplicador
  multiplicadorHoje: number;
}

// XP de cada dia = (séries × 10 + treinos × 100) × multiplicador das semanas seguidas na meta
// (as que vieram antes da semana do dia). Arredondado por dia.
export function calcularXp(atividade: Map<string, AtividadeDoDia>, semanas: EstadoSemanas, hojeISO: string): ResumoXp {
  let total = 0;
  let hoje = 0;
  for (const [data, a] of atividade) {
    if (data > hojeISO || !treinou(a)) continue;
    const ganho = Math.round((a.series * XP_SERIE + a.sessoes * XP_SESSAO) * multiplicadorDasSemanas(semanas.seguidasAntes.get(inicioDaSemana(data)) ?? 0));
    total += ganho;
    if (data === hojeISO) hoje = ganho;
  }
  return { total, hoje, multiplicadorHoje: multiplicadorDasSemanas(semanas.seguidasAntes.get(inicioDaSemana(hojeISO)) ?? semanas.atual) };
}

// ===== Cargas novas =====

// Quantas vezes ela levantou mais que em qualquer treino anterior do mesmo exercício
// (a primeira vez de um exercício não conta: ainda não há o que superar).
export function contarCargasNovas(log: SerieRegistrada[]): number {
  const porExercicio = new Map<string, Map<string, number>>(); // exercício → data → maior carga
  for (const s of log) {
    if (s.cargaKg == null || s.cargaKg <= 0 || s.reps == null || s.reps <= 0) continue;
    const dias = porExercicio.get(s.exercicioId) ?? new Map<string, number>();
    dias.set(s.data, Math.max(dias.get(s.data) ?? 0, s.cargaKg));
    porExercicio.set(s.exercicioId, dias);
  }
  let novas = 0;
  for (const dias of porExercicio.values()) {
    let melhor = 0;
    for (const data of Array.from(dias.keys()).sort()) {
      const carga = dias.get(data) as number;
      if (melhor > 0 && carga > melhor) novas++;
      melhor = Math.max(melhor, carga);
    }
  }
  return novas;
}

// ===== Conquistas =====

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: "flame" | "dumbbell" | "calendar" | "shield" | "undo" | "trending" | "trophy" | "star";
  atual: number;
  alvo: number;
  desbloqueada: boolean;
}

export interface MetricasConquista {
  sessoes: number;
  semanasSeguidas: number; // recorde
  recomecos: number;
  cargasNovas: number;
}

const DEF: Omit<Conquista, "atual" | "desbloqueada">[] = [
  { id: "primeiro-treino", nome: "Primeiro passo", descricao: "Faça seu primeiro treino de volta", icone: "dumbbell", alvo: 1 },
  { id: "sessoes-4", nome: "Primeiro ciclo", descricao: "Complete os 4 treinos (A, B, C, D)", icone: "dumbbell", alvo: 4 },
  { id: "sessoes-12", nome: "12 treinos", descricao: "Complete 12 treinos", icone: "dumbbell", alvo: 12 },
  { id: "sessoes-24", nome: "24 treinos", descricao: "Complete 24 treinos", icone: "trophy", alvo: 24 },
  { id: "sessoes-48", nome: "48 treinos", descricao: "Complete 48 treinos", icone: "trophy", alvo: 48 },
  { id: "sessoes-100", nome: "100 treinos", descricao: "Complete 100 treinos", icone: "star", alvo: 100 },
  { id: "semanas-1", nome: "Semana completa", descricao: "Faça os 4 treinos de uma semana", icone: "calendar", alvo: 1 },
  { id: "semanas-2", nome: "2 semanas seguidas", descricao: "Feche a semana 2 vezes seguidas", icone: "flame", alvo: 2 },
  { id: "semanas-4", nome: "Mês inteiro", descricao: "4 semanas seguidas na meta", icone: "flame", alvo: 4 },
  { id: "semanas-8", nome: "2 meses", descricao: "8 semanas seguidas na meta", icone: "flame", alvo: 8 },
  { id: "semanas-12", nome: "3 meses", descricao: "12 semanas seguidas na meta", icone: "star", alvo: 12 },
  { id: "volta-por-cima", nome: "Volta por cima", descricao: "Volte a treinar depois de 7+ dias parada", icone: "undo", alvo: 1 },
  { id: "carga-1", nome: "Mais forte", descricao: "Use mais carga que da última vez em um exercício", icone: "trending", alvo: 1 },
  { id: "carga-10", nome: "10 cargas novas", descricao: "Aumente a carga 10 vezes", icone: "trending", alvo: 10 },
  { id: "carga-25", nome: "25 cargas novas", descricao: "Aumente a carga 25 vezes", icone: "trending", alvo: 25 },
];

function valorDaConquista(id: string, m: MetricasConquista): number {
  if (id === "primeiro-treino" || id.startsWith("sessoes-")) return m.sessoes;
  if (id.startsWith("semanas-")) return m.semanasSeguidas;
  if (id === "volta-por-cima") return m.recomecos;
  if (id.startsWith("carga-")) return m.cargasNovas;
  return 0;
}

export function avaliarConquistas(m: MetricasConquista): Conquista[] {
  return DEF.map((d) => {
    const atual = valorDaConquista(d.id, m);
    return { ...d, atual: Math.min(atual, d.alvo), desbloqueada: atual >= d.alvo };
  });
}

// ===== Tudo junto =====

export interface Gamificacao {
  semana: StatusSemana;
  semanas: EstadoSemanas;
  xp: ResumoXp;
  nivel: Nivel;
  conquistas: Conquista[];
  proxima: Conquista | null; // a conquista pendente mais perto de sair
  mensagem: MensagemMotivacional;
  totalSessoes: number;
  treinouHoje: boolean;
}

export function calcularGamificacao(h: Historico, hojeISO: string): Gamificacao {
  const atividade = atividadePorDia(h);
  const semana = statusSemana(atividade, hojeISO);
  const semanas = calcularSemanas(atividade, hojeISO);
  const xp = calcularXp(atividade, semanas, hojeISO);
  const totalSessoes = sessoesConcluidasEm(h).length;
  const conquistas = avaliarConquistas({
    sessoes: totalSessoes,
    semanasSeguidas: semanas.recorde,
    recomecos: semanas.recomecos,
    cargasNovas: contarCargasNovas(h.log),
  });
  const proxima =
    conquistas
      .filter((c) => !c.desbloqueada)
      .sort((a, b) => b.atual / b.alvo - a.atual / a.alvo || a.alvo - b.alvo)[0] ?? null;
  const treinouHoje = treinou(atividade.get(hojeISO));
  return {
    semana,
    semanas,
    xp,
    nivel: nivelDoXp(xp.total),
    conquistas,
    proxima,
    mensagem: mensagemMotivacional({ semana, semanas, totalSessoes, treinouHoje }),
    totalSessoes,
    treinouHoje,
  };
}

// ===== Mensagens =====

export interface MensagemMotivacional {
  tom: "celebrar" | "empurrar" | "acolher";
  titulo: string;
  texto: string;
}

export function mensagemMotivacional({
  semana,
  semanas,
  totalSessoes,
  treinouHoje,
}: {
  semana: StatusSemana;
  semanas: EstadoSemanas;
  totalSessoes: number;
  treinouHoje: boolean;
}): MensagemMotivacional {
  if (totalSessoes === 0) {
    return {
      tom: "empurrar",
      titulo: "Hoje você volta",
      texto: "Primeiro treino da volta: só 2 séries por exercício e carga leve. Terminar sem forçar vale mais que treinar pesado.",
    };
  }
  if (treinouHoje) {
    if (semana.batida) {
      return { tom: "celebrar", titulo: "Meta da semana batida", texto: `${semana.feitos} de ${semana.meta} treinos. ${semanas.atual >= 2 ? `${semanas.atual} semanas seguidas na meta.` : "Descanse bem."}` };
    }
    return { tom: "celebrar", titulo: "Treino de hoje feito", texto: `Falta${semana.faltam === 1 ? "" : "m"} ${semana.faltam} ${semana.faltam === 1 ? "treino" : "treinos"} para fechar a semana (${semana.feitos}/${semana.meta}).` };
  }
  if (semanas.diasParada >= DIAS_PARADA_PARA_RECOMECO) {
    return {
      tom: "acolher",
      titulo: "Bora recomeçar",
      texto: `Faz ${semanas.diasParada} dias. Sem compensar nada: faça o treino de hoje, mesmo curto, e ganhe a conquista "Volta por cima".`,
    };
  }
  if (semana.batida) {
    return { tom: "celebrar", titulo: "Meta da semana já batida", texto: "Treinar hoje é bônus: ganha XP, mas descansar também é parte do plano." };
  }
  if (!semana.possivel) {
    return {
      tom: "acolher",
      titulo: "Semana apertada, tudo bem",
      texto: semanas.escudos > 0 ? "A semana livre cobre esta semana. Treine o que der e mantenha o ritmo." : "A meta desta semana ficou difícil. Cada treino conta: foque em não zerar.",
    };
  }
  if (semana.tudoOuNada) {
    return { tom: "empurrar", titulo: "Hoje é dia de treino", texto: `Falta${semana.faltam === 1 ? "" : "m"} ${semana.faltam} ${semana.faltam === 1 ? "treino" : "treinos"} e ${semana.diasRestantes === 1 ? "resta 1 dia" : `restam ${semana.diasRestantes} dias`}: não dá para pular nenhum para fechar a semana.` };
  }
  return { tom: "empurrar", titulo: "Hora do treino", texto: `Falta${semana.faltam === 1 ? "" : "m"} ${semana.faltam} ${semana.faltam === 1 ? "treino" : "treinos"} para fechar a semana (${semana.feitos}/${semana.meta}).` };
}
