import { describe, expect, it } from "vitest";
import { ALTURA, CENTRO, LARGURA, NIVEIS, PONTOS_PERFIL, caminhoFechado, contorno, pontosFrontal } from "./contornoCorpo";

const numeros = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe("contorno do corpo", () => {
  it("o caminho fecha e tem uma curva por ponto", () => {
    const d = caminhoFechado([[10, 10], [50, 10], [50, 50], [10, 50]]);
    expect(d.startsWith("M10,10")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/C/g) ?? []).length).toBe(4);
  });

  it("frontal é simétrico em torno do eixo", () => {
    const xs = pontosFrontal().map(([x]) => x);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(2 * CENTRO, 5);
    // Cada ponto tem o espelho no outro lado (menos os dois do eixo).
    const lista = pontosFrontal();
    for (const [x, y] of lista) {
      expect(lista.some(([x2, y2]) => Math.abs(x2 - (2 * CENTRO - x)) < 1e-9 && y2 === y)).toBe(true);
    }
  });

  it.each([
    ["frontal", pontosFrontal()],
    ["perfil", [...PONTOS_PERFIL]],
  ] as const)("%s cabe no quadro com margem", (_, pontos) => {
    for (const [x, y] of pontos) {
      expect(x).toBeGreaterThan(2);
      expect(x).toBeLessThan(LARGURA - 2);
      expect(y).toBeGreaterThanOrEqual(6);
      expect(y).toBeLessThanOrEqual(ALTURA - 4);
    }
  });

  it("a curva suavizada não foge muito do quadro", () => {
    for (const vista of ["frontal", "perfil"] as const) {
      const n = numeros(contorno(vista));
      expect(n.length).toBeGreaterThan(100);
      expect(Math.min(...n)).toBeGreaterThan(0);
      expect(Math.max(...n)).toBeLessThan(ALTURA);
    }
  });

  it("os níveis de referência crescem de cima para baixo", () => {
    for (const vista of ["frontal", "perfil"] as const) {
      const ys = NIVEIS[vista].map((n) => n.y);
      expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    }
  });
});
