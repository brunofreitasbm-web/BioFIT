import { EXERCICIOS_ASSISTIDOS } from "./exercicios";
import { historicoExercicio } from "./relatorio";
import type { NomeSegmento, RegistroCorpo, SerieRegistrada } from "./tipos";

// Leitura da composição corporal (bioimpedância). Funções puras: recebem as medições e o log
// de séries, então rodam igual no app e no servidor (MCP).
//
// Bioimpedância é ruidosa: hidratação, refeição e hora do dia mexem no peso e no % de gordura
// mais do que uma recomposição mexe em um mês. Por isso a análise (1) trabalha com tendência
// por data, não com a diferença entre duas medições, (2) usa massa magra/muscular e força como
// sinal principal, (3) declara "dentro do ruído" quando nada passou da faixa abaixo e
// (4) abaixa a confiança quando as medições foram feitas em horários muito diferentes.

// Faixas de ruído: ponto de partida (não medido nos seus dados). Variação total ajustada na
// janela abaixo disso é tratada como ruído.
export const RUIDO_GORDURA_PP = 1.5; // pontos percentuais de gordura
export const RUIDO_MASSA_MAGRA_KG = 1;
// Variação média de 1RM (%) a partir da qual a força conta como subindo/caindo.
export const LIMIAR_FORCA_PCT = 2;
export const JANELA_DIAS = 180;
export const MAX_LEITURAS = 6;
export const MIN_LEITURAS = 4;
export const MIN_SPAN_DIAS = 28;
export const LEMBRETE_DIAS = 14;
export const INTERVALO_LONGO_DIAS = 45;

export type PeriodoDia = "manha" | "tarde" | "noite";
export type Confianca = "alta" | "media" | "baixa";
export type Veredito =
  | "dados_insuficientes"
  | "inconclusivo"
  | "dentro_do_ruido"
  | "recomposicao_em_curso"
  | "ganho_de_massa"
  | "ganho_sem_retorno"
  | "alerta_perda_de_massa";

export const ordenarCorpo = (corpo: Record<string, RegistroCorpo>): RegistroCorpo[] =>
  Object.values(corpo).sort((a, b) => a.quando.localeCompare(b.quando));

const MS_DIA = 86_400_000;
const diaAbsoluto = (iso: string) => Math.floor(new Date(`${iso.slice(0, 10)}T12:00:00Z`).getTime() / MS_DIA);
export const diasEntre = (de: string, ate: string) => diaAbsoluto(ate) - diaAbsoluto(de);

export function periodoDoDia(quando: string): PeriodoDia {
  const hora = Number(quando.slice(11, 13));
  return hora < 11 ? "manha" : hora < 18 ? "tarde" : "noite";
}

export interface Tendencia {
  porMes: number;
  variacao: number; // mudança ajustada ao longo do intervalo coberto
  n: number;
  spanDias: number;
}

// Regressão linear por data (dias), não por posição: as medições são irregulares.
export function tendencia(pontos: { dia: number; v: number }[]): Tendencia | null {
  const n = pontos.length;
  if (n < 2) return null;
  const x0 = Math.min(...pontos.map((p) => p.dia));
  const xs = pontos.map((p) => p.dia - x0);
  const spanDias = Math.max(...xs);
  if (spanDias === 0) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = pontos.reduce((a, p) => a + p.v, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (pontos[i].v - my), 0);
  const porDia = sxy / sxx;
  return { porMes: porDia * 30, variacao: porDia * spanDias, n, spanDias };
}

type Metrica = "pesoKg" | "gorduraPct" | "massaGordaKg" | "massaLivreKg" | "musculoEsqueleticoKg";

function tendenciaDe(regs: RegistroCorpo[], campo: Metrica): Tendencia | null {
  const pontos = regs.flatMap((r) => (r[campo] == null ? [] : [{ dia: diaAbsoluto(r.data), v: r[campo] as number }]));
  return tendencia(pontos);
}

export interface VariacaoForca {
  variacaoMediaPct: number;
  exercicios: number;
}

// Variação média do melhor 1RM por exercício entre a primeira e a última sessão dentro da
// janela. Exercícios com menos de 2 sessões na janela e o assistido (menos carga = melhor)
// ficam de fora. Menos de 3 exercícios: sem base para falar de força.
export function variacaoForcaNaJanela(log: SerieRegistrada[], inicio: string, fim: string): VariacaoForca | null {
  const ids = new Set(log.filter((s) => s.data >= inicio && s.data <= fim).map((s) => s.exercicioId));
  const variacoes: number[] = [];
  for (const id of ids) {
    if (EXERCICIOS_ASSISTIDOS.has(id)) continue;
    const hist = historicoExercicio(id, log).filter((p) => p.data >= inicio && p.data <= fim);
    if (hist.length < 2 || hist[0].melhor1RM <= 0) continue;
    variacoes.push(((hist[hist.length - 1].melhor1RM - hist[0].melhor1RM) / hist[0].melhor1RM) * 100);
  }
  if (variacoes.length < 3) return null;
  return { variacaoMediaPct: variacoes.reduce((a, b) => a + b, 0) / variacoes.length, exercicios: variacoes.length };
}

export interface AnaliseCorpo {
  veredito: Veredito;
  // Quando o veredito vira "inconclusivo" (confiança baixa + intervalo longo), guarda o que a
  // conta diria, só como pista: o app e o Claude não devem tratá-lo como conclusão.
  leituraProvisoria: Veredito | null;
  confianca: Confianca;
  leituras: number;
  periodo: { inicio: string; fim: string } | null;
  diasDesdeUltima: number | null;
  porMes: Partial<Record<Metrica, number>>;
  variacao: Partial<Record<Metrica, number>>;
  forca: VariacaoForca | null;
  horarios: Record<PeriodoDia, number>;
  avisos: string[];
  explicacao: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function analisarCorpo(
  todas: RegistroCorpo[],
  opcoes: { hoje: string; log: SerieRegistrada[] },
): AnaliseCorpo {
  const { hoje, log } = opcoes;
  const ordenadas = [...todas].sort((a, b) => a.quando.localeCompare(b.quando));
  const limite = new Date(diaAbsoluto(hoje) * MS_DIA - JANELA_DIAS * MS_DIA).toISOString().slice(0, 10);
  const regs = ordenadas.filter((r) => r.data >= limite && r.data <= hoje).slice(-MAX_LEITURAS);

  const horarios: Record<PeriodoDia, number> = { manha: 0, tarde: 0, noite: 0 };
  for (const r of regs) horarios[periodoDoDia(r.quando)]++;
  const ultima = ordenadas.length ? ordenadas[ordenadas.length - 1] : null;
  const diasDesdeUltima = ultima ? diasEntre(ultima.data, hoje) : null;

  const avisos: string[] = [];
  let maiorIntervalo = 0;
  if (diasDesdeUltima !== null && diasDesdeUltima > LEMBRETE_DIAS) {
    avisos.push(`Última medição há ${diasDesdeUltima} dias.`);
  }
  for (let i = 1; i < regs.length; i++) {
    const salto = diasEntre(regs[i - 1].data, regs[i].data);
    maiorIntervalo = Math.max(maiorIntervalo, salto);
    if (salto > INTERVALO_LONGO_DIAS) {
      avisos.push(`Intervalo de ${salto} dias sem medição (${regs[i - 1].data} a ${regs[i].data}).`);
    }
  }
  const dominante = Math.max(horarios.manha, horarios.tarde, horarios.noite);
  const parteDominante = regs.length ? dominante / regs.length : 1;
  if (regs.length >= 2 && parteDominante < 0.6) {
    avisos.push(
      `Medições em horários muito diferentes (manhã ${horarios.manha}, tarde ${horarios.tarde}, noite ${horarios.noite}): a água corporal muda o peso em 1 a 2 kg ao longo do dia. Meça sempre no mesmo período, de preferência de manhã e em jejum.`,
    );
  }

  const base = {
    leituras: regs.length,
    periodo: regs.length ? { inicio: regs[0].data, fim: regs[regs.length - 1].data } : null,
    diasDesdeUltima,
    horarios,
    avisos,
  };

  const span = regs.length >= 2 ? diasEntre(regs[0].data, regs[regs.length - 1].data) : 0;
  const metricas: Metrica[] = ["pesoKg", "gorduraPct", "massaGordaKg", "massaLivreKg", "musculoEsqueleticoKg"];
  const porMes: AnaliseCorpo["porMes"] = {};
  const variacao: AnaliseCorpo["variacao"] = {};
  const tend: Partial<Record<Metrica, Tendencia>> = {};
  for (const m of metricas) {
    const t = tendenciaDe(regs, m);
    if (!t) continue;
    tend[m] = t;
    porMes[m] = r2(t.porMes);
    variacao[m] = r2(t.variacao);
  }

  if (regs.length < MIN_LEITURAS || span < MIN_SPAN_DIAS) {
    return {
      ...base,
      veredito: "dados_insuficientes",
      leituraProvisoria: null,
      confianca: "baixa",
      porMes,
      variacao,
      forca: null,
      explicacao: `São precisas pelo menos ${MIN_LEITURAS} medições cobrindo ${MIN_SPAN_DIAS} dias ou mais; há ${regs.length}, cobrindo ${span} dias.`,
    };
  }

  const forca = variacaoForcaNaJanela(log, regs[0].data, hoje);
  const dGordura = variacao.gorduraPct ?? 0;
  const dMagra = variacao.massaLivreKg ?? 0;
  const dPeso = variacao.pesoKg ?? 0;
  const magraSobe = dMagra > RUIDO_MASSA_MAGRA_KG;
  const magraCai = dMagra < -RUIDO_MASSA_MAGRA_KG;
  const gorduraSobe = dGordura > RUIDO_GORDURA_PP;
  const gorduraCai = dGordura < -RUIDO_GORDURA_PP;
  const forcaSobe = forca !== null && forca.variacaoMediaPct >= LIMIAR_FORCA_PCT;
  const forcaCai = forca !== null && forca.variacaoMediaPct <= -LIMIAR_FORCA_PCT;

  let veredito: Veredito;
  let explicacao: string;
  if (magraCai && (forcaCai || forca === null)) {
    veredito = "alerta_perda_de_massa";
    explicacao = `Massa livre de gordura caiu ${r1(-dMagra)} kg na tendência${forcaCai ? " e a força também caiu" : " (sem dados de força para confirmar)"}.`;
  } else if (gorduraSobe && !magraSobe) {
    veredito = "ganho_sem_retorno";
    explicacao = `Gordura subiu ${r1(dGordura)} pp na tendência sem ganho claro de massa magra.`;
  } else if (magraSobe && gorduraSobe) {
    veredito = "ganho_de_massa";
    explicacao = `Massa magra subiu ${r1(dMagra)} kg, junto com ${r1(dGordura)} pp de gordura.`;
  } else if (gorduraCai && !magraCai && !forcaCai) {
    veredito = "recomposicao_em_curso";
    explicacao = `Gordura caiu ${r1(-dGordura)} pp com massa magra ${magraSobe ? `subindo ${r1(dMagra)} kg` : "estável"}${forcaSobe ? " e força subindo" : forca ? " e força estável" : ""}.`;
  } else if (magraSobe && !gorduraSobe && !forcaCai) {
    veredito = "recomposicao_em_curso";
    explicacao = `Massa magra subiu ${r1(dMagra)} kg com gordura estável${forcaSobe ? " e força subindo" : ""}.`;
  } else {
    veredito = "dentro_do_ruido";
    explicacao = `Peso ${dPeso >= 0 ? "+" : ""}${r1(dPeso)} kg, gordura ${dGordura >= 0 ? "+" : ""}${r1(dGordura)} pp e massa magra ${dMagra >= 0 ? "+" : ""}${r1(dMagra)} kg: tudo dentro da faixa de ruído da bioimpedância.`;
  }

  let confianca: Confianca = regs.length >= MAX_LEITURAS && span >= 56 && parteDominante >= 0.6 ? "alta" : "media";
  if (parteDominante < 0.6 || forca === null) confianca = confianca === "alta" ? "media" : "baixa";

  // Um buraco grande entre medições, somado a confiança baixa, deixa a tendência na mão de um
  // ou dois pontos: um veredito direcional (ainda mais em vermelho) assustaria sem base.
  let leituraProvisoria: Veredito | null = null;
  if (confianca === "baixa" && maiorIntervalo > INTERVALO_LONGO_DIAS && veredito !== "dentro_do_ruido") {
    leituraProvisoria = veredito;
    veredito = "inconclusivo";
    explicacao = `Inconclusivo: confiança baixa e ${maiorIntervalo} dias sem medir dentro da janela, então a tendência depende de poucos pontos. Sinal provisório: ${explicacao}`;
  }

  return { ...base, veredito, leituraProvisoria, confianca, porMes, variacao, forca, explicacao };
}

export const NOMES_SEGMENTO: Record<NomeSegmento, string> = {
  bracoDireito: "Braço direito",
  bracoEsquerdo: "Braço esquerdo",
  tronco: "Tronco",
  pernaDireita: "Perna direita",
  pernaEsquerda: "Perna esquerda",
};

// Massa magra por segmento: última medição e mudança contra a primeira da lista.
export function resumoSegmentos(regs: RegistroCorpo[]) {
  const com = regs.filter((r) => r.segmentos);
  if (com.length === 0) return null;
  const primeira = com[0];
  const ultima = com[com.length - 1];
  return (Object.keys(NOMES_SEGMENTO) as NomeSegmento[]).map((s) => {
    const atual = ultima.segmentos![s];
    const antes = primeira.segmentos![s];
    return {
      segmento: s,
      nome: NOMES_SEGMENTO[s],
      massaMagraKg: atual.massaMagraKg,
      massaGordaKg: atual.massaGordaKg,
      variacaoMassaMagraKg:
        com.length > 1 && atual.massaMagraKg != null && antes.massaMagraKg != null ? r2(atual.massaMagraKg - antes.massaMagraKg) : null,
    };
  });
}
