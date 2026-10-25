import { describe, expect, it } from "vitest";
import { avaliarProntidao, avaliarVfc, deslocarRir, diasDaJanela, nivelBodyBattery, nivelSono, nivelTendencia, nivelVfc, type DiaGarmin, type DiaVfc } from "./prontidao";

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

  it("FC alta contra a própria média; sem histórico não opina", () => {
    const base = semana([50, 50, 50, 50, 50, 50, 50, 36], [50, 50, 50, 50, 50, 50, 50, 59]); // hoje = 24
    expect(nivelTendencia(base, "2026-10-24", "fcRepouso")).toBe("alerta");
    const ok = semana([50, 50, 50, 50, 50, 50, 50, 49], [50, 50, 50, 50, 50, 50, 50, 51]);
    expect(nivelTendencia(ok, "2026-10-24", "fcRepouso")).toBe("bom");
    expect(nivelTendencia(ok.slice(-3), "2026-10-24", "fcRepouso")).toBe("sem_dado");
    expect(nivelTendencia([], "2026-10-24", "fcRepouso")).toBe("sem_dado");
  });

  it("diasDaJanela renomeia bodyBattery para bodyBatteryAcordar", () => {
    expect(diasDaJanela([{ data: "d", sonoHoras: 1, sonoScore: 2, bodyBattery: 3, hrvMs: 4, fcRepouso: 5 }])[0]).toMatchObject({ bodyBatteryAcordar: 3, hrvMs: 4, fcRepouso: 5 });
  });
});

// ===== VFC contra a base pessoal =====

// `ontem` noites até hoje; base = ruído determinístico em torno de 50 ms.
const ruido = [0, 2, -2, 1, -1, 3, -3, 2, -2, 1, -1, 0, 2, -2, 1, -1, 3, -3, 2, -2, 1, -1, 0, 2, -2, 1, -1, 3, -3, 2, -2];
const somaDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// Base de `n` noites terminando 7 dias antes de HOJE, mais os últimos 7 dias com `recente`.
function serieVfc(n: number, recente: number[], base = 50): DiaVfc[] {
  const out: DiaVfc[] = [];
  for (let i = 0; i < n; i++) out.push({ data: somaDias(HOJE, -7 - i), hrvMs: base + ruido[i % ruido.length] });
  recente.forEach((v, i) => out.push({ data: somaDias(HOJE, -(recente.length - 1 - i)), hrvMs: v }));
  return out;
}

describe("avaliarVfc", () => {
  it("base curta não opina (os ~6 dias reais de hoje)", () => {
    const v = avaliarVfc(serieVfc(0, [43, 50, 40, 39, 42, 40]), HOJE);
    expect(v.nivel).toBe("sem_base");
    expect(v.motivo).toContain("0/14");
  });

  it("série estável é normal", () => {
    expect(avaliarVfc(serieVfc(28, [50, 49, 51, 50, 48, 52, 50]), HOJE).nivel).toBe("normal");
  });

  it("uma noite ruim isolada é absorvida pela média de 7 dias", () => {
    expect(avaliarVfc(serieVfc(28, [50, 50, 51, 49, 50, 50, 36]), HOJE).nivel).toBe("normal");
  });

  it("7 dias consistentemente abaixo da faixa", () => {
    expect(avaliarVfc(serieVfc(28, [48, 47, 49, 48, 47, 49, 48]), HOJE).nivel).toBe("abaixo");
  });

  it("queda grande e sustentada, com hoje também baixo, é muito_abaixo", () => {
    expect(avaliarVfc(serieVfc(28, [38, 37, 39, 36, 38, 37, 36]), HOJE).nivel).toBe("muito_abaixo");
  });

  it("sem leitura de hoje não opina", () => {
    const d = serieVfc(28, [38, 37, 39, 36, 38, 37, 36]).filter((x) => x.data !== HOJE);
    expect(avaliarVfc(d, HOJE).nivel).toBe("sem_base");
  });

  it("sem base própria, LOW/POOR da Garmin conta como abaixo; UNBALANCED e BALANCED não", () => {
    expect(avaliarVfc(serieVfc(0, [40]), HOJE, "LOW").nivel).toBe("abaixo");
    expect(avaliarVfc(serieVfc(0, [40]), HOJE, "poor").nivel).toBe("abaixo");
    expect(avaliarVfc(serieVfc(0, [40]), HOJE, "UNBALANCED").nivel).toBe("sem_base");
    expect(avaliarVfc(serieVfc(0, [40]), HOJE, "BALANCED").nivel).toBe("sem_base");
  });

  it("devolve a base e a faixa em ms", () => {
    const v = avaliarVfc(serieVfc(28, [50, 49, 51, 50, 48, 52, 50]), HOJE);
    expect(v.baseMs).toBeGreaterThan(48);
    expect(v.baseMs).toBeLessThan(52);
    expect(v.faixaMs![0]).toBeLessThan(v.baseMs!);
    expect(v.faixaMs![1]).toBeGreaterThan(v.baseMs!);
    expect(v.diasBase).toBe(28);
  });

  it("nivelVfc mapeia para o ícone do cartão", () => {
    expect(nivelVfc(null)).toBe("sem_dado");
    expect(nivelVfc(avaliarVfc(serieVfc(0, [40]), HOJE))).toBe("sem_dado");
    expect(nivelVfc(avaliarVfc(serieVfc(28, [48, 47, 49, 48, 47, 49, 48]), HOJE))).toBe("atencao");
    expect(nivelVfc(avaliarVfc(serieVfc(28, [38, 37, 39, 36, 38, 37, 36]), HOJE))).toBe("alerta");
    expect(nivelVfc(avaliarVfc(serieVfc(28, [50, 49, 51, 50, 48, 52, 50]), HOJE))).toBe("bom");
  });
});

describe("avaliarProntidao com VFC", () => {
  const abaixo = avaliarVfc(serieVfc(28, [48, 47, 49, 48, 47, 49, 48]), HOJE);
  const muito = avaliarVfc(serieVfc(28, [38, 37, 39, 36, 38, 37, 36]), HOJE);

  it("VFC abaixo sozinha só pede folga de esforço, sem cortar série", () => {
    const p = avaliarProntidao([dia()], HOJE, false, abaixo);
    expect(p.nivel).toBe("atencao");
    expect(p.ajuste).toMatchObject({ reduzirSeries: 0, rirExtra: 1 });
    expect(p.motivos.join(" ")).toContain("VFC");
    expect(p.fonte.vfc).toBe("abaixo");
  });

  it("VFC baixa com sono ruim vira baixa (reduz 1 série)", () => {
    const p = avaliarProntidao([dia({ sonoHoras: 5 })], HOJE, false, muito);
    expect(p.nivel).toBe("baixa");
    expect(p.ajuste?.reduzirSeries).toBe(1);
  });

  it("sem base ou sem argumento, nada muda", () => {
    const sem = avaliarVfc(serieVfc(0, [40]), HOJE);
    expect(avaliarProntidao([dia()], HOJE, false, sem).nivel).toBe("normal");
    expect(avaliarProntidao([dia()], HOJE, false).nivel).toBe("normal");
    expect(avaliarProntidao([dia({ sonoHoras: 5.5 })], HOJE, false, sem)).toMatchObject({ nivel: "atencao" });
  });

  it("deload mantém o nível e zera o ajuste", () => {
    const p = avaliarProntidao([dia({ sonoHoras: 5 })], HOJE, true, muito);
    expect(p.nivel).toBe("baixa");
    expect(p.ajuste).toBeNull();
  });

  it("VFC sozinha não substitui sono/Body Battery de hoje", () => {
    expect(avaliarProntidao([dia({ sonoHoras: null, sonoScore: null, bodyBatteryAcordar: null })], HOJE, false, muito).nivel).toBe("sem_dados");
  });
});
