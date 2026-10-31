// Escala de calor usada no mapa de volume por grupo muscular: azul frio (pouco
// trabalhado) -> amarelo -> vermelho quente (muito trabalhado).
export function corCalor(intensidade: number): string {
  const t = Math.max(0, Math.min(1, intensidade));
  const stops: [number, [number, number, number]][] = [
    [0, [42, 58, 107]], // brand.soft (frio)
    [0.35, [79, 155, 255]], // azul
    [0.6, [255, 207, 92]], // amarelo
    [0.8, [255, 138, 92]], // laranja
    [1, [255, 93, 108]], // vermelho (danger)
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const localT = (t - lo[0]) / span;
  const rgb = lo[1].map((c, i) => Math.round(c + (hi[1][i] - c) * localT));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
