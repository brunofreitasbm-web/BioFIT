import { describe, expect, it } from "vitest";
import { avaliarProntidao, deslocarRir, type DiaGarmin } from "./prontidao";

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
