import { analisarCorpo, diasEntre, resumoSegmentos, variacaoForcaNaJanela } from "../corpo";
import { contextoBioimpedancia, getMedicoes, type MedicaoBioimpedancia } from "../bioimpedancia";
import { toISODate } from "../program";
import { calcularVolumePorGrupo, evolucaoRecente } from "../relatorio";
import { getLog } from "../storage";
import type { RegistroCorpo, SerieRegistrada } from "../tipos";
import type {
  BioimpedanciaContexto,
  CruzamentoIntervalo,
  ContextoTreinoIA,
  GarminDia,
  GarminJanela,
  TreinoRecenteContexto,
} from "./prompts";

// Junta bioimpedância, treino e Garmin num contexto só para o Coach. A ideia é entregar ao
// modelo o que ele não consegue ver sozinho: (1) a leitura de tendência já calculada pelo app,
// com confiança e avisos de ruído, e (2) o que aconteceu entre cada par de medições (treino,
// sono, FC de repouso, passos), para ele ligar causa e efeito em vez de olhar números soltos.

const r1 = (n: number) => Math.round(n * 10) / 10;
const JANELA_TREINO_DIAS = 28;
const JANELA_FORCA_DIAS = 90;
const MAX_INTERVALOS = 4;

function media(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? r1(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

const delta = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null ? null : r1(a - b);

const preenchida = (s: SerieRegistrada) => s.cargaKg !== null || s.reps !== null;

function somarDias(iso: string, dias: number): string {
  return toISODate(new Date(new Date(`${iso}T12:00:00`).getTime() + dias * 86_400_000));
}

// ===== Decisão sua: o que conta como medição suspeita =====
//
// Bioimpedância mistura mudança real com hidratação, refeição e hora do dia. Esta função diz ao
// modelo quando uma medição parece mais artefato do que mudança de composição, para ele não
// montar uma conclusão em cima de um ponto ruim. Devolva o motivo em uma frase, ou null.
//
// Exemplo real dos seus dados: 17/05 (21:41) tinha 19,0% de gordura e 67,8 kg de massa magra;
// 17 dias depois, 03/06 (17:09), 22,9% e 64,4 kg, com água corporal 2,5 L menor. Gordura não
// sobe 3,9 p.p. em 17 dias: isso é leitura, não corpo.
export function suspeitaArtefato(
  anterior: MedicaoBioimpedancia,
  atual: MedicaoBioimpedancia,
  diasEntreMedicoes: number,
): string | null {
  // TODO(human): defina o critério. Considere o salto de gordura (p.p.) e de massa magra (kg)
  // em relação ao intervalo em dias, a diferença de água corporal e a diferença de horário.
  void anterior;
  void atual;
  void diasEntreMedicoes;
  return null;
}

// ===== Bioimpedância =====

// Só entram na análise de tendência medições com hora conhecida: a análise penaliza horários
// misturados e inventar uma hora para o histórico antigo falsearia isso.
function registrosParaAnalise(medicoes: MedicaoBioimpedancia[]): RegistroCorpo[] {
  return medicoes
    .filter((m) => m.hora && m.pesoKg != null)
    .map((m) => {
      const s = m.massaMagraSegmentar;
      const seg = (kg: number | undefined) => ({ massaMagraKg: kg ?? null, massaGordaKg: null });
      return {
        chave: `bio:${m.data}`,
        fonte: "avanutri" as const,
        data: m.data,
        quando: `${m.data}T${m.hora}`,
        pesoKg: m.pesoKg!,
        gorduraPct: m.gorduraPct,
        massaGordaKg: m.massaGorduraKg ?? null,
        massaLivreKg: m.massaMagraKg,
        musculoEsqueleticoKg: m.massaMuscularEsqueleticaKg,
        aguaTotalL: m.aguaCorporalL ?? null,
        aguaIntraL: null,
        aguaExtraL: null,
        gorduraVisceral: m.gorduraVisceral,
        imc: m.imc ?? null,
        proteinaKg: null,
        mineraisKg: null,
        tmbKcal: m.tmbKcal,
        idadeMetabolica: m.idadeMetabolica,
        segmentos: s
          ? {
              bracoDireito: seg(s.bracoDireitoKg),
              bracoEsquerdo: seg(s.bracoEsquerdoKg),
              tronco: seg(s.troncoKg),
              pernaDireita: seg(s.pernaDireitaKg),
              pernaEsquerda: seg(s.pernaEsquerdaKg),
            }
          : null,
        registradoEm: m.data,
      };
    });
}

export function bioimpedanciaIntegrada(hoje: string, log: SerieRegistrada[]): BioimpedanciaContexto | null {
  const base = contextoBioimpedancia();
  if (!base) return null;
  const medicoes = getMedicoes();

  const suspeitas = new Map<string, string>();
  for (let i = 1; i < medicoes.length; i++) {
    const motivo = suspeitaArtefato(medicoes[i - 1], medicoes[i], diasEntre(medicoes[i - 1].data, medicoes[i].data));
    if (motivo) suspeitas.set(medicoes[i].data, motivo);
  }

  const regs = registrosParaAnalise(medicoes);
  const a = regs.length ? analisarCorpo(regs, { hoje, log }) : null;
  const naJanela = a?.periodo ? regs.filter((r) => r.data >= a.periodo!.inicio && r.data <= a.periodo!.fim) : [];
  const segmentos = resumoSegmentos(naJanela);

  return {
    ...base,
    historico: medicoes.map((m) => ({
      data: m.data,
      hora: m.hora,
      pesoKg: m.pesoKg,
      gorduraPct: m.gorduraPct,
      massaGorduraKg: m.massaGorduraKg ?? null,
      massaMagraKg: m.massaMagraKg,
      gorduraVisceral: m.gorduraVisceral,
      suspeita: suspeitas.get(m.data) ?? null,
    })),
    analise: a
      ? {
          veredito: a.veredito,
          leituraProvisoria: a.leituraProvisoria,
          confianca: a.confianca,
          leituras: a.leituras,
          periodo: a.periodo,
          explicacao: a.explicacao,
          avisos: a.avisos,
          porMes: a.porMes as Record<string, number>,
          forcaVariacaoPct: a.forca ? r1(a.forca.variacaoMediaPct) : null,
        }
      : null,
    segmentos: segmentos?.map((s) => ({
      nome: s.nome,
      massaMagraKg: s.massaMagraKg,
      variacaoMassaMagraKg: s.variacaoMassaMagraKg,
    })),
  };
}

// ===== Treino =====

export function treinoRecente(hoje: string, log: SerieRegistrada[]): TreinoRecenteContexto | null {
  const hojeData = new Date(`${hoje}T12:00:00`);
  const inicio = somarDias(hoje, -JANELA_TREINO_DIAS + 1);
  const naJanela = log.filter((s) => s.data >= inicio && s.data <= hoje && preenchida(s));
  if (naJanela.length === 0) return null;

  const semanas = JANELA_TREINO_DIAS / 7;
  const dias = new Set(naJanela.map((s) => s.data));
  const forca = variacaoForcaNaJanela(log, somarDias(hoje, -JANELA_FORCA_DIAS), hoje);

  return {
    janelaDias: JANELA_TREINO_DIAS,
    treinosPorSemana: r1(dias.size / semanas),
    seriesPorSemana: calcularVolumePorGrupo(JANELA_TREINO_DIAS, hojeData, log)
      .filter((v) => v.seriesFeitas > 0)
      .slice(0, 8)
      .map((v) => ({ grupo: v.grupo, series: r1(v.seriesFeitas / semanas) })),
    forcaVariacaoPct: forca ? r1(forca.variacaoMediaPct) : null,
    evolucao: evolucaoRecente(6, log).map((e) => ({
      nome: e.nome,
      anterior1RM: r1(e.anterior1RM),
      atual1RM: r1(e.atual1RM),
      variacaoPct: r1(e.variacaoPct),
    })),
  };
}

// ===== Cruzamento por intervalo =====

export function cruzarIntervalos(
  medicoes: MedicaoBioimpedancia[],
  log: SerieRegistrada[],
  garmin: GarminJanela | null,
  max = MAX_INTERVALOS,
): CruzamentoIntervalo[] {
  const out: CruzamentoIntervalo[] = [];
  for (let i = Math.max(1, medicoes.length - max); i < medicoes.length; i++) {
    const a = medicoes[i - 1];
    const b = medicoes[i];
    const dias = diasEntre(a.data, b.data);
    if (dias <= 0) continue;
    const semanas = dias / 7;
    const series = log.filter((s) => s.data > a.data && s.data <= b.data && preenchida(s));
    const noGarmin: GarminDia[] = (garmin?.diario ?? []).filter((d) => d.data > a.data && d.data <= b.data);

    out.push({
      de: a.data,
      ate: b.data,
      dias,
      delta: {
        pesoKg: delta(b.pesoKg, a.pesoKg),
        gorduraPp: delta(b.gorduraPct, a.gorduraPct),
        massaMagraKg: delta(b.massaMagraKg, a.massaMagraKg),
      },
      treino: {
        treinosPorSemana: r1(new Set(series.map((s) => s.data)).size / semanas),
        seriesPorSemana: r1(series.length / semanas),
      },
      garmin: noGarmin.length
        ? {
            diasComDados: noGarmin.length,
            sonoHoras: media(noGarmin.map((d) => d.sonoHoras)),
            fcRepouso: media(noGarmin.map((d) => d.fcRepouso)),
            hrvMs: media(noGarmin.map((d) => d.hrvMs)),
            passos: media(noGarmin.map((d) => d.passos)),
          }
        : null,
    });
  }
  return out;
}

// ===== Entrada única =====

// Tudo o que o Coach recebe além do contexto da sessão. Roda no navegador (lê o storage local).
export function contextoIntegrado(
  garmin: GarminJanela | null,
  hoje: string = toISODate(new Date()),
): Pick<ContextoTreinoIA, "bioimpedancia" | "treinoRecente" | "garminJanela" | "cruzamentos"> {
  const log = getLog();
  return {
    bioimpedancia: bioimpedanciaIntegrada(hoje, log),
    treinoRecente: treinoRecente(hoje, log),
    garminJanela: garmin,
    cruzamentos: cruzarIntervalos(getMedicoes(), log, garmin),
  };
}
