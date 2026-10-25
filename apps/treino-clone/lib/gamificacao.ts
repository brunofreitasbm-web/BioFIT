import { addDiasISO } from "./program";
import { sessoesConcluidasEm, type DadosTreino } from "./dados";

// Gamificação feita para uma coisa só: aderência. Tudo aqui é CALCULADO a partir do histórico
// (séries, sessões, dias leves) — nada de contador guardado que possa dessincronizar. Apagou
// uma série por engano? O XP e a sequência se ajustam sozinhos.
//
// Princípios (e por que):
//  - Recompensa por aparecer, não por desempenho: XP vem de séries registradas e sessões
//    terminadas, nunca de carga. Carga alta não deve ser o jeito de "ganhar" o jogo.
//  - Sequência com ESCUDOS: sequência que zera por um dia ruim é o que faz as pessoas
//    abandonarem o app. O escudo cobre 1 falta; ganha-se 1 a cada 7 dias seguidos (máx. 2).
//  - Meta SEMANAL ao lado da diária: errar uma terça não anula a semana.
//  - Volta por cima vale conquista: o ponto crítico da aderência é o dia seguinte à falha.
//  - Dia leve (caminhada, mobilidade) mantém a sequência: dá para "estar presente todo dia"
//    sem empilhar musculação pesada em dias seguidos.

export const XP_SERIE = 10;
export const XP_SESSAO = 100;
export const XP_DIA_LEVE = 40;

export const ESCUDOS_MAX = 2;
export const DIAS_PARA_ESCUDO = 7;

// Multiplicador de XP pela sequência vigente naquele dia.
export const MULTIPLICADORES: { aPartirDe: number; fator: number }[] = [
  { aPartirDe: 30, fator: 2 },
  { aPartirDe: 14, fator: 1.5 },
  { aPartirDe: 7, fator: 1.25 },
];

export function multiplicadorDaSequencia(sequencia: number): number {
  return MULTIPLICADORES.find((m) => sequencia >= m.aPartirDe)?.fator ?? 1;
}

type Historico = Pick<DadosTreino, "log" | "sessoes" | "diasLeves">;

// ===== Dias =====

export interface AtividadeDoDia {
  series: number;
  sessoes: number;
  leve: boolean;
}

export function atividadePorDia(h: Historico): Map<string, AtividadeDoDia> {
  const mapa = new Map<string, AtividadeDoDia>();
  const dia = (data: string) => {
    let a = mapa.get(data);
    if (!a) {
      a = { series: 0, sessoes: 0, leve: false };
      mapa.set(data, a);
    }
    return a;
  };
  for (const s of h.log) {
    if (s.cargaKg === null && s.reps === null) continue;
    dia(s.data).series++;
  }
  // Sessões do programa terminadas (ou com série registrada) — mesma regra do resto do app.
  for (const c of sessoesConcluidasEm(h, "0000-00-00")) dia(c.data).sessoes++;
  for (const data of Object.keys(h.diasLeves)) dia(data).leve = true;
  return mapa;
}

const treinouForca = (a: AtividadeDoDia) => a.series > 0 || a.sessoes > 0;
const ativo = (a: AtividadeDoDia | undefined) => !!a && (treinouForca(a) || a.leve);

// ===== Sequência com escudos =====

export interface EstadoSequencia {
  atual: number; // dias seguidos vigentes (incluindo hoje se já treinou)
  recorde: number;
  escudos: number;
  hojeFeito: boolean;
  // Dias que o escudo cobriu (não somaram, mas não quebraram).
  diasProtegidos: string[];
  // Quantas vezes voltou depois de parar 3+ dias (cada "volta por cima").
  recomecos: number;
  ultimoDiaAtivo: string | null;
  diasParada: number; // dias sem atividade até ontem/hoje (0 = ativo hoje)
  // Sequência vigente em cada dia ativo (já contando o próprio dia). Base do multiplicador de XP.
  noDia: Map<string, number>;
}

export const DIAS_PARADA_PARA_RECOMECO = 3;

// Reproduz o histórico dia a dia. Hoje nunca quebra a sequência: o dia ainda não acabou.
export function calcularSequencia(atividade: Map<string, AtividadeDoDia>, hojeISO: string): EstadoSequencia {
  const datas = Array.from(atividade.keys()).filter((d) => ativo(atividade.get(d)) && d <= hojeISO).sort();
  const estado: EstadoSequencia = {
    atual: 0,
    recorde: 0,
    escudos: 0,
    hojeFeito: ativo(atividade.get(hojeISO)),
    diasProtegidos: [],
    recomecos: 0,
    ultimoDiaAtivo: datas[datas.length - 1] ?? null,
    diasParada: 0,
    noDia: new Map(),
  };
  if (datas.length === 0) return estado;

  let cursor = datas[0];
  let parados = 0; // dias consecutivos sem atividade (nem escudo) antes do cursor
  while (cursor <= hojeISO) {
    if (ativo(atividade.get(cursor))) {
      if (parados >= DIAS_PARADA_PARA_RECOMECO) estado.recomecos++;
      parados = 0;
      estado.atual++;
      if (estado.atual % DIAS_PARA_ESCUDO === 0) estado.escudos = Math.min(ESCUDOS_MAX, estado.escudos + 1);
      estado.recorde = Math.max(estado.recorde, estado.atual);
      estado.noDia.set(cursor, estado.atual);
    } else if (cursor !== hojeISO) {
      if (estado.escudos > 0 && estado.atual > 0) {
        estado.escudos--;
        estado.diasProtegidos.push(cursor);
      } else {
        estado.atual = 0;
        parados++;
      }
    }
    cursor = addDiasISO(cursor, 1);
  }
  estado.diasParada = estado.hojeFeito ? 0 : diasEntre(estado.ultimoDiaAtivo as string, hojeISO);
  return estado;
}

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
  estado: "forca" | "leve" | "protegido" | "perdido" | "futuro" | "hoje";
}

export interface StatusSemana {
  inicio: string;
  dias: DiaDaSemana[];
  diasDeForca: number; // dias com musculação (o que conta para a meta)
  meta: number;
  batida: boolean;
  faltam: number;
  // Dá para fechar a meta mesmo treinando todos os dias que restam?
  possivel: boolean;
}

const ROTULOS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function statusSemana(atividade: Map<string, AtividadeDoDia>, protegidos: string[], hojeISO: string, meta: number): StatusSemana {
  const inicio = inicioDaSemana(hojeISO);
  const dias: DiaDaSemana[] = [];
  let diasDeForca = 0;
  for (let i = 0; i < 7; i++) {
    const data = addDiasISO(inicio, i);
    const a = atividade.get(data);
    let estado: DiaDaSemana["estado"];
    if (a && treinouForca(a)) {
      estado = "forca";
      diasDeForca++;
    } else if (a?.leve) estado = "leve";
    else if (protegidos.includes(data)) estado = "protegido";
    else if (data === hojeISO) estado = "hoje";
    else if (data > hojeISO) estado = "futuro";
    else estado = "perdido";
    dias.push({ data, rotulo: ROTULOS[i], estado });
  }
  const hojeAtividade = atividade.get(hojeISO);
  const restantes = dias.filter((d) => d.data > hojeISO).length + (hojeAtividade && treinouForca(hojeAtividade) ? 0 : 1);
  const faltam = Math.max(0, meta - diasDeForca);
  return { inicio, dias, diasDeForca, meta, batida: diasDeForca >= meta, faltam, possivel: faltam <= restantes };
}

// Semanas fechadas (anteriores à atual) em que a meta foi batida, e quantas seguidas até agora.
export function semanasNaMeta(atividade: Map<string, AtividadeDoDia>, hojeISO: string, meta: number): { total: number; seguidas: number } {
  const primeiro = Array.from(atividade.keys()).filter((d) => treinouForca(atividade.get(d) as AtividadeDoDia)).sort()[0];
  if (!primeiro) return { total: 0, seguidas: 0 };
  const semanaAtual = inicioDaSemana(hojeISO);
  let total = 0;
  let seguidas = 0;
  for (let inicio = inicioDaSemana(primeiro); inicio < semanaAtual; inicio = addDiasISO(inicio, 7)) {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const a = atividade.get(addDiasISO(inicio, i));
      if (a && treinouForca(a)) n++;
    }
    if (n >= meta) {
      total++;
      seguidas++;
    } else seguidas = 0;
  }
  return { total, seguidas };
}

// ===== XP e nível =====

export interface Nivel {
  nivel: number;
  titulo: string;
  xpNoNivel: number; // XP acumulado dentro do nível atual
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

// XP de cada dia = (séries × 10 + sessões × 100 + dia leve × 40) × multiplicador da sequência
// vigente naquele dia. Arredondado por dia.
export function calcularXp(atividade: Map<string, AtividadeDoDia>, sequencia: EstadoSequencia, hojeISO: string): ResumoXp {
  let total = 0;
  let hoje = 0;
  for (const [data, seq] of sequencia.noDia) {
    const a = atividade.get(data) as AtividadeDoDia;
    const base = a.series * XP_SERIE + a.sessoes * XP_SESSAO + (a.leve && !treinouForca(a) ? XP_DIA_LEVE : 0);
    const ganho = Math.round(base * multiplicadorDaSequencia(seq));
    total += ganho;
    if (data === hojeISO) hoje = ganho;
  }
  // Se hoje ainda não é dia ativo, o multiplicador que vale é o do dia que ela vai fechar.
  const multiplicadorHoje = multiplicadorDaSequencia(sequencia.noDia.get(hojeISO) ?? sequencia.atual + 1);
  return { total, hoje, multiplicadorHoje };
}

// ===== Conquistas =====

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: "flame" | "dumbbell" | "calendar" | "shield" | "undo" | "footprints" | "trophy" | "star";
  atual: number;
  alvo: number;
  desbloqueada: boolean;
}

export interface MetricasConquista {
  sessoes: number;
  recordeSequencia: number;
  semanasNaMeta: number;
  semanasSeguidasNaMeta: number;
  recomecos: number;
  diasLeves: number;
}

const DEF: Omit<Conquista, "atual" | "desbloqueada">[] = [
  { id: "primeiro-treino", nome: "Primeiro passo", descricao: "Termine seu primeiro treino", icone: "dumbbell", alvo: 1 },
  { id: "sessoes-10", nome: "10 treinos", descricao: "Termine 10 treinos", icone: "dumbbell", alvo: 10 },
  { id: "sessoes-25", nome: "25 treinos", descricao: "Termine 25 treinos", icone: "dumbbell", alvo: 25 },
  { id: "sessoes-50", nome: "50 treinos", descricao: "Termine 50 treinos", icone: "trophy", alvo: 50 },
  { id: "sessoes-100", nome: "100 treinos", descricao: "Termine 100 treinos", icone: "trophy", alvo: 100 },
  { id: "sequencia-3", nome: "Pegando ritmo", descricao: "3 dias seguidos", icone: "flame", alvo: 3 },
  { id: "sequencia-7", nome: "Semana inteira", descricao: "7 dias seguidos", icone: "flame", alvo: 7 },
  { id: "sequencia-14", nome: "Duas semanas", descricao: "14 dias seguidos", icone: "flame", alvo: 14 },
  { id: "sequencia-30", nome: "Mês de ferro", descricao: "30 dias seguidos", icone: "flame", alvo: 30 },
  { id: "sequencia-60", nome: "Hábito formado", descricao: "60 dias seguidos", icone: "flame", alvo: 60 },
  { id: "sequencia-100", nome: "Centena", descricao: "100 dias seguidos", icone: "star", alvo: 100 },
  { id: "semana-na-meta", nome: "Meta da semana", descricao: "Bata a meta semanal de treinos", icone: "calendar", alvo: 1 },
  { id: "semanas-4", nome: "4 semanas na meta", descricao: "Bata a meta 4 semanas seguidas", icone: "calendar", alvo: 4 },
  { id: "semanas-12", nome: "12 semanas na meta", descricao: "Bata a meta 12 semanas seguidas", icone: "calendar", alvo: 12 },
  { id: "volta-por-cima", nome: "Volta por cima", descricao: "Volte a treinar depois de 3+ dias parada", icone: "undo", alvo: 1 },
  { id: "dias-leves-5", nome: "Corpo em movimento", descricao: "Registre 5 dias leves", icone: "footprints", alvo: 5 },
];

function valorDaConquista(id: string, m: MetricasConquista): number {
  if (id === "primeiro-treino" || id.startsWith("sessoes-")) return m.sessoes;
  if (id.startsWith("sequencia-")) return m.recordeSequencia;
  if (id === "semana-na-meta") return m.semanasNaMeta;
  if (id.startsWith("semanas-")) return m.semanasSeguidasNaMeta;
  if (id === "volta-por-cima") return m.recomecos;
  if (id === "dias-leves-5") return m.diasLeves;
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
  sequencia: EstadoSequencia;
  semana: StatusSemana;
  semanasNaMeta: { total: number; seguidas: number };
  xp: ResumoXp;
  nivel: Nivel;
  conquistas: Conquista[];
  proxima: Conquista | null; // a conquista pendente mais perto de sair
  mensagem: MensagemMotivacional;
  totalSessoes: number;
}

export function calcularGamificacao(h: Historico, hojeISO: string, metaSemanal: number): Gamificacao {
  const atividade = atividadePorDia(h);
  const sequencia = calcularSequencia(atividade, hojeISO);
  const semana = statusSemana(atividade, sequencia.diasProtegidos, hojeISO, metaSemanal);
  const semanas = semanasNaMeta(atividade, hojeISO, metaSemanal);
  const xp = calcularXp(atividade, sequencia, hojeISO);
  const sessoes = sessoesConcluidasEm(h, "0000-00-00").length;
  const conquistas = avaliarConquistas({
    sessoes,
    recordeSequencia: sequencia.recorde,
    // a semana corrente que já bateu a meta também vale
    semanasNaMeta: semanas.total + (semana.batida ? 1 : 0),
    semanasSeguidasNaMeta: semanas.seguidas + (semana.batida ? 1 : 0),
    recomecos: sequencia.recomecos,
    diasLeves: Object.keys(h.diasLeves).length,
  });
  const proxima =
    conquistas
      .filter((c) => !c.desbloqueada)
      .sort((a, b) => b.atual / b.alvo - a.atual / a.alvo || a.alvo - b.alvo)[0] ?? null;
  return {
    sequencia,
    semana,
    semanasNaMeta: semanas,
    xp,
    nivel: nivelDoXp(xp.total),
    conquistas,
    proxima,
    mensagem: mensagemMotivacional({ sequencia, semana, sessoes }),
    totalSessoes: sessoes,
  };
}

// ===== Mensagens =====

export interface MensagemMotivacional {
  tom: "celebrar" | "empurrar" | "acolher" | "neutro";
  titulo: string;
  texto: string;
}

export function mensagemMotivacional({ sequencia, semana, sessoes }: { sequencia: EstadoSequencia; semana: StatusSemana; sessoes: number }): MensagemMotivacional {
  if (sessoes === 0 && !sequencia.hojeFeito) {
    return { tom: "empurrar", titulo: "Hoje começa a sequência", texto: "O primeiro treino é o mais importante. Faça nem que seja metade — aparecer já conta." };
  }
  if (sequencia.hojeFeito) {
    if (semana.batida) return { tom: "celebrar", titulo: "Meta da semana batida", texto: `${semana.diasDeForca} treinos esta semana. O que vier daqui é bônus.` };
    const n = sequencia.atual;
    return {
      tom: "celebrar",
      titulo: n >= 2 ? `${n} dias seguidos` : "Hoje está feito",
      texto: semana.faltam > 0 ? `Faltam ${semana.faltam} treino(s) para a meta da semana.` : "Descanse bem e volte amanhã.",
    };
  }
  // ainda não treinou hoje
  if (sequencia.diasParada >= DIAS_PARADA_PARA_RECOMECO) {
    return {
      tom: "acolher",
      titulo: "Bora recomeçar",
      texto: `Faz ${sequencia.diasParada} dias. Não precisa compensar nada: faça o treino de hoje, mesmo curto, e ganhe a conquista "Volta por cima".`,
    };
  }
  if (sequencia.atual > 0) {
    const proxEscudo = DIAS_PARA_ESCUDO - (sequencia.atual % DIAS_PARA_ESCUDO);
    return {
      tom: "empurrar",
      titulo: `Salve sua sequência de ${sequencia.atual} dias`,
      texto:
        sequencia.escudos > 0
          ? `Você tem ${sequencia.escudos} escudo(s) de reserva, mas o melhor escudo é treinar hoje. Faltam ${proxEscudo} dia(s) para ganhar mais um.`
          : `Treine hoje (ou registre um dia leve). Faltam ${proxEscudo} dia(s) para ganhar um escudo.`,
    };
  }
  if (!semana.possivel) {
    return { tom: "acolher", titulo: "Semana corrida? Tudo bem", texto: "A meta desta semana ficou difícil, mas cada treino conta. Foque em não zerar." };
  }
  return { tom: "empurrar", titulo: "Hoje é dia de treino", texto: `Faltam ${semana.faltam} para a meta da semana.` };
}
