import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/garmin/today/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function instalarGarminFalso(resposta: unknown, status = 200) {
  vi.stubEnv("SUPABASE_URL", "https://fake.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("BIOFIT_DB_SECRET", "segredo");
  const fetchFalso = vi.fn(async (_url: string) => new Response(JSON.stringify(resposta), { status }));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

describe("GET /api/garmin/today (Supabase)", () => {
  it("monta a biometria a partir do RPC biofit_garmin_get", async () => {
    const f = instalarGarminFalso({
      diario: [
        { data: "2026-10-22", sono_minutos: 420, sono_score: 80, vfc_noturna_ms: 55, vfc_status: "BALANCED", fc_repouso_bpm: 50, body_battery_acordar: 88, estresse_medio: 20, passos: 1000 },
        { data: "2026-10-21", sono_minutos: 345, body_battery_max: 91 },
      ],
      treinos: [{ biofit_sessao_data: "2026-10-21", tipo: "strength_training", duracao_s: 2656, fc_media: 86.4, calorias: 197 }],
    });

    const corpo = await (await GET()).json();

    expect(String(f.mock.calls[0][0])).toContain("/rest/v1/rpc/biofit_garmin_get");
    expect(corpo.disponivel).toBe(true);
    expect(corpo.biometria).toMatchObject({ data: "2026-10-22", bodyBattery: 88, sonoHoras: 7, sonoScore: 80, hrvStatus: "BALANCED", fcRepouso: 50 });
    expect(corpo.janela.diario.map((d: { data: string }) => d.data)).toEqual(["2026-10-21", "2026-10-22"]);
    expect(corpo.janela.treinos[0]).toMatchObject({ tipo: "strength_training", duracaoMin: 44, fcMedia: 86 });
  });

  it("sem dias no banco: indisponível, sem erro", async () => {
    instalarGarminFalso({ diario: [], treinos: [] });
    expect(await (await GET()).json()).toEqual({ disponivel: false, biometria: null });
  });

  it("falha do Supabase vira 500 em vez de mostrar dado velho", async () => {
    instalarGarminFalso({ message: "unauthorized" }, 400);
    const r = await GET();
    expect(r.status).toBe(500);
    expect((await r.json()).disponivel).toBe(false);
  });
});
