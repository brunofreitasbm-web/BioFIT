import { describe, expect, it } from "vitest";
import { carga72Relativa, resumoCarga, serieCarga, trimpTreino, zonaAcwr } from "./carga";
import { alertaPrecoce, defasagemDoseResposta, horarioTreinoVsSono, janelaIdeal, sonoVsDesempenho } from "./cruzamentos";
import { correlacao, intervaloIso, somarDiasIso, zscore } from "./estatistica";
import { calcularProntidao, PESOS_PADRAO, recomendacaoDe } from "./prontidao";
import type { DiaForca, DiaRecuperacao, TreinoGarmin } from "./tipos";

function dia(data: string, o: Partial<DiaRecuperacao> = {}): DiaRecuperacao {
  return {
    data,
    hrvMs: null,
    hrvStatus: null,
    hrvMediaSemanal: null,
    hrvBaseBaixo: null,
    hrvBaseAlto: null,
    fcRepouso: null,
    sonoMin: null,
    sonoScore: null,
    sonoProfundoMin: null,
    sonoRemMin: null,
    sonoLeveMin: null,
    sonoAcordadoMin: null,
    sonoInicioUtc: null,
    sonoFimUtc: null,
    respiracao: null,
    bodyBatteryAcordar: null,
    bodyBatteryMax: null,
    estresse: null,
    passos: null,
    prontidaoGarmin: null,
    prontidaoNivel: null,
    statusTreino: null,
    cargaAguda: null,
    cargaCronica: null,
    acwrGarmin: null,
    intensidadeMod: null,
    intensidadeVig: null,
    caloriasAtivas: null,
    ...o,
  };
}

function treino(data: string, o: Partial<TreinoGarmin> = {}): TreinoGarmin {
  return {
    data,
    inicioUtc: `${data}T20:00:00Z`, // 17 h em Belém
    tipo: "strength_training",
    duracaoMin: 60,
    fcMedia: 120,
    fcMax: 170,
    calorias: 300,
    teAerobico: null,
    teAnaerobico: null,
    zonasFcS: null,
    ...o,
  };
}

// 40 dias com VFC oscilando de forma determinística.
const INICIO = "2026-09-01";
const datas = intervaloIso(INICIO, somarDiasIso(INICIO, 39));
const base = datas.map((d, i) => dia(d, { hrvMs: 40 + (i % 5), fcRepouso: 50 + (i % 3) }));

describe("estatística", () => {
  it("correlação exige 5 pares e variação", () => {
    expect(correlacao([{ x: 1, y: 1 }])).toBeNull();
    expect(correlacao([1, 2, 3, 4, 5].map((x) => ({ x, y: 7 })))).toBeNull();
    const c = correlacao([1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x + 1 })))!;
    expect(c.r).toBeCloseTo(1);
    expect(c.inclinacao).toBeCloseTo(2);
  });

  it("z-score com amostra pequena é null", () => {
    expect(zscore(10, [1, 2, 3])).toBeNull();
    expect(zscore(10, [1, 2, 3, 4, 5, 6, 7, 8])).toBeGreaterThan(2);
  });
});

describe("carga", () => {
  it("TRIMP usa zonas quando existem e estima quando não", () => {
    const comZonas = treino("2026-09-01", { zonasFcS: [600, 600, 0, 0, 0] }); // 10 min z1 + 10 min z2
    expect(trimpTreino(comZonas)).toBeCloseTo(30);
    const semZonas = treino("2026-09-01", { duracaoMin: 30, fcMedia: 130, fcMax: 170 }); // 76% → z3
    expect(trimpTreino(semZonas)).toBe(90);
  });

  it("série contínua soma TRIMP e séries de força", () => {
    const s = serieCarga("2026-09-01", "2026-09-03", [treino("2026-09-02", { zonasFcS: [0, 0, 600, 0, 0] })], [{ data: "2026-09-02", series: 10 }]);
    expect(s.map((c) => c.total)).toEqual([0, 30 + 30, 0]);
  });

  it("ACWR e zonas", () => {
    const serie = intervaloIso("2026-09-01", "2026-09-28").map((data) => ({ data, trimp: 100, forca: 0, total: 100 }));
    const r = resumoCarga(serie, "2026-09-28")!;
    expect(r.acwr).toBe(1);
    expect(r.zona).toBe("ideal");
    expect(r.confiavel).toBe(true);
    expect(zonaAcwr(0.5)).toBe("baixa");
    expect(zonaAcwr(1.4)).toBe("alta");
    expect(zonaAcwr(2)).toBe("muito-alta");
  });

  it("carga 72 h relativa ao habitual", () => {
    const serie = intervaloIso("2026-09-01", "2026-10-05").map((data) => ({ data, trimp: 0, forca: 0, total: data > "2026-10-02" ? 200 : 100 }));
    expect(carga72Relativa(serie, "2026-10-05")).toBe(2);
  });
});

describe("prontidão", () => {
  it("VFC no normal, sono bom e Body Battery alto → recomenda carga", () => {
    const dias = [...base, dia("2026-10-11", { hrvMs: 42, fcRepouso: 51, sonoMin: 480, sonoProfundoMin: 90, sonoRemMin: 100, bodyBatteryAcordar: 90 })];
    const p = calcularProntidao(dias, "2026-10-11", { carga72: 0.9 });
    expect(p.score).toBeGreaterThanOrEqual(75);
    expect(p.recomendacao).toBe("pesado");
    expect(p.componentes.reduce((a, c) => a + c.peso, 0)).toBeCloseTo(1);
  });

  it("VFC despencada e FC alta → recomenda recuperar", () => {
    const dias = [...base, dia("2026-10-11", { hrvMs: 25, fcRepouso: 62, sonoMin: 300, bodyBatteryAcordar: 20 })];
    const p = calcularProntidao(dias, "2026-10-11", { carga72: 2 });
    expect(p.score).toBeLessThan(35);
    expect(p.recomendacao).toBe("recuperar");
  });

  it("sem dados devolve score null e renormaliza pesos quando falta componente", () => {
    expect(calcularProntidao([], "2026-10-11").score).toBeNull();
    const so = calcularProntidao([dia("2026-10-11", { bodyBatteryAcordar: 80 })], "2026-10-11");
    expect(so.componentes).toHaveLength(1);
    expect(so.componentes[0].peso).toBe(1);
    expect(so.score).toBe(80);
  });

  it("limiares da recomendação e pesos exportados", () => {
    expect(recomendacaoDe(75)).toBe("pesado");
    expect(recomendacaoDe(55)).toBe("moderado");
    expect(recomendacaoDe(35)).toBe("leve");
    expect(recomendacaoDe(34)).toBe("recuperar");
    expect(Object.keys(PESOS_PADRAO)).toHaveLength(5);
  });
});

describe("cruzamentos", () => {
  it("defasagem: detecta queda de VFC no dia seguinte a carga alta", () => {
    // carga alta em dias pares; VFC cai no dia seguinte.
    const carga = datas.map((data, i) => ({ data, trimp: 0, forca: 0, total: i % 2 === 0 ? 200 + i : 20 + i }));
    const dias = datas.map((d, i) => dia(d, { hrvMs: i % 2 === 1 ? 30 + (i % 4) : 50 + (i % 4) }));
    const ins = defasagemDoseResposta(dias, carga);
    expect(ins.n).toBeGreaterThan(20);
    expect(ins.r).toBeLessThan(-0.25);
    expect(ins.resumo).toContain("depois");
  });

  it("devolve 'sem dados' quando faltam pares", () => {
    expect(defasagemDoseResposta([], []).n).toBe(0);
    expect(sonoVsDesempenho([], []).n).toBe(0);
    expect(janelaIdeal([]).n).toBe(0);
  });

  it("sono × desempenho: mais sono restaurador, mais séries", () => {
    const dias = datas.slice(0, 20).map((d, i) => dia(d, { sonoMin: 400 + i * 5, sonoProfundoMin: 50 + i * 3, sonoRemMin: 60 + i * 2 }));
    const forca: DiaForca[] = datas.slice(0, 20).map((data, i) => ({ data, series: 10 + Math.floor(i / 2) }));
    const ins = sonoVsDesempenho(dias, forca);
    expect(ins.r).toBeGreaterThan(0.8);
    expect(ins.pontos).toHaveLength(20);
  });

  it("horário do treino × sono profundo compara noite vs resto", () => {
    const dias = datas.map((d) => dia(d, { sonoProfundoMin: 80 }));
    const noturnos = [0, 2, 4].map((i) => treino(datas[i], { inicioUtc: `${datas[i]}T23:00:00Z` })); // 20 h em Belém
    const outros = [6, 8, 10].map((i) => treino(datas[i]));
    dias[1] = { ...dias[1], sonoProfundoMin: 50 };
    dias[3] = { ...dias[3], sonoProfundoMin: 50 };
    dias[5] = { ...dias[5], sonoProfundoMin: 50 };
    const ins = horarioTreinoVsSono(dias, [...noturnos, ...outros]);
    expect(ins.n).toBe(6);
    expect(ins.resumo).toContain("50 min");
    expect(ins.resumo).toContain("80 min");
  });

  it("alerta precoce dispara com FC e respiração fora do normal", () => {
    const dias = datas.map((d, i) => dia(d, { fcRepouso: 50 + (i % 3), respiracao: 13 + (i % 2) * 0.5, hrvMs: 40 + (i % 5) }));
    const hoje = dias.length - 1;
    dias[hoje] = { ...dias[hoje], fcRepouso: 66, respiracao: 17, hrvMs: 40 };
    const ins = alertaPrecoce(dias);
    expect(ins.resumo).toContain("Atenção");
  });

  it("janela ideal aponta o melhor dia da semana", () => {
    const dias = datas.map((d, i) => dia(d, { bodyBatteryAcordar: 60 + (i % 7) * 4 }));
    const ins = janelaIdeal(dias);
    expect(ins.n).toBeGreaterThan(20);
    expect(ins.resumo).toContain("acorda mais recuperado");
  });
});
