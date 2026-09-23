import type { EstagioRIR } from "./descanso";
import type { SerieRegistrada } from "./tipos";

// Dupla progressão: dentro da faixa de reps do slot, primeiro sobe reps com a mesma carga;
// quando TODAS as séries batem o topo da faixa, sobe a carga e volta para o piso da faixa.
// Sem flag de composto/isolador no banco, o incremento é fixo (2,5 kg).
export const INCREMENTO_KG = 2.5;
const REDUCAO_FALHA = 0.05; // falhou o piso 2 sessões seguidas → -5%
const REDUCAO_DELOAD = 0.1; // deload: cargas -10% (mesma regra do aviso da HojePage)

export interface FaixaReps {
  min: number;
  max: number;
}

export interface SugestaoCarga {
  cargaKg: number | null;
  repsAlvo: string; // texto exibido ("6+", "8-12")
  repsPreencher: number; // valor numérico que o toque na sugestão coloca no campo de reps
  motivo: string;
}

// "6-9" → {6, 9}; "10-15 / 30-45 s" → {10, 15}; "12" → {12, 12}. Formatos sem número
// inicial (ou tempo puro como "10 x 3 s") não têm faixa de reps utilizável → null.
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

// Séries de trabalho de uma execução: as que têm carga e reps, na maior carga usada no dia
// (séries mais leves de aquecimento/back-off não decidem a progressão).
function seriesDeTrabalho(execucao: SerieRegistrada[]): { carga: number; reps: number[] } | null {
  const validas = execucao.filter((s) => s.cargaKg != null && s.cargaKg > 0 && s.reps != null && s.reps > 0);
  if (validas.length === 0) return null;
  const carga = Math.max(...validas.map((s) => s.cargaKg as number));
  return { carga, reps: validas.filter((s) => s.cargaKg === carga).map((s) => s.reps as number) };
}

function faixaTexto(f: FaixaReps): string {
  return f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`;
}

export function sugerirProximaCarga(
  repsSlot: string,
  ultima: SerieRegistrada[],
  anterior: SerieRegistrada[],
  estagio: EstagioRIR,
  isDeload: boolean,
): SugestaoCarga | null {
  const faixa = parseFaixaReps(repsSlot);
  if (!faixa) return null;

  const trabalho = seriesDeTrabalho(ultima);
  if (!trabalho) {
    return { cargaKg: null, repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: `sem histórico — escolha uma carga para RIR ${estagio.rirAlvo}` };
  }

  const { carga, reps } = trabalho;

  if (isDeload) {
    return { cargaKg: arredondar(carga * (1 - REDUCAO_DELOAD)), repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "deload: −10% e metade das séries" };
  }

  const falhouPiso = reps.some((r) => r < faixa.min);
  const bateuTopo = reps.every((r) => r >= faixa.max);

  if (falhouPiso) {
    const antes = seriesDeTrabalho(anterior);
    const falhouAntes = antes !== null && antes.carga === carga && antes.reps.some((r) => r < faixa.min);
    if (falhouAntes) {
      return { cargaKg: arredondar(carga * (1 - REDUCAO_FALHA)), repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "abaixo do piso 2× seguidas — reduzir 5%" };
    }
    return { cargaKg: carga, repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "ficou abaixo do piso — repetir a carga" };
  }

  // Sessões 1-2 no exercício: aprendizado motor, não sobe carga mesmo batendo o topo.
  if (estagio.sessoesFeitas < 2) {
    return { cargaKg: carga, repsAlvo: faixaTexto(faixa), repsPreencher: faixa.min, motivo: "aprendizado motor — repetir a carga" };
  }

  if (bateuTopo) {
    return { cargaKg: arredondar(carga + INCREMENTO_KG), repsAlvo: `${faixa.min}+`, repsPreencher: faixa.min, motivo: "bateu o topo da faixa — subir carga" };
  }

  const menorReps = Math.min(...reps);
  const alvo = Math.min(menorReps + 1, faixa.max);
  return { cargaKg: carga, repsAlvo: `${alvo}+`, repsPreencher: alvo, motivo: "mesma carga, buscar +1 rep" };
}
