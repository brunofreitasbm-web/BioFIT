// Contorno de corpo humano para orientar a foto da avaliação postural. Coordenadas no espaço
// 90 × 160 (a proporção 9:16 do quadro da câmera); o caminho é suavizado por Catmull-Rom
// fechado a partir de poucos pontos, então ajustar o desenho é mexer numa lista de pontos.

export const LARGURA = 90;
export const ALTURA = 160;
export const CENTRO = LARGURA / 2;

export type Pt = readonly [number, number];

const r2 = (n: number) => Math.round(n * 100) / 100;

// Curva fechada que passa por todos os pontos (Catmull-Rom → Bézier cúbica).
export function caminhoFechado(pontos: readonly Pt[]): string {
  const n = pontos.length;
  const P = (i: number) => pontos[((i % n) + n) % n];
  let d = `M${r2(P(0)[0])},${r2(P(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i - 1);
    const [x1, y1] = P(i);
    const [x2, y2] = P(i + 1);
    const [x3, y3] = P(i + 2);
    d += `C${r2(x1 + (x2 - x0) / 6)},${r2(y1 + (y2 - y0) / 6)} ${r2(x2 - (x3 - x1) / 6)},${r2(y2 - (y3 - y1) / 6)} ${r2(x2)},${r2(y2)}`;
  }
  return `${d}Z`;
}

// Metade direita da figura frontal, do topo da cabeça até o meio da virilha, como
// deslocamentos (dx a partir do centro, y). Braços soltos, afastados do tronco.
const METADE_FRONTAL: readonly Pt[] = [
  [0, 8],
  [5.5, 9.5], [7.5, 14], [7, 19], [5, 23.5], // cabeça
  [3.4, 27], [3.7, 30.5], // pescoço
  [9, 32.5], [16, 33.5], [19.8, 36.5], // ombro
  [21.6, 44], [22.6, 54], [23.6, 64], [24.6, 74], [25.4, 80], [23.8, 84.5], // braço por fora e mão
  [21, 83], [20, 76], [19, 66], [17.8, 52], // braço por dentro
  [14.4, 50], [13.2, 60], [14.2, 69], [15.8, 77], // cintura e quadril
  [16.4, 85], [16.2, 96], [15.2, 108], [13.6, 120], [12.2, 131], [11.4, 141], [11.2, 146.5], // perna por fora
  [13.6, 151.5], [11, 153.8], [5.6, 153.8], [4.6, 150], // pé
  [4.4, 143], [3.9, 132], [3.4, 118], [3.2, 104], [2.6, 94], [1.8, 87], // perna por dentro
  [0, 83], // virilha
];

export function pontosFrontal(): Pt[] {
  const direita = METADE_FRONTAL.map(([dx, y]): Pt => [CENTRO + dx, y]);
  // Espelha sem repetir o topo nem a virilha, que ficam no eixo.
  const esquerda = METADE_FRONTAL.slice(1, -1)
    .reverse()
    .map(([dx, y]): Pt => [CENTRO - dx, y]);
  return [...direita, ...esquerda];
}

// Perfil virado para a direita: frente do corpo em +x. Sem os braços, que escondem o tronco.
export const PONTOS_PERFIL: readonly Pt[] = [
  [45, 8], [49.5, 9.2], [52, 13], [52.6, 17.5], [54.2, 20.5], [52.6, 22], [52, 24.5], // cabeça e nariz
  [49.5, 27.3], [48, 30], [48.8, 33.5], // pescoço
  [53.3, 37], [54.5, 44], [54.5, 52], [53.3, 60], [52.1, 68], [52.3, 75], [53.3, 82], // peito e barriga
  [51.5, 90], [50.8, 102], [50, 114], [50.2, 121], [49.2, 131], [48.6, 142], [49, 147.5], // frente da perna
  [53, 150.5], [56.5, 152.5], [56.5, 154], [40.5, 154], [39.5, 150.5], // pé
  [40.5, 146], [41, 135], [40, 126], [40.6, 118], [40, 108], [39, 96], [36.8, 88], [36.2, 82], // trás da perna
  [36.7, 75], [38.5, 68], [37.3, 60], [35.5, 51], [35.3, 43], [37, 36], [40.6, 31.5], // costas
  [41.4, 28], [40.8, 23.5], [39.6, 18], [40.5, 12.5], // nuca
];

export type VistaContorno = "perfil" | "frontal";

export function contorno(vista: VistaContorno): string {
  return caminhoFechado(vista === "frontal" ? pontosFrontal() : PONTOS_PERFIL);
}

// Alturas de referência (no espaço 90 × 160) onde cada parte do corpo deve cair no quadro.
export const NIVEIS: Record<VistaContorno, { y: number; rotulo: string }[]> = {
  frontal: [
    { y: 13, rotulo: "Olhos" },
    { y: 34, rotulo: "Ombros" },
    { y: 78, rotulo: "Quadril" },
    { y: 119, rotulo: "Joelhos" },
  ],
  perfil: [
    { y: 19, rotulo: "Orelha" },
    { y: 34, rotulo: "Ombro" },
    { y: 82, rotulo: "Quadril" },
    { y: 120, rotulo: "Joelho" },
  ],
};
