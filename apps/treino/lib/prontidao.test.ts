import { describe, expect, it } from "vitest";
import { avaliarProntidao, deslocarRir, diasDaJanela, nivelBodyBattery, nivelSono, nivelTendencia, type DiaGarmin } from "./prontidao";

const HOJE = "2026-10-24";
const dia = (o: Partial<DiaGarmin> = {}): DiaGarmin => ({ data: HOJE, sonoHoras: 7.5, sonoScore: 80, bodyBatteryAcordar: 85, ...o });

describe("avaliarProntidao", () => {
  it("sem linha de hoje não ajusta (dado de ontem não vale)", () => {
    const p = avaliarProntidao([dia({ data: "2026-10-23", sonoHoras: 3 })], HOJE, false);
    expect(p.nivel).toBe("sem_dados");
    expect(p.ajuste).toBeNull();
  });

  it("linha de hoje sem nenhuma medida também é sem_dados", () => {
    expect(avaliarProntidao([dia({ sonoHoras: null, sonoScore: null, bodyBatteryAcordar: null })], HOJE, false).nivel).toBe("sem_dados");
  });

  it("tudo bom é normal e sem ajuste", () => {
    const p = avaliarProntidao([dia()], HOJE, false);
    expect(p).toMatchObject({ nivel: "normal", ajuste: null });
  });

  it("um domínio ruim só pede folga de esforço, sem cortar série", () => {
    const p = avaliarProntidao([dia({ sonoHoras: 5.5 })], HOJE, false);
    expect(p.nivel).toBe("atencao");
    expect(p.ajuste).toMatchObject({ reduzirSeries: 0, rirExtra: 1, naoProgredirCarga: true });
    expect(avaliarProntidao([dia({ bodyBatteryAcordar: 25 })], HOJE, false).ajuste?.reduzirSeries).toBe(0);
  });

  it("sono e Body Battery ruins juntos reduzem 1 série", () => {
    const p = avaliarProntidao([dia({ sonoHoras: 4.5, bodyBatteryAcordar: 35 })], HOJE, false);
    expect(p.nivel).toBe("baixa");
    expect(p.ajuste?.reduzirSeries).toBe(1);
    expect(p.motivos.join(" ")).toContain("Body Battery");
  });

  it("score de sono baixo conta mesmo com horas ok", () => {
    expect(avaliarProntidao([dia({ sonoScore: 45, bodyBatteryAcordar: 40 })], HOJE, false).nivel).toBe("baixa");
  });

  it("limiar é estrito: 6 h, score 60 e BB 50 ainda são normais", () => {
    expect(avaliarProntidao([dia({ sonoHoras: 6, sonoScore: 60, bodyBatteryAcordar: 50 })], HOJE, false).nivel).toBe("normal");
  });

  it("deload mantém o nível mas não ajusta nada", () => {
    const p = avaliarProntidao([dia({ sonoHoras: 4, bodyBatteryAcordar: 20 })], HOJE, true);
    expect(p.nivel).toBe("baixa");
    expect(p.ajuste).toBeNull();
  });
});

describe("deslocarRir", () => {
  it("soma nos dois extremos e preserva texto fora do padrão", () => {
    expect(deslocarRir("1-2", 1)).toBe("2-3");
    expect(deslocarRir("0-1", 1)).toBe("1-2");
    expect(deslocarRir("0 na última", 1)).toBe("0 na última");
  });
});

describe("status por métrica", () => {
  it("sono e Body Battery usam os mesmos limiares da prontidão", () => {
    expect(nivelSono(4.5, null)).toBe("alerta");
    expect(nivelSono(5.5, 80)).toBe("atencao");
    expect(nivelSono(7.5, 45)).toBe("alerta");
    expect(nivelSono(6, 60)).toBe("bom");
    expect(nivelSono(null, null)).toBe("sem_dado");
    expect(nivelBodyBattery(25)).toBe("alerta");
    expect(nivelBodyBattery(45)).toBe("atencao");
    expect(nivelBodyBattery(50)).toBe("bom");
    expect(nivelBodyBattery(null)).toBe("sem_dado");
  });

  const semana = (hrv: number[], fc: number[]): DiaGarmin[] =>
    hrv.map((h, i) => ({ data: `2026-10-${String(17 + i).padStart(2, "0")}`, sonoHoras: 7, sonoScore: 80, bodyBatteryAcordar: 80, hrvMs: h, fcRepouso: fc[i] }));

  it("VFC baixa e FC alta contra a própria média; sem histórico não opina", () => {
    const base = semana([50, 50, 50, 50, 50, 50, 50, 36], [50, 50, 50, 50, 50, 50, 50, 59]); // hoje = 24
    expect(nivelTendencia(base, "2026-10-24", "hrvMs")).toBe("alerta");
    expect(nivelTendencia(base, "2026-10-24", "fcRepouso")).toBe("alerta");
    const ok = semana([50, 50, 50, 50, 50, 50, 50, 49], [50, 50, 50, 50, 50, 50, 50, 51]);
    expect(nivelTendencia(ok, "2026-10-24", "hrvMs")).toBe("bom");
    expect(nivelTendencia(ok.slice(-3), "2026-10-24", "hrvMs")).toBe("sem_dado");
    expect(nivelTendencia([], "2026-10-24", "hrvMs")).toBe("sem_dado");
  });

  it("diasDaJanela renomeia bodyBattery para bodyBatteryAcordar", () => {
    expect(diasDaJanela([{ data: "d", sonoHoras: 1, sonoScore: 2, bodyBattery: 3, hrvMs: 4, fcRepouso: 5 }])[0]).toMatchObject({ bodyBatteryAcordar: 3, hrvMs: 4, fcRepouso: 5 });
  });
});
