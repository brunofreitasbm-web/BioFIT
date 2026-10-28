import { describe, expect, it } from "vitest";
import { celulasDoMeso, diasDoMeso } from "./mapaMeso";

describe("diasDoMeso", () => {
  it("as sessões depois do corte entram no meso 2, na ordem", () => {
    expect(diasDoMeso(2, ["2026-10-27", "2026-10-28", "2026-11-02"])).toEqual(["27", "28", "02"]);
  });

  it("a 26ª sessão depois do corte já é do meso 3", () => {
    const datas = Array.from({ length: 26 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, "0")}`);
    expect(diasDoMeso(2, datas)).toHaveLength(25);
    expect(diasDoMeso(3, datas)).toHaveLength(1);
  });

  it("meso 1 não tem sessões neste mapa", () => {
    expect(diasDoMeso(1, ["2026-10-27"])).toEqual([]);
  });
});

describe("celulasDoMeso", () => {
  it("meso recém-aberto: só a primeira é a da vez", () => {
    const g = celulasDoMeso(0, []);
    expect(g).toHaveLength(5);
    expect(g[0][0]).toEqual({ estado: "daVez", dia: null });
    expect(g[0][1].estado).toBe("pendente");
  });

  it("marca como feitas as anteriores, com o dia", () => {
    const g = celulasDoMeso(7, ["27", "28", "29", "30", "31", "01", "02"]);
    expect(g[0].every((c) => c.estado === "feita")).toBe(true);
    expect(g[1][0]).toEqual({ estado: "feita", dia: "01" });
    expect(g[1][2]).toEqual({ estado: "daVez", dia: null });
    expect(g[4][4].estado).toBe("pendente");
  });
});
