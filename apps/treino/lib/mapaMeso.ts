import { RODADA_DELOAD, SESSOES_POR_MESO, SESSOES_POR_RODADA } from "./program";

export type EstadoCelula = "feita" | "daVez" | "pendente";

export interface CelulaMapa {
  estado: EstadoCelula;
  dia: string | null; // dia do mês (DD) em que a sessão foi feita
}

// Dia (DD) de cada sessão do meso `meso`, na ordem em que foram feitas. `datas` são as datas das
// sessões concluídas depois de DATA_FIM_MESO_1, em ordem; a j-ésima é a sessão 25 + j do programa
// (as 25 anteriores formam o meso 1 encerrado), então cai no meso floor((25 + j) / 25) + 1.
// Antes do corte não há sessões do meso 1 aqui: o mapa de um meso 1 fica sem dias.
export function diasDoMeso(meso: number, datas: string[]): string[] {
  const dias: string[] = [];
  datas.forEach((data, j) => {
    const indice = SESSOES_POR_MESO + j;
    if (Math.floor(indice / SESSOES_POR_MESO) + 1 === meso) dias.push(data.slice(8, 10));
  });
  return dias;
}

// Grade rodadas × sessões. `concluidasNoMeso` é a posição dentro do meso (0–24): as anteriores
// estão feitas e a da posição é a da vez.
export function celulasDoMeso(concluidasNoMeso: number, dias: string[]): CelulaMapa[][] {
  return Array.from({ length: RODADA_DELOAD }, (_, r) =>
    Array.from({ length: SESSOES_POR_RODADA }, (_, i) => {
      const posicao = r * SESSOES_POR_RODADA + i;
      const estado: EstadoCelula = posicao < concluidasNoMeso ? "feita" : posicao === concluidasNoMeso ? "daVez" : "pendente";
      return { estado, dia: estado === "feita" ? (dias[posicao] ?? null) : null };
    }),
  );
}
