import { describe, expect, it } from "vitest";
import { getExercicio, getSessaoCompleta, SESSOES, SLOTS } from "./exercicios";

const total = (meso: number) => SESSOES.reduce((n, s) => n + getSessaoCompleta(s, meso).reduce((x, e) => x + e.series, 0), 0);

describe("mesos 2 e 3", () => {
  it("séries por sessão: meso 2 = 22/23/23/23/23, meso 3 = 23 em todas", () => {
    expect(SESSOES.map((s) => getSessaoCompleta(s, 2).reduce((n, e) => n + e.series, 0))).toEqual([22, 23, 23, 23, 23]);
    expect(SESSOES.map((s) => getSessaoCompleta(s, 3).reduce((n, e) => n + e.series, 0))).toEqual([23, 23, 23, 23, 23]);
  });
  it("totais semanais 114 e 115", () => {
    expect(total(2)).toBe(114);
    expect(total(3)).toBe(115);
  });
  it("mesos 1 e 4+ seguem a regra original (ímpar = meso1, par = meso2)", () => {
    for (const s of SESSOES) {
      expect(getSessaoCompleta(s, 5).map((e) => e.id)).toEqual(getSessaoCompleta(s, 1).map((e) => e.id));
      expect(getSessaoCompleta(s, 4).map((e) => e.id)).toEqual(SLOTS.filter((x) => x.sessao === s).sort((a, b) => a.ordem - b.ordem).map((x) => x.meso2.id));
    }
  });
  it("ordens sequenciais, ids únicos por sessão, bisets recíprocos, sem teste de falha", () => {
    for (const meso of [2, 3]) for (const s of SESSOES) {
      const ex = getSessaoCompleta(s, meso);
      expect(ex.map((e) => e.ordem)).toEqual(ex.map((_, i) => i + 1));
      expect(new Set(ex.map((e) => e.id)).size).toBe(ex.length);
      for (const e of ex) {
        expect(e.testeFalha).toBe(false);
        if (e.bisetCom) expect(ex[e.bisetCom - 1].bisetCom).toBe(e.ordem);
      }
    }
  });
  it("todos os ids resolvem no catálogo; nada de hip thrust com barra, Smith unilateral ou elevação pélvica unilateral", () => {
    for (const meso of [2, 3]) for (const s of SESSOES) for (const e of getSessaoCompleta(s, meso)) {
      expect(getExercicio(e.id), e.id).toBeDefined();
      expect(e.id).not.toMatch(/hip-thrust-barra|passada-estatica-smith|unilateral.*pelvica/);
    }
  });
});
