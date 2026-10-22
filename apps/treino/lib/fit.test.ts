import { describe, expect, it } from "vitest";
import { categoriaFit, crc16, gerarFit } from "./fit";

const sessao = {
  inicio: new Date("2026-10-19T20:00:00Z"),
  fim: new Date("2026-10-19T21:00:00Z"),
  series: [
    { nomeExercicio: "Supino reto", cargaKg: 42.5, reps: 8, fim: new Date("2026-10-19T20:05:00Z") },
    { nomeExercicio: "Supino reto", cargaKg: 42.5, reps: 7, fim: new Date("2026-10-19T20:09:00Z") },
    { nomeExercicio: "Barra livre", cargaKg: null, reps: null, fim: new Date("2026-10-19T20:15:00Z") },
  ],
};

describe("gerarFit", () => {
  const fit = gerarFit(sessao);
  const dv = new DataView(fit.buffer);

  it("tem cabeçalho FIT válido", () => {
    expect(fit[0]).toBe(14);
    expect(String.fromCharCode(...fit.slice(8, 12))).toBe(".FIT");
    expect(dv.getUint32(4, true)).toBe(fit.length - 14 - 2);
    expect(dv.getUint16(12, true)).toBe(crc16(fit.slice(0, 12)));
  });

  it("CRC final confere com o arquivo", () => {
    expect(dv.getUint16(fit.length - 2, true)).toBe(crc16(fit.slice(0, fit.length - 2)));
  });

  it("converte carga para escala 16 e trata valores ausentes", () => {
    // procura a definição da mensagem set (global 225 = 0xE1) e lê os dados logo após
    let def = -1;
    for (let i = 14; i < fit.length - 4; i++) if (fit[i] === 0x42 && dv.getUint16(i + 3, true) === 225) def = i;
    expect(def).toBeGreaterThan(0);
    const n = fit[def + 5];
    const tamanho = 1 + Array.from({ length: n }, (_, k) => fit[def + 7 + k * 3]).reduce((a, b) => a + b, 0);
    const primeira = def + 6 + n * 3;
    expect(dv.getUint16(primeira + 1 + 4 + 4, true)).toBe(8); // reps
    expect(dv.getUint16(primeira + 1 + 4 + 4 + 2, true)).toBe(680); // 42,5 kg × 16
    const terceira = primeira + 2 * tamanho;
    expect(dv.getUint16(terceira + 1 + 4 + 4, true)).toBe(0xffff);
    expect(dv.getUint16(terceira + 1 + 4 + 4 + 2, true)).toBe(0xffff);
  });
});

describe("categoriaFit", () => {
  it("mapeia nomes conhecidos e cai em desconhecido", () => {
    expect(categoriaFit("Supino inclinado")).toBe(0);
    expect(categoriaFit("Agachamento hack")).toBe(27);
    expect(categoriaFit("Exercício inventado")).toBe(65534);
  });
});
