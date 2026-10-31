import { describe, expect, it } from "vitest";
import { ajustar, proximaSerie, valoresIniciais } from "./serieEmFoco";
import type { SerieRegistrada } from "./tipos";

const serie = (serieNumero: number, cargaKg: number | null, reps: number | null): SerieRegistrada => ({
  exercicioId: "x",
  sessao: "A",
  data: "2026-10-28",
  serieNumero,
  cargaKg,
  reps,
  rir: null,
  registradoEm: "2026-10-28T10:00:00.000Z",
});

describe("proximaSerie", () => {
  it("devolve a primeira série sem registro", () => {
    expect(proximaSerie([], 3)).toBe(1);
    expect(proximaSerie([serie(1, 40, 10), serie(2, 40, 10)], 3)).toBe(3);
  });

  it("série existente mas vazia conta como pendente", () => {
    expect(proximaSerie([serie(1, 40, 10), serie(2, null, null)], 3)).toBe(2);
  });

  it("null quando todas estão feitas", () => {
    expect(proximaSerie([serie(1, 40, 10), serie(2, 40, 9)], 2)).toBeNull();
  });
});

describe("valoresIniciais", () => {
  it("repete a série anterior de hoje", () => {
    expect(valoresIniciais(2, [serie(1, 42.5, 9)], [], { cargaKg: 40, repsPreencher: 8 }, 30)).toEqual({ kg: "42.5", reps: "9" });
  });

  it("1ª série usa a sugestão; sem ela, carga inicial e reps da última vez", () => {
    expect(valoresIniciais(1, [], [], { cargaKg: 40, repsPreencher: 8 }, 30)).toEqual({ kg: "40", reps: "8" });
    expect(valoresIniciais(1, [], [serie(1, 38, 11)], null, 30)).toEqual({ kg: "30", reps: "11" });
  });

  it("sem nenhum dado abre vazio", () => {
    expect(valoresIniciais(1, [], [], null, null)).toEqual({ kg: "", reps: "" });
  });
});

describe("ajustar", () => {
  it("soma o passo e não passa do mínimo", () => {
    expect(ajustar("40", 2.5)).toBe("42.5");
    expect(ajustar("1", -2.5)).toBe("0");
    expect(ajustar("", 1)).toBe("1");
    expect(ajustar("40,5", 2)).toBe("42.5");
  });
});
