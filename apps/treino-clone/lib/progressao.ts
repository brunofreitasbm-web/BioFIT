import type { SerieRegistrada } from "./tipos";

// Dupla progressão (aba "Guia"): dentro da faixa de reps, primeiro sobe reps com a mesma
// carga; quando TODAS as séries batem o topo da faixa, sobe a carga na próxima exposição —
// menor incremento disponível no superior, +5% no inferior — e volta para o piso da faixa.
export const INCREMENTO_SUPERIOR_KG = 2.5;
const INCREMENTO_INFERIOR = 0.05;
const REDUCAO_FALHA = 0.05; // falhou o piso 2 exposições seguidas → -5%
const REDUCAO_DELOAD = 0.1; // deload: carga -10%

export interface FaixaReps {
  min: number;
  max: number;
}

export interface SugestaoCarga {
  cargaKg: number;
  repsAlvo: string; // texto exibido ("6+", "8-12")
  repsPreencher: number; // valor numérico que o toque na sugestão coloca no campo de reps
  motivo: string;
}

export interface OpcoesProgressao {
  inferior: boolean; // membros inferiores: +5% em vez do incremento fixo
  assistencia: boolean; // Graviton: o número é a ASSISTÊNCIA, progredir = descer
}

// "6-9" → {6, 9}; "12" → {12, 12}. Faixas em segundos ("30-45 s/lado") não têm
// progressão de carga → null.
export function parseFaixaReps(reps: string): FaixaReps | null {
  const faixa = reps.match(/^\s*(\d+)\s*-\s*(\d+)(?!\d)(?!\s*s\b)/);
  if (faixa) return { min: Number(faixa[1]), max: Number(faixa[2]) };
  const unico = reps.match(/^\s*(\d+)\s*$/);
  if (unico) return { min: Number(unico[1]), max: Number(unico[1]) };
  return null;
}

// Arredonda para o passo de 0,5 kg usado nos inputs de carga.
function arredondar(kg: number): number {
  return Math.round(kg * 2) / 2;
}

// Séries de trabalho de uma execução: as que têm carga e reps, na carga "mais difícil" do dia
// (maior carga; no Graviton, menor assistência).
function seriesDeTrabalho(execucao: SerieRegistrada[], assistencia: boolean): { carga: number; reps: number[] } | null {
  const validas = execucao.filter((s) => s.cargaKg != null && s.cargaKg > 0 && s.reps != null && s.reps > 0);
  if (validas.length === 0) return null;
  const cargas = validas.map((s) => s.cargaKg as number);
  const carga = assistencia ? Math.min(...cargas) : Math.max(...cargas);
  return { carga, reps: validas.filter((s) => s.cargaKg === carga).map((s) => s.reps as number) };
}

function faixaTexto(f: FaixaReps): string {
  return f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`;
}

// Sem histórico do exercício não há sugestão: vale a "Partida (kg)" da planilha.
export function sugerirProximaCarga(
  repsSlot: string,
  ultima: SerieRegistrada[],
  anterior: SerieRegistrada[],
  opcoes: OpcoesProgressao,
  isDeload: boolean,
): SugestaoCarga | null {
  const faixa = parseFaixaReps(repsSlot);
  if (!faixa) return null;
  const trabalho = seriesDeTrabalho(ultima, opcoes.assistencia);
  if (!trabalho) return null;

  const { carga, reps } = trabalho;
  // Para o Graviton, "mais carga" = menos assistência: os ajustes mudam de sinal.
  const sinal = opcoes.assistencia ? -1 : 1;

  if (isDeload) {
    return {
      cargaKg: arredondar(carga * (1 - sinal * REDUCAO_DELOAD)),
      repsAlvo: faixaTexto(faixa),
      repsPreencher: faixa.min,
      motivo: "deload: −10% e metade das séries, longe da falha",
    };
  }

  const falhouPiso = reps.some((r) => r < faixa.min);
  const bateuTopo = reps.every((r) => r >= faixa.max);

  if (falhouPiso) {
    const antes = seriesDeTrabalho(anterior, opcoes.assistencia);
    const falhouAntes = antes !== null && antes.carga === carga && antes.reps.some((r) => r < faixa.min);
    if (falhouAntes) {
      return { cargaKg: arredondar(carga * (1 - sinal * REDUCAO_FALHA)), repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "abaixo do piso 2× seguidas — aliviar 5%" };
    }
    return { cargaKg: carga, repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "ficou abaixo do piso — repetir a carga" };
  }

  if (bateuTopo) {
    const incremento = opcoes.inferior ? Math.max(0.5, arredondar(carga * INCREMENTO_INFERIOR)) : INCREMENTO_SUPERIOR_KG;
    return {
      cargaKg: Math.max(0, arredondar(carga + sinal * incremento)),
      repsAlvo: `${faixa.min}+`,
      repsPreencher: faixa.min,
      motivo: opcoes.assistencia ? "bateu o topo da faixa — descer a assistência" : "bateu o topo da faixa — subir carga",
    };
  }

  const menorReps = Math.min(...reps);
  const alvo = Math.min(menorReps + 1, faixa.max);
  return { cargaKg: carga, repsAlvo: `${alvo}+`, repsPreencher: alvo, motivo: "mesma carga, buscar +1 rep" };
}
