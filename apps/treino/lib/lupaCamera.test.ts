import { describe, expect, it } from "vitest";
import { posicaoLupa } from "@/components/OverlayPostura";
import { recorteComZoom, recorteCover } from "@/components/CameraPostura";

describe("posição da lupa", () => {
  const L = 360;
  const A = 640;

  it("fica acima do ponto, com folga", () => {
    const c = posicaoLupa({ x: 0.5, y: 0.5 }, L, A, 128, 28);
    expect(c.x).toBe(180);
    expect(c.y).toBe(320 - 28 - 64);
  });

  it("vai para baixo do ponto quando não cabe em cima", () => {
    const c = posicaoLupa({ x: 0.5, y: 0.05 }, L, A, 128, 28);
    expect(c.y).toBeGreaterThan(0.05 * A);
  });

  it("nunca sai do quadro, em nenhum canto", () => {
    for (const x of [0, 0.02, 0.5, 0.98, 1]) {
      for (const y of [0, 0.02, 0.5, 0.98, 1]) {
        const c = posicaoLupa({ x, y }, L, A, 128, 28);
        expect(c.x - 64).toBeGreaterThanOrEqual(0);
        expect(c.x + 64).toBeLessThanOrEqual(L);
        expect(c.y - 64).toBeGreaterThanOrEqual(0);
        expect(c.y + 64).toBeLessThanOrEqual(A);
      }
    }
  });
});

describe("recorte do object-cover num quadro 9:16", () => {
  it("vídeo 9:16 não é recortado", () => {
    expect(recorteCover(1080, 1920)).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 });
  });

  it("vídeo 3:4 é mais largo que 9:16, então corta as laterais", () => {
    const r = recorteCover(1440, 1920);
    expect(r.sh).toBe(1920);
    expect(r.sw).toBeCloseTo(1080, 5);
    expect(r.sx).toBeCloseTo(180, 5);
    expect(r.sy).toBe(0);
  });

  it("vídeo mais alto que 9:16 corta em cima e embaixo", () => {
    const r = recorteCover(1080, 2400);
    expect(r.sw).toBe(1080);
    expect(r.sh).toBeCloseTo(1920, 5);
    expect(r.sy).toBeCloseTo(240, 5);
  });

  it("o recorte sempre tem proporção 9:16", () => {
    for (const [w, h] of [[1920, 1080], [1280, 720], [720, 1280], [1000, 1000]]) {
      const r = recorteCover(w, h);
      expect(r.sw / r.sh).toBeCloseTo(9 / 16, 5);
      expect(r.sx).toBeGreaterThanOrEqual(0);
      expect(r.sy).toBeGreaterThanOrEqual(0);
      expect(r.sx + r.sw).toBeLessThanOrEqual(w + 1e-9);
      expect(r.sy + r.sh).toBeLessThanOrEqual(h + 1e-9);
    }
  });
});

describe("zoom digital", () => {
  it("1× não altera o recorte", () => {
    const r = recorteCover(1080, 1920);
    expect(recorteComZoom(r, 1)).toEqual(r);
  });

  it("2× reduz à metade, centrado", () => {
    expect(recorteComZoom({ sx: 0, sy: 0, sw: 1080, sh: 1920 }, 2)).toEqual({ sx: 270, sy: 480, sw: 540, sh: 960 });
  });
});
