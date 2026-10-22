import { describe, expect, it } from "vitest";
import type { MedicaoBioimpedancia } from "../bioimpedancia";
import type { SerieRegistrada } from "../tipos";
import { cruzarIntervalos } from "./contextoIntegrado";
import { formatarContextoParaPrompt, type GarminJanela } from "./prompts";

function med(data: string, o: Partial<MedicaoBioimpedancia> = {}): MedicaoBioimpedancia {
  return {
    data,
    pesoKg: 90,
    gorduraPct: 20,
    massaMagraKg: 70,
    massaMuscularEsqueleticaKg: null,
    gorduraVisceral: 8,
    aguaCorporalPct: null,
    tmbKcal: null,
    idadeMetabolica: null,
    ...o,
  };
}

function serie(data: string, n = 1): SerieRegistrada {
  return { exercicioId: "supino", data, serieNumero: n, cargaKg: 60, reps: 10, rir: 2 } as SerieRegistrada;
}

const garmin: GarminJanela = {
  diario: [
    { data: "2026-05-03", sonoHoras: 7, sonoScore: 80, hrvMs: 50, fcRepouso: 50, passos: 8000, estresse: 20, bodyBattery: 80 },
    { data: "2026-05-04", sonoHoras: 6, sonoScore: 70, hrvMs: 40, fcRepouso: 54, passos: 6000, estresse: 25, bodyBattery: 60 },
  ],
  treinos: [],
};

describe("cruzarIntervalos", () => {
  const medicoes = [med("2026-05-01"), med("2026-05-15", { pesoKg: 91, gorduraPct: 19, massaMagraKg: 71 })];

  it("calcula variações e a carga de treino do intervalo (14 dias = 2 semanas)", () => {
    const log = [serie("2026-05-02"), serie("2026-05-02", 2), serie("2026-05-04"), serie("2026-05-04", 2)];
    const [c] = cruzarIntervalos(medicoes, log, null);
    expect(c).toMatchObject({ de: "2026-05-01", ate: "2026-05-15", dias: 14 });
    expect(c.delta).toEqual({ pesoKg: 1, gorduraPp: -1, massaMagraKg: 1 });
    expect(c.treino).toEqual({ treinosPorSemana: 1, seriesPorSemana: 2 });
  });

  it("exclui o dia da medição anterior e inclui o da seguinte", () => {
    const log = [serie("2026-05-01"), serie("2026-05-15")];
    const [c] = cruzarIntervalos(medicoes, log, null);
    expect(c.treino.seriesPorSemana).toBe(0.5);
  });

  it("média do Garmin só dos dias dentro do intervalo; sem dados vira null, não zero", () => {
    expect(cruzarIntervalos(medicoes, [], garmin)[0].garmin).toEqual({
      diasComDados: 2,
      sonoHoras: 6.5,
      fcRepouso: 52,
      hrvMs: 45,
      passos: 7000,
    });
    expect(cruzarIntervalos(medicoes, [], null)[0].garmin).toBeNull();
    expect(cruzarIntervalos(medicoes, [], { diario: [], treinos: [] })[0].garmin).toBeNull();
  });

  it("devolve só os últimos intervalos e nada com uma única medição", () => {
    const muitas = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"].map((d) => med(d));
    expect(cruzarIntervalos(muitas, [], null, 2).map((c) => c.ate)).toEqual(["2026-05-01", "2026-06-01"]);
    expect(cruzarIntervalos([med("2026-01-01")], [], null)).toEqual([]);
  });

  it("variação com campo ausente fica null em vez de NaN", () => {
    const [c] = cruzarIntervalos([med("2026-05-01", { gorduraPct: null }), med("2026-05-15")], [], null);
    expect(c.delta.gorduraPp).toBeNull();
  });
});

describe("formatarContextoParaPrompt com dados integrados", () => {
  const ctx = {
    bioimpedancia: {
      data: "2026-10-20",
      pesoKg: 92,
      gorduraPct: 24.5,
      historico: [
        { data: "2026-06-03", hora: "17:09:49", pesoKg: 90.3, gorduraPct: 22.9, massaGorduraKg: 20.7, massaMagraKg: 64.4, gorduraVisceral: 9, suspeita: "salto de gordura incompatível com 17 dias" },
        { data: "2026-10-20", hora: "08:06:24", pesoKg: 92, gorduraPct: 24.5, massaGorduraKg: 22.5, massaMagraKg: 64.2, gorduraVisceral: 10 },
      ],
      analise: {
        veredito: "ganho_sem_retorno",
        leituraProvisoria: null,
        confianca: "media" as const,
        leituras: 5,
        periodo: { inicio: "2026-04-27", fim: "2026-10-20" },
        explicacao: "Gordura subiu 5 pp.",
        avisos: ["Intervalo de 90 dias sem medição."],
        porMes: { gorduraPct: 0.9 },
        forcaVariacaoPct: 3.2,
      },
    },
    treinoRecente: {
      janelaDias: 28,
      treinosPorSemana: 4,
      seriesPorSemana: [{ grupo: "Peito", series: 12 }],
      forcaVariacaoPct: 3.2,
      evolucao: [{ nome: "Supino", anterior1RM: 80, atual1RM: 82, variacaoPct: 2.5 }],
    },
    garminJanela: garmin,
    cruzamentos: cruzarIntervalos([med("2026-05-01"), med("2026-05-15")], [], garmin),
  };

  it("inclui veredito, avisos, artefato, treino, Garmin e cruzamento, cada um em uma linha própria", () => {
    const texto = formatarContextoParaPrompt(ctx);
    expect(texto).toContain('veredito "ganho_sem_retorno", confiança media');
    expect(texto).toContain("Avisos: Intervalo de 90 dias");
    expect(texto).toContain("⚠ possível artefato: salto de gordura");
    expect(texto).toContain("4 treinos/semana");
    expect(texto).toContain("Peito 12");
    expect(texto).toContain("Garmin, 2 dias com dados");
    expect(texto).toContain("2026-05-01 → 2026-05-15 (14 dias)");
    // nenhuma quebra de linha solta dentro de um item
    expect(texto.split("\n").every((l) => l.trim() === "" || l.startsWith("•") || l.startsWith("  "))).toBe(true);
  });

  it("sem os blocos novos o texto continua válido (contexto antigo)", () => {
    expect(formatarContextoParaPrompt({ bioimpedancia: { data: "2026-10-20", pesoKg: 92 } })).toContain("Bioimpedância (2026-10-20): Peso: 92kg");
  });
});
