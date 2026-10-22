import { describe, expect, it } from "vitest";
import {
  analisarPostura,
  anguloCraniovertebral,
  cifose,
  inclinacaoPar,
  inclinacaoTronco,
  ladoDaFrente,
  medidasFrontal,
  sessoesPorDia,
} from "./postura";
import type { RegistroPostura } from "./tipos";

const HOJE = "2026-10-20";

describe("cifose (3 pontos na coluna)", () => {
  it("pontos colineares dão 0° e índice 0", () => {
    expect(cifose({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.6 })).toEqual({ anguloGraus: 0, indice: 0 });
  });

  it("arco com flecha 10% da corda dá índice 10 e 4·atan(0,2)", () => {
    const k = cifose({ x: 0.5, y: 0.2 }, { x: 0.55, y: 0.45 }, { x: 0.5, y: 0.7 });
    expect(k.indice).toBe(10);
    expect(k.anguloGraus).toBe(Math.round(4 * Math.atan(0.2) * (180 / Math.PI) * 10) / 10);
  });

  it("a flecha respeita a proporção da foto (x em fração da largura)", () => {
    // Foto 2:1 — o mesmo deslocamento em x vale o dobro em pixels.
    const quadrada = cifose({ x: 0.5, y: 0.2 }, { x: 0.55, y: 0.45 }, { x: 0.5, y: 0.7 }, 1);
    const larga = cifose({ x: 0.5, y: 0.2 }, { x: 0.55, y: 0.45 }, { x: 0.5, y: 0.7 }, 2);
    expect(larga.indice).toBe(quadrada.indice * 2);
  });

  it("C7 igual a T12 não divide por zero", () => {
    expect(cifose({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.5, y: 0.5 })).toEqual({ anguloGraus: 0, indice: 0 });
  });
});

describe("ângulo craniovertebral", () => {
  it("orelha em cima do C7 dá 90°", () => {
    expect(anguloCraniovertebral({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.3 })).toBe(90);
  });
  it("orelha 45° à frente dá 45°, para qualquer lado", () => {
    expect(anguloCraniovertebral({ x: 0.4, y: 0.2 }, { x: 0.5, y: 0.3 })).toBe(45);
    expect(anguloCraniovertebral({ x: 0.6, y: 0.2 }, { x: 0.5, y: 0.3 })).toBe(45);
  });
});

describe("tronco", () => {
  it("identifica a frente pelo nariz", () => {
    expect(ladoDaFrente({ x: 0.4, y: 0.1 }, { x: 0.5, y: 0.1 })).toBe("esquerda");
    expect(ladoDaFrente({ x: 0.6, y: 0.1 }, { x: 0.5, y: 0.1 })).toBe("direita");
  });
  it("ombro à frente do quadril é positivo, atrás é negativo", () => {
    expect(inclinacaoTronco({ x: 0.45, y: 0.3 }, { x: 0.5, y: 0.5 }, "esquerda")).toBeCloseTo(14, 0);
    expect(inclinacaoTronco({ x: 0.45, y: 0.3 }, { x: 0.5, y: 0.5 }, "direita")).toBeCloseTo(-14, 0);
    expect(inclinacaoTronco({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.5 }, "direita")).toBe(0);
  });
});

describe("frontal", () => {
  it("linha reta dá 0°, lado direito mais baixo dá positivo", () => {
    expect(inclinacaoPar({ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 })).toBe(0);
    expect(inclinacaoPar({ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.32 })).toBeCloseTo(5.7, 1);
    expect(inclinacaoPar({ x: 0.4, y: 0.32 }, { x: 0.6, y: 0.3 })).toBeCloseTo(-5.7, 1);
  });
  it("medidasFrontal cobre as quatro linhas", () => {
    const m = medidasFrontal({
      olhoEsq: { x: 0.45, y: 0.1 },
      olhoDir: { x: 0.55, y: 0.1 },
      ombroEsq: { x: 0.4, y: 0.3 },
      ombroDir: { x: 0.6, y: 0.3 },
      quadrilEsq: { x: 0.42, y: 0.55 },
      quadrilDir: { x: 0.58, y: 0.55 },
      joelhoEsq: { x: 0.44, y: 0.8 },
      joelhoDir: { x: 0.56, y: 0.8 },
    });
    expect(m).toEqual({ olhos: 0, ombros: 0, quadril: 0, joelhos: 0 });
  });
});

function reg(data: string, vista: "perfil" | "frontal", medidas: Record<string, number>, n = 0): RegistroPostura {
  const quando = `${data}T08:0${n}:00`;
  return {
    chave: `postura:${quando}:${vista}`,
    vista,
    data,
    quando,
    proporcao: 0.75,
    pontos: {},
    medidas,
    confiancaDeteccao: 0.9,
    registradoEm: `${quando}.000Z`,
  };
}

const perfil = (data: string, cif: number, cva: number, n = 0) => reg(data, "perfil", { anguloCifose: cif, indiceCifose: cif / 3, cva, inclinacaoTronco: 2 }, n);
const tres = (data: string, cif: number, cva: number) => [perfil(data, cif - 1, cva, 0), perfil(data, cif, cva + 1, 1), perfil(data, cif + 3, cva - 2, 2)];

describe("sessões por dia", () => {
  it("usa a mediana das capturas do dia", () => {
    const s = sessoesPorDia(tres("2026-09-01", 40, 50), "perfil");
    expect(s).toHaveLength(1);
    expect(s[0].capturas).toBe(3);
    expect(s[0].medidas.anguloCifose).toBe(40);
    expect(s[0].medidas.cva).toBe(50);
  });
  it("ignora a outra vista", () => {
    expect(sessoesPorDia([reg("2026-09-01", "frontal", { ombros: 1 })], "perfil")).toHaveLength(0);
  });
});

describe("analisarPostura", () => {
  it("poucas sessões: dados insuficientes", () => {
    const a = analisarPostura([...tres("2026-09-01", 40, 50), ...tres("2026-09-10", 39, 50)], { hoje: HOJE });
    expect(a.veredito).toBe("dados_insuficientes");
    expect(a.sessoes.perfil).toBe(2);
  });

  it("variação dentro de ±3° é ruído", () => {
    const regs = [...tres("2026-08-01", 40, 50), ...tres("2026-08-20", 41, 51), ...tres("2026-09-10", 39, 49), ...tres("2026-10-01", 40, 50)];
    const a = analisarPostura(regs, { hoje: HOJE });
    expect(a.veredito).toBe("dentro_do_ruido");
    expect(a.confianca).toBe("media");
  });

  it("cifose caindo e CVA subindo: melhorando", () => {
    const regs = [...tres("2026-08-01", 46, 44), ...tres("2026-08-20", 44, 46), ...tres("2026-09-10", 41, 49), ...tres("2026-10-01", 38, 52)];
    const a = analisarPostura(regs, { hoje: HOJE });
    expect(a.veredito).toBe("cifose_melhorando");
    const cif = a.tendencias.find((t) => t.medida === "anguloCifose")!;
    expect(cif.direcao).toBe("melhorou");
    expect(cif.variacao).toBeLessThan(-3);
    expect(a.tendencias.find((t) => t.medida === "cva")!.direcao).toBe("melhorou");
  });

  it("cifose subindo: piorando, e sessões com 1 captura rebaixam a confiança", () => {
    const regs = [perfil("2026-08-01", 38, 52), perfil("2026-08-20", 40, 52), perfil("2026-09-10", 43, 51), perfil("2026-10-01", 46, 50)];
    const a = analisarPostura(regs, { hoje: HOJE });
    expect(a.veredito).toBe("cifose_piorando");
    expect(a.confianca).toBe("baixa");
    expect(a.avisos.some((x) => x.includes("uma captura"))).toBe(true);
  });

  it("avisa CVA baixo e índice acima da referência na última sessão", () => {
    const a = analisarPostura([perfil("2026-10-01", 48, 45)], { hoje: HOJE });
    expect(a.avisos.some((x) => x.includes("craniovertebral"))).toBe(true);
    expect(a.avisos.some((x) => x.includes("Índice de cifose"))).toBe(true);
  });

  it("medidas com ideal zero melhoram quando o valor absoluto cai", () => {
    const f = (data: string, ombros: number) => reg(data, "frontal", { ombros, quadril: 0, joelhos: 0, olhos: 0 });
    const regs = [f("2026-08-01", -6), f("2026-08-20", -5), f("2026-09-10", -3), f("2026-10-01", -1)];
    const a = analisarPostura(regs, { hoje: HOJE });
    expect(a.tendencias.find((t) => t.medida === "ombros")!.direcao).toBe("melhorou");
  });

  it("fora da janela de 180 dias não conta; lembrete após 30 dias", () => {
    const a = analisarPostura([perfil("2026-01-01", 40, 50), perfil("2026-08-01", 40, 50)], { hoje: HOJE });
    expect(a.sessoes.perfil).toBe(1);
    expect(a.avisos.some((x) => x.includes("Última avaliação há"))).toBe(true);
  });
});
