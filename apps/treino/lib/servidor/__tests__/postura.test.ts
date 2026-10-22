import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEY_POSTURA } from "@/lib/dados";
import { POST } from "@/app/api/mcp/[[...token]]/route";
import type { RegistroPostura } from "@/lib/tipos";
import { HOJE, montarDados } from "./fixture";
import { instalarSupabaseFalso } from "./supabaseFalso";
import { _reiniciarGravacaoCondicional } from "../backup";
import { FERRAMENTAS } from "../ferramentas";

const TOKEN = "t".repeat(32);

beforeEach(() => {
  _reiniciarGravacaoCondicional();
  vi.stubEnv("MCP_TOKEN", TOKEN);
  vi.stubEnv("SYNC_TOKEN", "s".repeat(32));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${HOJE}T15:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function chamar(name: string, args: Record<string, unknown> = {}) {
  const req = new Request("http://x/api/mcp", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
  const r = (await (await POST(req, { params: {} })).json()) as { result: { isError?: boolean; content: { text: string }[] } };
  const texto = r.result.content[0].text;
  return { erro: r.result.isError === true, texto, json: r.result.isError ? null : JSON.parse(texto) };
}

function captura(data: string, n: number, cif: number, cva: number): RegistroPostura {
  const quando = `${data}T08:0${n}:00`;
  return {
    chave: `postura:${quando}:perfil`,
    vista: "perfil",
    data,
    quando,
    proporcao: 0.75,
    pontos: {},
    medidas: { anguloCifose: cif, indiceCifose: cif / 3, cva, inclinacaoTronco: 1 },
    confiancaDeteccao: 0.9,
    registradoEm: `${quando}.000Z`,
  };
}

function comPostura(): Record<string, string> {
  const regs = ["2026-08-01", "2026-08-22", "2026-09-12", "2026-10-03"].flatMap((d, i) => [0, 1, 2].map((n) => captura(d, n, 46 - i * 3 + n, 44 + i * 3 - n)));
  return { ...montarDados(), [KEY_POSTURA]: JSON.stringify(Object.fromEntries(regs.map((r) => [r.chave, r]))) };
}

describe("evolucao_postura", () => {
  it("sem capturas, orienta a fazer a primeira no app", async () => {
    instalarSupabaseFalso(montarDados());
    const { json } = await chamar("evolucao_postura");
    expect(json.capturas).toBe(0);
    expect(json.mensagem).toMatch(/Nova avaliação/);
  });

  it("devolve sessões (mediana do dia) e a análise", async () => {
    instalarSupabaseFalso(comPostura());
    const { json } = await chamar("evolucao_postura", { limite: 2 });
    expect(json.totalCapturas).toBe(12);
    expect(json.perfil).toHaveLength(2);
    expect(json.perfil[1]).toMatchObject({ data: "2026-10-03", capturas: 3, medidas: { anguloCifose: 38 } });
    expect(json.frontal).toEqual([]);
    expect(json.analise.veredito).toBe("cifose_melhorando");
    expect(json.analise.confianca).toBe("media");
  });

  it("limite inválido é erro", async () => {
    instalarSupabaseFalso(comPostura());
    expect((await chamar("evolucao_postura", { limite: 0 })).erro).toBe(true);
  });

  it("está registrada como leitura", () => {
    const f = FERRAMENTAS.find((x) => x.name === "evolucao_postura");
    expect(f?.tipo).toBe("leitura");
  });
});
