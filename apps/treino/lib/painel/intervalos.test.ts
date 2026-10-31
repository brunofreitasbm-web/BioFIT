import { describe, expect, it } from "vitest";
import { cruzarIntervalos } from "./intervalos";

describe("cruzarIntervalos", () => {
  const medicoes = [
    { data: "2026-09-01", pesoKg: 92, gorduraPct: 24.5, massaMagraKg: 64.2 },
    { data: "2026-09-15", pesoKg: 91, gorduraPct: 23.5, massaMagraKg: 65.2 },
  ];

  it("calcula variação do corpo e treino por semana", () => {
    const forca = [{ data: "2026-09-03", series: 20 }, { data: "2026-09-10", series: 10 }, { data: "2026-08-30", series: 99 }];
    const [i] = cruzarIntervalos(medicoes, forca, []);
    expect(i.dias).toBe(14);
    expect(i.delta).toEqual({ pesoKg: -1, gorduraPp: -1, massaMagraKg: 1 });
    expect(i.treino).toEqual({ treinosPorSemana: 1, seriesPorSemana: 15 });
    expect(i.garmin).toBeNull();
  });

  it("ignora intervalos sem dias e devolve vazio com uma medição", () => {
    expect(cruzarIntervalos([medicoes[0]], [], [])).toEqual([]);
  });
});
