import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as webhook } from "@/app/api/garmin/webhook/[token]/route";
import { POST as mcp } from "@/app/api/mcp/[[...token]]/route";
import { converterPayload } from "../garminHealth";
import { montarDados, HOJE } from "./fixture";
import { instalarSupabaseFalso } from "./supabaseFalso";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// 2026-10-22 08:00 em Belém (UTC-3) = 11:00Z
const INICIO = Date.parse("2026-10-22T11:00:00Z") / 1000;

const PAYLOAD = {
  dailies: [{ userId: "u1", calendarDate: "2026-10-22", steps: 7218.0, restingHeartRateInBeatsPerMinute: 49, averageStressLevel: 21 }],
  sleeps: [{ userId: "u1", calendarDate: "2026-10-22", durationInSeconds: 26000, deepSleepDurationInSeconds: 5400, lightSleepDurationInSeconds: 14400, remSleepInSeconds: 5400, overallSleepScore: { value: 76, qualifierKey: "FAIR" } }],
  hrv: [{ userId: "u1", calendarDate: "2026-10-22", lastNightAvg: 50 }],
  stressDetails: [
    {
      userId: "u1",
      calendarDate: "2026-10-22",
      startTimeInSeconds: Date.parse("2026-10-22T03:00:00Z") / 1000, // 00:00 em Belém
      startTimeOffsetInSeconds: -10800,
      timeOffsetBodyBatteryValues: { "0": 40, "21600": 91, "50400": 70, "90000": 99 }, // 00:00, 06:00, 14:00 e (dia seguinte) 01:00
    },
  ],
  activities: [
    { userId: "u1", activityId: 24802113673, activityType: "STRENGTH_TRAINING", startTimeInSeconds: INICIO, durationInSeconds: 2656.2, averageHeartRateInBeatsPerMinute: 86, maxHeartRateInBeatsPerMinute: 119, activeKilocalories: 197 },
    { userId: "u1", activityId: 1, activityType: "WALKING", startTimeInSeconds: INICIO, durationInSeconds: 600 }, // sem FC: treino importado
  ],
  epochs: [{ userId: "u1" }],
};

describe("converterPayload", () => {
  it("junta os resumos do mesmo dia numa linha só", () => {
    const c = converterPayload(PAYLOAD);
    expect(c.diario).toEqual([
      {
        data: "2026-10-22", vfc_noturna_ms: 50, vfc_status: null, vfc_media_semanal_ms: null, fc_repouso_bpm: 49,
        sono_minutos: 420, sono_score: 76, body_battery_acordar: 91, body_battery_max: 91, estresse_medio: 21, passos: 7218,
      },
    ]);
    expect(c.usuarios).toEqual(["u1"]);
    expect(c.ignorados).toEqual({ atividade_descartada: 1, epochs: 1 });
  });

  it("mapeia a atividade e usa o dia de Belém", () => {
    expect(converterPayload(PAYLOAD).treinos).toEqual([
      { garmin_activity_id: 24802113673, inicio_utc: "2026-10-22T11:00:00.000Z", tipo: "strength_training", duracao_s: 2656, fc_media: 86, fc_max: 119, calorias: 197, biofit_sessao_data: "2026-10-22" },
    ]);
  });

  it("estresse -1 (sem dados) vira nulo e dia sem métrica não gera linha", () => {
    const c = converterPayload({ dailies: [{ calendarDate: "2026-10-22", averageStressLevel: -1 }] });
    expect(c.diario).toEqual([]);
  });

  it("filtra por userId e lixo não derruba", () => {
    expect(converterPayload(PAYLOAD, "outro").diario).toEqual([]);
    expect(converterPayload("x").diario).toEqual([]);
    expect(converterPayload({ sleeps: [{ calendarDate: "ontem" }, null, 3] }).diario).toEqual([]);
  });
});

describe("webhook /api/garmin/webhook/[token]", () => {
  const TOKEN = "w".repeat(32);
  const req = (corpo: unknown, bruto?: string) =>
    new Request("http://x/api/garmin/webhook/t", { method: "POST", body: bruto ?? JSON.stringify(corpo) });

  function instalar(status = 200) {
    vi.stubEnv("GARMIN_WEBHOOK_TOKEN", TOKEN);
    vi.stubEnv("SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("BIOFIT_DB_SECRET", "segredo");
    const f = vi.fn(async (_url: string, _init: { body: string }) => new Response(JSON.stringify({ diario: 1, treinos: 1 }), { status }));
    vi.stubGlobal("fetch", f);
    return f;
  }

  it("recusa token errado ou ausente sem tocar no banco", async () => {
    const f = instalar();
    expect((await webhook(req(PAYLOAD), { params: { token: "errado" } })).status).toBe(401);
    vi.stubEnv("GARMIN_WEBHOOK_TOKEN", "");
    expect((await webhook(req(PAYLOAD), { params: { token: "" } })).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it("grava via RPC biofit_garmin_put", async () => {
    const f = instalar();
    const r = await webhook(req(PAYLOAD), { params: { token: TOKEN } });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, diario: 1, treinos: 1 });
    expect(String(f.mock.calls[0][0])).toContain("/rest/v1/rpc/biofit_garmin_put");
    const corpo = JSON.parse(f.mock.calls[0][1].body);
    expect(corpo.p_secret).toBe("segredo");
    expect(corpo.p_diario[0].sono_minutos).toBe(420);
    expect(corpo.p_treinos).toHaveLength(1);
  });

  it("JSON inválido é 400 e falha do banco é 502 (Garmin reenvia)", async () => {
    const f = instalar();
    expect((await webhook(req(null, "{"), { params: { token: TOKEN } })).status).toBe(400);
    f.mockImplementationOnce(async () => new Response("{}", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await webhook(req(PAYLOAD), { params: { token: TOKEN } })).status).toBe(502);
  });

  it("entrega sem resumos conhecidos é 200 e não grava", async () => {
    const f = instalar();
    const r = await webhook(req({ epochs: [{ userId: "u1" }] }), { params: { token: TOKEN } });
    expect(r.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("ferramenta recuperacao_garmin", () => {
  it("devolve série, médias e idade do último dado", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${HOJE}T15:00:00Z`));
    const banco = instalarSupabaseFalso(montarDados());
    const base = globalThis.fetch;
    const diario = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(`${HOJE}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 2 - i); // último dado é de 2 dias atrás
      return { data: d.toISOString().slice(0, 10), sono_minutos: 420, sono_score: 80, vfc_noturna_ms: i < 7 ? 40 : 50, fc_repouso_bpm: 50, body_battery_acordar: 85, estresse_medio: 20, passos: 5000 };
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) =>
      url.includes("biofit_garmin_get") ? new Response(JSON.stringify({ diario, treinos: [] })) : base(url, init as never)));
    vi.stubEnv("MCP_TOKEN", "t".repeat(32));

    const r = await mcp(
      new Request("http://x/api/mcp", {
        method: "POST",
        headers: { authorization: `Bearer ${"t".repeat(32)}`, "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "recuperacao_garmin", arguments: { dias: 5 } } }),
      }),
      { params: {} },
    );
    const json = JSON.parse(((await r.json()) as { result: { content: { text: string }[] } }).result.content[0].text);
    expect(banco.gravacoes).toBe(0);
    expect(json.diasDesdeUltimoDado).toBe(2);
    expect(json.serie).toHaveLength(5);
    expect(json.serie[4].data).toBe(json.ultimoDado);
    expect(json.mediaUltimos7Dias.hrvMs).toBe(40);
    expect(json.mediaDos21DiasAnteriores.hrvMs).toBe(50);
    expect(json.avisos).toContain("Sem dado de hoje: o relógio ainda não sincronizou.");
  });
});
