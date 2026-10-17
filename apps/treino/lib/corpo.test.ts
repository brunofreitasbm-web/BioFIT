import { describe, expect, it } from "vitest";
import {
  analisarCorpo,
  diasEntre,
  periodoDoDia,
  resumoSegmentos,
  tendencia,
  variacaoForcaNaJanela,
  type AnaliseCorpo,
} from "./corpo";
import type { RegistroCorpo, SerieRegistrada } from "./tipos";

const HOJE = "2026-10-05";
const DATAS = ["2026-07-20", "2026-08-03", "2026-08-17", "2026-08-31", "2026-09-14", "2026-09-28"];

function reg(data: string, hora: string, o: Partial<RegistroCorpo> = {}): RegistroCorpo {
  return {
    chave: `avanutri:${data}`,
    fonte: "avanutri",
    data,
    quando: `${data}T${hora}:00`,
    pesoKg: 90,
    gorduraPct: 24,
    massaGordaKg: 21.6,
    massaLivreKg: 68.4,
    musculoEsqueleticoKg: 41,
    aguaTotalL: 47,
    aguaIntraL: 27,
    aguaExtraL: 20,
    gorduraVisceral: 10,
    imc: 30,
    proteinaKg: 17,
    mineraisKg: 4.8,
    tmbKcal: 1850,
    idadeMetabolica: 36,
    segmentos: null,
    registradoEm: "2026-10-01T00:00:00.000Z",
    ...o,
  };
}

// Série com variação linear de `gordura` (pp) e `ffm` (kg) do primeiro ao último ponto.
function serie(dGordura: number, dFfm: number, horas: string[] = DATAS.map(() => "08:10"), datas = DATAS): RegistroCorpo[] {
  const n = datas.length;
  return datas.map((d, i) =>
    reg(d, horas[i], {
      gorduraPct: 24 + (dGordura * i) / (n - 1),
      massaLivreKg: 68 + (dFfm * i) / (n - 1),
      pesoKg: 90 + (dFfm * i) / (n - 1),
    }),
  );
}

// 3 exercícios com sessão no início e no fim da janela; `fator` multiplica a carga final.
function logForca(fator: number): SerieRegistrada[] {
  const ids = ["supino-inclinado-maquina", "puxada-frente-pronada", "remada-apoio-peito-maquina"];
  return ids.flatMap((id) =>
    [
      { data: DATAS[0], carga: 50 },
      { data: DATAS[5], carga: 50 * fator },
    ].map(({ data, carga }) => ({
      exercicioId: id,
      data,
      serieNumero: 1,
      cargaKg: carga,
      reps: 8,
      registradoEm: `${data}T10:00:00.000Z`,
    })),
  );
}

const analisar = (regs: RegistroCorpo[], log: SerieRegistrada[] = logForca(1.1), hoje = HOJE): AnaliseCorpo =>
  analisarCorpo(regs, { hoje, log });

describe("tendencia", () => {
  it("é por data, não por posição", () => {
    const t = tendencia([
      { dia: 100, v: 0 },
      { dia: 110, v: 1 },
      { dia: 140, v: 4 },
    ])!;
    expect(t.porMes).toBeCloseTo(3, 5);
    expect(t.variacao).toBeCloseTo(4, 5);
    expect(t.spanDias).toBe(40);
  });

  it("sem dois dias distintos não há tendência", () => {
    expect(tendencia([{ dia: 1, v: 1 }])).toBeNull();
    expect(tendencia([{ dia: 5, v: 1 }, { dia: 5, v: 2 }])).toBeNull();
  });
});

describe("periodoDoDia / diasEntre", () => {
  it("classifica pela hora local", () => {
    expect(periodoDoDia("2026-09-01T06:59:00")).toBe("manha");
    expect(periodoDoDia("2026-09-01T10:59:59")).toBe("manha");
    expect(periodoDoDia("2026-09-01T11:00:00")).toBe("tarde");
    expect(periodoDoDia("2026-09-01T17:59:00")).toBe("tarde");
    expect(periodoDoDia("2026-09-01T18:00:00")).toBe("noite");
    expect(periodoDoDia("2026-09-01T23:30:00")).toBe("noite");
  });

  it("conta dias corridos entre datas", () => {
    expect(diasEntre("2026-09-01", "2026-10-17")).toBe(46);
    expect(diasEntre("2026-10-17", "2026-10-17")).toBe(0);
  });
});

describe("analisarCorpo: vereditos", () => {
  it("poucas medições: dados insuficientes e confiança baixa", () => {
    const a = analisar(serie(-3, 2).slice(0, 3));
    expect(a.veredito).toBe("dados_insuficientes");
    expect(a.confianca).toBe("baixa");
    expect(a.explicacao).toMatch(/pelo menos 4/);
  });

  it("4 medições, mas num intervalo curto: dados insuficientes", () => {
    const a = analisar(serie(-3, 2, undefined, ["2026-09-20", "2026-09-23", "2026-09-26", "2026-09-29"]));
    expect(a.veredito).toBe("dados_insuficientes");
  });

  it("gordura caindo, massa magra subindo e força subindo: recomposição, confiança alta", () => {
    const a = analisar(serie(-3, 1.5), logForca(1.1));
    expect(a.veredito).toBe("recomposicao_em_curso");
    expect(a.confianca).toBe("alta");
    expect(a.forca?.variacaoMediaPct).toBeGreaterThan(2);
    expect(a.variacao.gorduraPct).toBeCloseTo(-3, 1);
  });

  it("tudo dentro da faixa de ruído: sem conclusão", () => {
    const a = analisar(serie(-0.5, 0.4));
    expect(a.veredito).toBe("dentro_do_ruido");
    expect(a.explicacao).toMatch(/ruído/);
  });

  it("massa magra caindo e força caindo: alerta", () => {
    const a = analisar(serie(-1, -3), logForca(0.9));
    expect(a.veredito).toBe("alerta_perda_de_massa");
    expect(a.explicacao).toMatch(/força também caiu/);
  });

  it("massa magra caindo sem dados de força: alerta, mas com confiança baixa", () => {
    const a = analisar(serie(-1, -3), []);
    expect(a.veredito).toBe("alerta_perda_de_massa");
    expect(a.forca).toBeNull();
    // 6 medições, 70 dias, mesmo horário: seria "alta", mas sem dados de força cai um nível.
    expect(a.confianca).toBe("media");
  });

  it("massa magra caindo mas força subindo: não é alerta", () => {
    const a = analisar(serie(0, -2), logForca(1.1));
    expect(a.veredito).not.toBe("alerta_perda_de_massa");
  });

  it("gordura subindo sem ganho de massa magra: ganho sem retorno", () => {
    expect(analisar(serie(3, 0)).veredito).toBe("ganho_sem_retorno");
  });

  it("massa magra e gordura subindo: ganho de massa", () => {
    expect(analisar(serie(2, 2)).veredito).toBe("ganho_de_massa");
  });

  it("massa magra subindo com gordura estável: recomposição", () => {
    expect(analisar(serie(0, 2)).veredito).toBe("recomposicao_em_curso");
  });

  it("só olha as últimas 6 medições dentro de 180 dias", () => {
    const antigas = [reg("2026-01-05", "08:00"), reg("2026-02-05", "08:00")];
    const a = analisar([...antigas, ...serie(-3, 1.5)]);
    expect(a.leituras).toBe(6);
    expect(a.periodo).toEqual({ inicio: DATAS[0], fim: DATAS[5] });
  });
});

describe("analisarCorpo: confiança e avisos", () => {
  it("horários muito diferentes avisam e rebaixam a confiança", () => {
    const horas = ["23:05", "08:12", "17:58", "21:20", "10:01", "14:30"];
    const a = analisar(serie(-3, 1.5, horas));
    expect(a.veredito).toBe("recomposicao_em_curso");
    expect(a.confianca).not.toBe("alta");
    expect(a.horarios).toEqual({ manha: 2, tarde: 2, noite: 2 });
    expect(a.avisos.join(" ")).toMatch(/horários muito diferentes/);
  });

  it("horários parecidos não geram aviso", () => {
    expect(analisar(serie(-3, 1.5)).avisos).toEqual([]);
  });

  it("avisa de intervalos longos e de medição antiga", () => {
    const datas = ["2026-03-09", "2026-03-17", "2026-03-24", "2026-04-13", "2026-06-03", "2026-09-01"];
    const a = analisar(serie(-1, 0.5, undefined, datas), logForca(1), "2026-10-17");
    expect(a.avisos.some((x) => x.includes("Última medição há 46 dias"))).toBe(true);
    expect(a.avisos.some((x) => /Intervalo de 90 dias/.test(x))).toBe(true);
  });

  it("sem nenhuma medição, não quebra", () => {
    const a = analisar([]);
    expect(a.veredito).toBe("dados_insuficientes");
    expect(a.periodo).toBeNull();
    expect(a.diasDesdeUltima).toBeNull();
  });
});

describe("variacaoForcaNaJanela", () => {
  it("precisa de pelo menos 3 exercícios com 2 sessões", () => {
    const poucos = logForca(1.1).filter((s) => s.exercicioId !== "remada-apoio-peito-maquina");
    expect(variacaoForcaNaJanela(poucos, DATAS[0], DATAS[5])).toBeNull();
    expect(variacaoForcaNaJanela(logForca(1.1), DATAS[0], DATAS[5])?.exercicios).toBe(3);
  });

  it("ignora o exercício assistido (menos carga = melhor)", () => {
    const log = [...logForca(1.1), ...[{ d: DATAS[0], c: 40 }, { d: DATAS[5], c: 20 }].map(({ d, c }) => ({
      exercicioId: "graviton-neutra", data: d, serieNumero: 1, cargaKg: c, reps: 8, registradoEm: `${d}T10:00:00.000Z`,
    }))];
    expect(variacaoForcaNaJanela(log, DATAS[0], DATAS[5])?.exercicios).toBe(3);
  });

  it("mede só dentro da janela", () => {
    expect(variacaoForcaNaJanela(logForca(1.1), "2026-09-01", DATAS[5])).toBeNull();
  });
});

describe("resumoSegmentos", () => {
  const seg = (b: number) => ({
    bracoDireito: { massaMagraKg: b, massaGordaKg: 0.3 },
    bracoEsquerdo: { massaMagraKg: b, massaGordaKg: 0.3 },
    tronco: { massaMagraKg: 30 + b, massaGordaKg: 5 },
    pernaDireita: { massaMagraKg: 11, massaGordaKg: 2 },
    pernaEsquerda: { massaMagraKg: 11, massaGordaKg: 2 },
  });

  it("devolve a última medição e a mudança desde a primeira", () => {
    const r = resumoSegmentos([reg(DATAS[0], "08:00", { segmentos: seg(4.5) }), reg(DATAS[5], "08:00", { segmentos: seg(4.8) })])!;
    const braco = r.find((s) => s.segmento === "bracoDireito")!;
    expect(braco.massaMagraKg).toBe(4.8);
    expect(braco.variacaoMassaMagraKg).toBe(0.3);
    expect(r).toHaveLength(5);
  });

  it("sem segmentos, devolve null; com uma só medição, sem variação", () => {
    expect(resumoSegmentos([reg(DATAS[0], "08:00")])).toBeNull();
    expect(resumoSegmentos([reg(DATAS[0], "08:00", { segmentos: seg(4.5) })])![0].variacaoMassaMagraKg).toBeNull();
  });
});
