import { describe, expect, it } from "vitest";
import { getStatusPrograma } from "./program";
import type { RegistroSessao } from "./tipos";

const sessao = (data: string, sessaoTipo: RegistroSessao["sessaoTipo"]): RegistroSessao => ({
  data,
  sessaoTipo,
  inicioISO: `${data}T10:00:00.000Z`,
  fimISO: `${data}T11:00:00.000Z`,
  atualizadoEm: `${data}T11:00:00.000Z`,
});

describe("getStatusPrograma — meso 1 encerrado sem deload", () => {
  const antigas = { "2026-10-26": [sessao("2026-10-26", "E")] };

  it("com só o histórico do meso 1, já está no meso 2, rodada 1", () => {
    const s = getStatusPrograma("2026-10-04", "2026-10-27", "A", { log: [], sessoes: antigas });
    expect(s).toMatchObject({ meso: 2, rodada: 1, isDeload: false, concluidasNaRodada: 0 });
  });

  it("sessões novas avançam a rodada do meso 2", () => {
    const sessoes = { ...antigas, "2026-10-27": [sessao("2026-10-27", "A")], "2026-10-28": [sessao("2026-10-28", "B")] };
    const s = getStatusPrograma("2026-10-04", "2026-10-29", "C", { log: [], sessoes });
    expect(s).toMatchObject({ meso: 2, rodada: 1, concluidasNaRodada: 2 });
  });
});
