import { arred, ehNum, limitar, media, somarDiasIso, zscore } from "./estatistica";
import type { DiaRecuperacao } from "./tipos";

// Prontidão BioFIT (0–100): quanto o corpo está pronto para um treino pesado hoje.
//
// Cada componente vira uma nota de 0 a 100 contra a LINHA DE BASE PESSOAL (até 60 dias antes),
// não contra uma tabela populacional: 42 ms de VFC é ótimo para um e ruim para outro.
// O score é a média ponderada dos componentes que existem no dia, com os pesos renormalizados.
// A diferença para o "Training Readiness" da Garmin é, em si, um dado: quando divergem, um dos
// dois está vendo algo que o outro não vê.

// Ajuste aqui conforme o que o senhor observa no próprio corpo. A soma não precisa dar 1.
export const PESOS_PADRAO = {
  hrv: 0.3, // o sinal mais sensível ao estado autonômico
  fcRepouso: 0.2,
  sono: 0.25,
  bodyBattery: 0.15,
  carga: 0.1, // carga dos últimos 3 dias contra o habitual
} as const;

export type ChaveComponente = keyof typeof PESOS_PADRAO;
export type Pesos = Record<ChaveComponente, number>;

export interface ComponenteProntidao {
  chave: ChaveComponente;
  rotulo: string;
  nota: number; // 0–100
  peso: number; // já renormalizado
  detalhe: string;
}

export type Recomendacao = "pesado" | "moderado" | "leve" | "recuperar";

export interface Prontidao {
  data: string;
  score: number | null;
  componentes: ComponenteProntidao[];
  recomendacao: Recomendacao | null;
  texto: string;
  diasDeBase: number; // dias de VFC na linha de base: confiança sobe com isso
  confianca: "baixa" | "media" | "alta";
}

const JANELA_BASE_DIAS = 60;

export function recomendacaoDe(score: number): Recomendacao {
  return score >= 75 ? "pesado" : score >= 55 ? "moderado" : score >= 35 ? "leve" : "recuperar";
}

const TEXTOS: Record<Recomendacao, string> = {
  pesado: "Seu corpo está bem recuperado: pode treinar com intensidade cheia e cargas altas.",
  moderado: "Boa recuperação: faça seu treino normalmente no ritmo planejado.",
  leve: "Recuperação moderada: reduza um pouco o volume e guarde 2 a 3 repetições de reserva antes da falha.",
  recuperar: "Corpo cansado: priorize descanso, boa noite de sono e no máximo caminhada leve.",
};

// Neutro (no seu normal) = 70: um dia comum cai em "moderado"; só acima do normal chega a "pesado".
const notaZ = (z: number, sinal: 1 | -1 = 1) => limitar(70 + sinal * z * 20);

function baseAnterior(dias: DiaRecuperacao[], data: string, campo: (d: DiaRecuperacao) => number | null) {
  const ini = somarDiasIso(data, -JANELA_BASE_DIAS);
  return dias.filter((d) => d.data >= ini && d.data < data).map(campo);
}

function notaSono(d: DiaRecuperacao): { nota: number; detalhe: string } | null {
  if (!ehNum(d.sonoMin)) return ehNum(d.sonoScore) ? { nota: d.sonoScore, detalhe: `Nota Garmin: ${d.sonoScore}/100` } : null;
  const duracao = limitar(d.sonoMin / 480, 0, 1); // meta de 8 h
  const horas = arred(d.sonoMin / 60);
  if (ehNum(d.sonoProfundoMin) && ehNum(d.sonoRemMin)) {
    const restaurador = (d.sonoProfundoMin + d.sonoRemMin) / d.sonoMin; // alvo ≈ 40%
    const qualidade = limitar(restaurador / 0.4, 0, 1);
    return {
      nota: Math.round(100 * (0.6 * duracao + 0.4 * qualidade)),
      detalhe: `${horas} h de sono (${Math.round(restaurador * 100)}% de sono reparador)`,
    };
  }
  return { nota: Math.round(100 * duracao), detalhe: `${horas} h de sono` };
}

// `carga72` vem de carga.ts (carga72Relativa). 1 = habitual; ≥ 2 = o dobro do normal.
export function calcularProntidao(
  dias: DiaRecuperacao[],
  data: string,
  opcoes: { carga72?: number | null; pesos?: Pesos } = {},
): Prontidao {
  const dia = dias.find((d) => d.data === data);
  const pesos = opcoes.pesos ?? PESOS_PADRAO;
  const brutos: Omit<ComponenteProntidao, "peso">[] = [];

  if (dia) {
    const baseHrv = baseAnterior(dias, data, (d) => d.hrvMs);
    const zHrv = zscore(dia.hrvMs, baseHrv);
    if (zHrv !== null) {
      const situacao = zHrv >= 0.5 ? "acima do habitual" : zHrv >= -0.5 ? "no padrão normal" : "abaixo do habitual";
      brutos.push({ chave: "hrv", rotulo: "VFC", nota: Math.round(notaZ(zHrv)), detalhe: `${dia.hrvMs} ms (${situacao})` });
    } else if (ehNum(dia.hrvMs) && ehNum(dia.hrvMediaSemanal) && dia.hrvMediaSemanal > 0) {
      const razao = dia.hrvMs / dia.hrvMediaSemanal;
      brutos.push({
        chave: "hrv",
        rotulo: "VFC",
        nota: Math.round(limitar(70 + (razao - 1) * 250)),
        detalhe: `${dia.hrvMs} ms (média da semana: ${dia.hrvMediaSemanal} ms)`,
      });
    }

    const zFc = zscore(dia.fcRepouso, baseAnterior(dias, data, (d) => d.fcRepouso));
    if (zFc !== null) {
      const situacaoFc = zFc <= 0 ? "ritmo tranquilo" : "um pouco acelerado";
      brutos.push({ chave: "fcRepouso", rotulo: "FC de repouso", nota: Math.round(notaZ(zFc, -1)), detalhe: `${dia.fcRepouso} bpm (${situacaoFc})` });
    }

    const sono = notaSono(dia);
    if (sono) brutos.push({ chave: "sono", rotulo: "Sono", nota: Math.round(sono.nota), detalhe: sono.detalhe });

    if (ehNum(dia.bodyBatteryAcordar)) {
      brutos.push({ chave: "bodyBattery", rotulo: "Body Battery", nota: dia.bodyBatteryAcordar, detalhe: `${dia.bodyBatteryAcordar}/100 de energia ao acordar` });
    }
  }

  if (ehNum(opcoes.carga72)) {
    const r = opcoes.carga72;
    // até 1,0 do habitual = 100; 1,5 = 50; ≥ 2,0 = 0
    brutos.push({ chave: "carga", rotulo: "Carga 72 h", nota: Math.round(limitar(100 - (r - 1) * 100)), detalhe: `${arred(r, 1)}× o cansaço habitual recente` });
  }

  const diasDeBase = baseAnterior(dias, data, (d) => d.hrvMs).filter(ehNum).length;
  const confianca = diasDeBase >= 30 ? "alta" : diasDeBase >= 14 ? "media" : "baixa";

  const somaPesos = brutos.reduce((a, c) => a + pesos[c.chave], 0);
  if (brutos.length === 0 || somaPesos <= 0) {
    return { data, score: null, componentes: [], recomendacao: null, texto: "Sem dados suficientes.", diasDeBase, confianca };
  }
  const componentes = brutos.map((c) => ({ ...c, peso: pesos[c.chave] / somaPesos }));
  const score = Math.round(componentes.reduce((a, c) => a + c.nota * c.peso, 0));
  const recomendacao = recomendacaoDe(score);
  return { data, score, componentes, recomendacao, texto: TEXTOS[recomendacao], diasDeBase, confianca };
}

// Prontidão de cada dia da lista (para o gráfico e para comparar com a da Garmin).
export function serieProntidao(
  dias: DiaRecuperacao[],
  carga72PorDia?: (data: string) => number | null,
): Prontidao[] {
  return dias.map((d) => calcularProntidao(dias, d.data, { carga72: carga72PorDia?.(d.data) }));
}

// Média das diferenças (BioFIT − Garmin) nos dias em que os dois existem.
export function divergenciaComGarmin(dias: DiaRecuperacao[], serie: Prontidao[]): { n: number; mediaDif: number | null } {
  const difs: number[] = [];
  serie.forEach((p, i) => {
    const g = dias[i]?.prontidaoGarmin;
    if (p.score !== null && ehNum(g)) difs.push(p.score - g);
  });
  const m = media(difs);
  return { n: difs.length, mediaDif: m === null ? null : arred(m) };
}
