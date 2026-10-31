import { describe, expect, it } from "vitest";
import { montarDadosPainel } from "@/lib/recuperacao/painel";
import { montarPainelGarmin, montarRespostaGarmin, resumirRecuperacao, type DadosGarminBrutos } from "../garmin";

function brutos(): DadosGarminBrutos {
  const diario = Array.from({ length: 30 }, (_, i) => ({
    data: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10),
    vfc_noturna_ms: 40 + (i % 5),
    fc_repouso_bpm: 50 + (i % 3),
    sono_minutos: 450,
    sono_score: i === 29 ? 0 : 80,
    sono_profundo_min: 80,
    sono_rem_min: 90,
    body_battery_acordar: 80,
    prontidao_score: 66,
  }));
  return {
    diario,
    treinos: [
      {
        inicio_utc: "2026-10-20T20:00:00+00:00",
        biofit_sessao_data: "2026-10-20",
        tipo: "strength_training",
        duracao_s: 3600,
        fc_media: 120,
        fc_max: 170,
        zonas_fc_s: [600, 1200, 1200, 600, 0],
      },
    ],
    intraday: [
      { data: "2026-10-30", tipo: "body_battery", pontos: [[1, 50], [2, 60], "lixo"] },
      { data: "2026-10-30", tipo: "desconhecido", pontos: [[1, 1]] },
    ],
  };
}

describe("montarRespostaGarmin", () => {
  it("mantém o contrato do card e preserva sono_score 0", () => {
    const r = montarRespostaGarmin(brutos())!;
    expect(r.disponivel).toBe(true);
    expect(r.biometria.sonoScore).toBe(0); // o bug do "0" solto estava na UI, não aqui
    expect(r.biometria.sonoHoras).toBe(7.5);
    expect(r.janela.diario).toHaveLength(30);
    expect(r.janela.treinos[0]).toMatchObject({ data: "2026-10-20", duracaoMin: 60 });
    expect(r.janela.recuperacao?.prontidaoBiofit).not.toBeNull();
  });

  it("sem dias devolve null", () => {
    expect(montarRespostaGarmin({ diario: [], treinos: [], intraday: [] })).toBeNull();
  });
});

describe("montarPainelGarmin", () => {
  it("mapeia colunas, ordena e descarta curvas inválidas", () => {
    const p = montarPainelGarmin(brutos());
    expect(p.dias[0].data < p.dias[29].data).toBe(true);
    expect(p.dias[0]).toMatchObject({ sonoProfundoMin: 80, prontidaoGarmin: 66 });
    expect(p.treinos[0].zonasFcS).toEqual([600, 1200, 1200, 600, 0]);
    expect(p.intraday).toHaveLength(1);
    expect(p.intraday[0].pontos).toEqual([[1, 50], [2, 60]]);
  });
});

describe("recuperação a partir do Garmin", () => {
  it("calcula prontidão e carga só com o relógio", () => {
    const d = montarDadosPainel(montarPainelGarmin(brutos()), []);
    expect(d?.prontidaoHoje.score).not.toBeNull();
    expect(d?.carga.length).toBeGreaterThan(20);
    const r = resumirRecuperacao(brutos());
    expect(r?.sonoRemMin).toBe(90);
    expect(r?.alertas).toEqual([]);
  });
});
