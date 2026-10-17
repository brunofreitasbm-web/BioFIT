import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEY_CORPO, KEY_ORIGEM, dadosDoBackup } from "@/lib/dados";
import { POST } from "@/app/api/mcp/[[...token]]/route";
import { CODIGO, DATAS_MANHA, DATAS_MISTAS, LINK, NOME_PESSOA, SEGREDO, avaliacao, relatorioFalso } from "./avanutriFixture";
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

// Põe a API da Avanutri falsa na frente do Supabase falso. `chamadas` registra os hosts acessados.
function instalarAvanutri(corpo: unknown, status = 200) {
  const supabase = globalThis.fetch;
  const chamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      if (url.startsWith("https://balancaapi.avanutrionline.com/")) {
        chamadas.push(url);
        return new Response(JSON.stringify(corpo), { status });
      }
      return supabase(url, init as never);
    }),
  );
  return chamadas;
}

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

const relatorio = (datas = DATAS_MANHA) => relatorioFalso(datas.map((data, i) => avaliacao(i, { data, peso: 90 + i * 0.2, gordura: 25 - i * 0.5, ffm: 67 + i * 0.3 })));

describe("importar_bioimpedancia", () => {
  it("importa as medições, grava só campos de medição e não duplica na segunda vez", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    const chamadas = instalarAvanutri(relatorio());

    const r = await chamar("importar_bioimpedancia", { link: LINK });
    expect(r.erro).toBe(false);
    expect(r.json.detalhe).toMatchObject({ noRelatorio: 6, jaExistiam: 0, ignoradas: 0, totalNoApp: 6 });
    expect(r.json.detalhe.novas).toHaveLength(6);
    expect(chamadas).toEqual([`https://balancaapi.avanutrionline.com/Relatorio/${CODIGO}`]);

    // Nada de dados pessoais, nem da conta do profissional, nem o código do link, no que foi gravado.
    const gravado = JSON.stringify(banco.dados);
    expect(gravado).not.toContain(SEGREDO);
    expect(gravado).not.toContain(NOME_PESSOA);
    expect(gravado).not.toContain(CODIGO);
    expect(Object.keys(dadosDoBackup(banco.dados!).corpo)).toHaveLength(6);
    // Os dados de treino continuam intactos.
    expect(dadosDoBackup(banco.dados!).log.length).toBeGreaterThan(10);

    const gravacoes = banco.gravacoes;
    const de_novo = await chamar("importar_bioimpedancia", { link: LINK });
    expect(de_novo.json.mensagem).toMatch(/Nada novo/);
    expect(de_novo.json.detalhe).toMatchObject({ jaExistiam: 6, totalNoApp: 6 });
    expect(banco.gravacoes).toBe(gravacoes); // idempotente: nem gravou
  });

  it("importar um relatório com janela diferente só acrescenta o que falta (histórico)", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorio(DATAS_MANHA.slice(0, 4)));
    await chamar("importar_bioimpedancia", { link: LINK });
    instalarAvanutri(relatorio(DATAS_MANHA)); // o mais recente traz as 6 (4 já existem)
    const r = await chamar("importar_bioimpedancia", { link: CODIGO });
    expect(r.json.detalhe).toMatchObject({ noRelatorio: 6, jaExistiam: 4 });
    expect(r.json.detalhe.novas).toHaveLength(2);
    expect(Object.keys(dadosDoBackup(banco.dados!).corpo)).toHaveLength(6);
  });

  it("recusa links que não são da Avanutri sem chamar a API", async () => {
    instalarSupabaseFalso(montarDados());
    const chamadas = instalarAvanutri(relatorio());
    const r = await chamar("importar_bioimpedancia", { link: "https://evil.example.com/relatorios/index.html#" + CODIGO });
    expect(r.erro).toBe(true);
    expect(r.texto).toMatch(/Link inválido/);
    expect(chamadas).toHaveLength(0);
  });

  it("erro da API da Avanutri vira erro claro e não grava nada", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    instalarAvanutri({}, 404);
    const antes = banco.gravacoes;
    const r = await chamar("importar_bioimpedancia", { link: LINK });
    expect(r.erro).toBe(true);
    expect(r.texto).toMatch(/não encontrado/);
    expect(banco.gravacoes).toBe(antes);
  });

  it("relatório sem medição válida é erro", async () => {
    instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorioFalso([{ ...avaliacao(1, { data: "ontem" }) }]));
    expect((await chamar("importar_bioimpedancia", { link: LINK })).erro).toBe(true);
  });
});

describe("evolucao_corpo", () => {
  it("sem importação, orienta o que fazer", async () => {
    instalarSupabaseFalso(montarDados());
    const r = await chamar("evolucao_corpo");
    expect(r.json.leituras).toBe(0);
    expect(r.json.mensagem).toMatch(/importar_bioimpedancia/);
  });

  it("devolve série, análise com confiança/avisos e segmentos", async () => {
    instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorio(DATAS_MISTAS));
    await chamar("importar_bioimpedancia", { link: LINK });
    const { json } = await chamar("evolucao_corpo", { limite: 3 });
    expect(json.totalMedicoes).toBe(6);
    expect(json.serie).toHaveLength(3);
    expect(json.serie[0]).toHaveProperty("periodo");
    expect(json.analise.avisos.join(" ")).toMatch(/horários muito diferentes/);
    expect(["alta"]).not.toContain(json.analise.confianca);
    expect(json.segmentos).toHaveLength(5);
    expect(JSON.stringify(json)).not.toContain(SEGREDO);
  });

  it("relatorio_semanal ganha o bloco corpo com lembrete quando a última é antiga", async () => {
    instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorio());
    await chamar("importar_bioimpedancia", { link: LINK });
    const { json } = await chamar("relatorio_semanal");
    expect(json.corpo.ultima.data).toBe("2026-09-28");
    expect(json.corpo.diasDesdeUltima).toBe(14);
    expect(json.corpo.lembrete).toBeNull();
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
    expect((await chamar("relatorio_semanal")).json.corpo.lembrete).toMatch(/há 22 dias/);
  });
});

describe("remover_corpo e sync", () => {
  it("remover apaga a medição e o snapshot antigo do app não a ressuscita", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorio());
    await chamar("importar_bioimpedancia", { link: LINK });
    const snapshotComCorpo = { ...banco.dados! };

    const r = await chamar("remover_corpo", { data: "2026-08-03" });
    expect(r.erro).toBe(false);
    expect(Object.keys(dadosDoBackup(banco.dados!).corpo)).toHaveLength(5);

    const { POST: sync } = await import("@/app/api/sync/route");
    const res = await sync(
      new Request("http://x/api/sync", {
        method: "POST",
        headers: { authorization: `Bearer ${"s".repeat(32)}` },
        body: JSON.stringify({ formato: "biofit-treino-backup", versao: 1, exportadoEm: "", dados: snapshotComCorpo }),
      }),
    );
    expect(res.status).toBe(200);
    expect(Object.values(dadosDoBackup(banco.dados!).corpo).some((c) => c.data === "2026-08-03")).toBe(false);
  });

  it("um aparelho que ainda não tem o corpo importado não apaga o do servidor", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    instalarAvanutri(relatorio());
    await chamar("importar_bioimpedancia", { link: LINK });

    const semCorpo = montarDados(); // o celular nunca viu o corpo
    const { POST: sync } = await import("@/app/api/sync/route");
    const res = await sync(
      new Request("http://x/api/sync", {
        method: "POST",
        headers: { authorization: `Bearer ${"s".repeat(32)}` },
        body: JSON.stringify({ formato: "biofit-treino-backup", versao: 1, exportadoEm: "", dados: semCorpo }),
      }),
    );
    const corpo = (await res.json()) as { dados: Record<string, string> };
    expect(Object.keys(JSON.parse(corpo.dados[KEY_CORPO]))).toHaveLength(6); // volta para o app
    expect(Object.keys(dadosDoBackup(banco.dados!).corpo)).toHaveLength(6);
    expect(corpo.dados[KEY_ORIGEM]).toBeUndefined();
  });

  it("remover data sem medição é erro", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await chamar("remover_corpo", { data: "2026-08-03" })).erro).toBe(true);
  });
});

describe("catálogo", () => {
  it("as três ferramentas novas estão registradas com o tipo certo", () => {
    const por = Object.fromEntries(FERRAMENTAS.map((f) => [f.name, f]));
    expect(por.evolucao_corpo.tipo).toBe("leitura");
    expect(por.importar_bioimpedancia).toMatchObject({ tipo: "escrita", destrutiva: false, idempotente: true });
    expect(por.remover_corpo).toMatchObject({ tipo: "escrita", destrutiva: true });
  });
});
