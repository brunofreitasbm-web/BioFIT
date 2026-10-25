import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/garmin/sync/route";
import { converterAtividades, converterDia, estrutura, obterToken } from "../garminPersonal";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const DIA = "2026-10-24";
// 06:00 e 20:00 em Belém (UTC-3), em epoch ms
const ts = (hhmmUtc: string) => Date.parse(`${DIA}T${hhmmUtc}:00Z`);

const SONO = { dailySleepDTO: { sleepTimeSeconds: 25200, sleepScores: { overall: { value: 76 } } } };
const HRV = { hrvSummary: { lastNightAvg: 50, weeklyAvg: 48, status: "NONE" } };
const RESUMO = [{ calendarDate: DIA, restingHeartRate: 49, totalSteps: 7218, averageStressLevel: 21, bodyBatteryHighestValue: 91, bodyBatteryAtWakeTime: 88 }];
const BB = [{ bodyBatteryValuesArray: [[ts("06:00"), 40], [ts("09:00"), 85], [ts("23:00"), 99]] }]; // 03h, 06h e 20h em Belém
const ATIV = [
  { activityId: 24802113673, startTimeGMT: "2026-10-24 11:32:06", activityType: { typeKey: "strength_training" }, duration: 2656.4, averageHR: 86, maxHR: 119, calories: 197 },
  { activityId: 2, startTimeGMT: "2026-10-24 11:00:00", activityType: { typeKey: "walking" }, duration: 600 }, // sem FC
];

describe("converterDia", () => {
  it("lê os campos do Connect e prioriza o resumo diário", () => {
    expect(converterDia(DIA, { sono: SONO, hrv: HRV, resumo: RESUMO, bodyBattery: BB })).toEqual({
      data: DIA, vfc_noturna_ms: 50, vfc_status: null, vfc_media_semanal_ms: 48, fc_repouso_bpm: 49,
      sono_minutos: 420, sono_score: 76, body_battery_acordar: 88, body_battery_max: 91, estresse_medio: 21, passos: 7218,
    });
  });

  it("sem resumo, deriva Body Battery dos pares (acordar = maior antes do meio-dia em Belém)", () => {
    const l = converterDia(DIA, { sono: null, hrv: null, resumo: null, bodyBattery: BB })!;
    expect(l.body_battery_acordar).toBe(85);
    expect(l.body_battery_max).toBe(99);
  });

  it("aceita resumo como objeto único e estresse negativo vira nulo", () => {
    const l = converterDia(DIA, { sono: null, hrv: null, resumo: { totalSteps: 100, averageStressLevel: -1 }, bodyBattery: null })!;
    expect(l.passos).toBe(100);
    expect(l.estresse_medio).toBeNull();
  });

  it("lê o formato real do resumo v2 (heartRate.restingValue, stress.avgLevel, bodyBattery.maxValue)", () => {
    const real = { data: [{ calendarDate: DIA, heartRate: { minValue: 40, maxValue: 150, restingValue: 52 }, stress: { avgLevel: 27, maxLevel: 90 }, bodyBattery: { minValue: 10, maxValue: 93, latestValue: 40 }, respiration: { maxValue: 22 } }] };
    const l = converterDia(DIA, { sono: null, hrv: null, resumo: real, bodyBattery: null })!;
    // maxValue de heartRate (150) e de respiration não podem contaminar o Body Battery
    expect(l).toMatchObject({ fc_repouso_bpm: 52, estresse_medio: 27, body_battery_max: 93 });
  });

  it("passos vêm do endpoint de passos quando existir", () => {
    const l = converterDia(DIA, { sono: SONO, hrv: null, resumo: null, bodyBattery: null, passos: [{ calendarDate: DIA, totalSteps: 8123 }] })!;
    expect(l.passos).toBe(8123);
  });

  it("acha os campos do resumo em qualquer nível de aninhamento", () => {
    const aninhado = { allMetrics: { dias: [{ calendarDate: DIA, resumo: { restingHeartRate: 51, totalSteps: 4321, averageStressLevel: 30 } }] } };
    const l = converterDia(DIA, { sono: null, hrv: null, resumo: aninhado, bodyBattery: null })!;
    expect(l).toMatchObject({ fc_repouso_bpm: 51, passos: 4321, estresse_medio: 30 });
  });

  it("dia sem nenhuma métrica não gera linha", () => {
    expect(converterDia(DIA, { sono: null, hrv: null, resumo: [], bodyBattery: null })).toBeNull();
  });
});

describe("converterAtividades", () => {
  it("mapeia como o sync antigo e descarta sem FC", () => {
    expect(converterAtividades(ATIV)).toEqual([
      { garmin_activity_id: 24802113673, inicio_utc: "2026-10-24T11:32:06.000Z", tipo: "strength_training", duracao_s: 2656, fc_media: 86, fc_max: 119, calorias: 197, biofit_sessao_data: "2026-10-24" },
    ]);
    expect(converterAtividades({ activities: ATIV })).toHaveLength(1);
    expect(converterAtividades("x")).toEqual([]);
  });
});

describe("estrutura", () => {
  it("lista só nomes e tipos, nunca valores", () => {
    const e = estrutura({ a: { b: 1234, c: "segredo" }, l: [{ x: null }] });
    expect(e).toEqual(["a.b:number", "a.c:string", "l[]", "l[].x:null"]);
    expect(e.join()).not.toContain("1234");
  });
});

describe("obterToken", () => {
  it("usa ApiKey, aceita texto puro e nunca devolve a chave no erro", async () => {
    const f = vi.fn(async (_u: string, _i: { headers: Record<string, string> }) => new Response(" eyJ.tok.en \n"));
    vi.stubGlobal("fetch", f);
    expect(await obterToken("CHAVE-SECRETA")).toBe("eyJ.tok.en");
    expect(f.mock.calls[0][0]).toBe("https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token");
    expect(f.mock.calls[0][1].headers.Authorization).toBe("ApiKey CHAVE-SECRETA");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    const erro = await obterToken("CHAVE-SECRETA").catch((e: Error) => e);
    expect((erro as Error).message).toMatch(/401.*expirada/);
    expect((erro as Error).message).not.toContain("CHAVE-SECRETA");
  });

  it("aceita JSON com access_token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "abc" }))));
    expect(await obterToken("k")).toBe("abc");
  });
});

describe("GET /api/garmin/sync", () => {
  const CRON = "c".repeat(32);
  const req = (auth?: string) => new Request("http://x/api/garmin/sync", { headers: auth ? { authorization: auth } : {} });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${DIA}T10:00:00Z`)); // 07:00 em Belém
    vi.stubEnv("CRON_SECRET", CRON);
    vi.stubEnv("GARMIN_PERSONAL_API_KEY", "CHAVE-SECRETA");
    vi.stubEnv("SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("BIOFIT_DB_SECRET", "segredo");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function garminFalso(falhaEm?: string) {
    const f = vi.fn(async (url: string, init?: { body?: string }) => {
      const u = String(url);
      if (u.includes("/token")) return new Response("tok.en.jwt");
      if (u.includes("biofit_garmin_put")) return new Response(JSON.stringify({ diario: 2, treinos: 1 }));
      if (falhaEm && u.includes(falhaEm)) return new Response("x", { status: 500 });
      if (u.includes("dailySleep")) return new Response(JSON.stringify(SONO));
      if (u.includes("/hrv-service/")) return new Response(JSON.stringify(HRV));
      if (u.includes("dailysummaries")) return new Response(JSON.stringify(RESUMO));
      if (u.includes("stats/steps")) return new Response(JSON.stringify([{ calendarDate: DIA, totalSteps: 5000 }]));
      if (u.includes("bodyBattery")) return new Response(JSON.stringify(BB));
      if (u.includes("activities/search")) return new Response(JSON.stringify(ATIV));
      return new Response("", { status: 404 });
    });
    vi.stubGlobal("fetch", f);
    return f;
  }

  it("recusa sem o segredo do cron e não chama a Garmin", async () => {
    const f = garminFalso();
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer errado"))).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it("troca a chave, busca ontem e hoje e grava via biofit_garmin_put", async () => {
    const f = garminFalso();
    const r = await GET(req(`Bearer ${CRON}`));
    expect(r.status).toBe(200);
    const corpoResp = await r.json();
    expect(corpoResp).toMatchObject({ ok: true, diario: 2, treinos: 1, falhas: [] });
    expect(corpoResp.formato.resumo.length).toBeGreaterThan(0); // só nomes, sem valores
    expect(JSON.stringify(corpoResp)).not.toContain("7218");
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("dailySleep?date=2026-10-23"))).toBe(true);
    expect(urls.some((u) => u.includes("dailySleep?date=2026-10-24"))).toBe(true);
    const put = f.mock.calls.find((c) => String(c[0]).includes("biofit_garmin_put"))!;
    const corpo = JSON.parse(put[1]!.body!);
    expect(corpo.p_diario.map((d: { data: string }) => d.data)).toEqual(["2026-10-23", "2026-10-24"]);
    expect(corpo.p_treinos).toHaveLength(1);
    // a chave só vai na troca de token
    expect(JSON.stringify(corpo)).not.toContain("CHAVE-SECRETA");
  });

  it("um endpoint fora do ar não impede gravar o resto", async () => {
    garminFalso("hrv-service");
    const r = await GET(req(`Bearer ${CRON}`));
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.falhas.join()).toContain("hrv-service");
  });

  it("chave inválida: 502 com mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    const r = await GET(req(`Bearer ${CRON}`));
    expect(r.status).toBe(502);
    expect((await r.json()).detalhe).toMatch(/expirada/);
  });

  it("sem a variável da chave: 503", async () => {
    vi.stubEnv("GARMIN_PERSONAL_API_KEY", "");
    expect((await GET(req(`Bearer ${CRON}`))).status).toBe(503);
  });
});
