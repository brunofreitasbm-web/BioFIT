import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEY_LOG, KEY_ORIGEM, KEY_REMOVIDOS, dadosDoBackup } from "@/lib/dados";
import { calcularVolumePorGrupo } from "@/lib/relatorio";
import { POST } from "@/app/api/mcp/[[...token]]/route";
import { SLOTS } from "@/lib/exercicios";
import { HOJE, montarDados } from "./fixture";
import { instalarSupabaseFalso } from "./supabaseFalso";
import { _reiniciarGravacaoCondicional } from "../backup";
import { FERRAMENTAS, contextoDe } from "../ferramentas";

const TOKEN = "t".repeat(32);
// Primeiro exercício da sessão D (a sugerida para o "hoje" da fixture) e um da sessão A.
const EX_D = SLOTS.find((x) => x.sessao === "D" && x.ordem === 1)!.meso1.id;

beforeEach(() => {
  _reiniciarGravacaoCondicional();
  vi.stubEnv("MCP_TOKEN", TOKEN);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${HOJE}T15:00:00Z`)); // 12:00 em Belém
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function rpc(method: string, params: Record<string, unknown> = {}, token = TOKEN) {
  const req = new Request("http://x/api/mcp", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return POST(req, { params: {} });
}

async function chamar(name: string, args: Record<string, unknown> = {}) {
  const r = (await (await rpc("tools/call", { name, arguments: args })).json()) as {
    result: { isError?: boolean; content: { text: string }[] };
  };
  const texto = r.result.content[0].text;
  return { erro: r.result.isError === true, texto, json: r.result.isError ? null : JSON.parse(texto) };
}

describe("protocolo", () => {
  it("recusa token errado", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await rpc("tools/list", {}, "x".repeat(32))).status).toBe(401);
  });

  it("tools/list traz todas as ferramentas com anotações", async () => {
    instalarSupabaseFalso(montarDados());
    const { result } = (await (await rpc("tools/list")).json()) as { result: { tools: { name: string; annotations: Record<string, unknown> }[] } };
    expect(result.tools.map((t) => t.name).sort()).toEqual(FERRAMENTAS.map((f) => f.name).sort());
    const por = Object.fromEntries(result.tools.map((t) => [t.name, t.annotations]));
    expect(por.plano_do_dia.readOnlyHint).toBe(true);
    expect(por.remover_serie).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(por.registrar_series).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
  });

  it("sem dados sincronizados devolve erro claro", async () => {
    instalarSupabaseFalso(null);
    const r = await chamar("status_sync");
    expect(r.erro).toBe(true);
    expect(r.texto).toMatch(/Nenhum dado/);
  });
});

describe("leitura", () => {
  beforeEach(() => void instalarSupabaseFalso(montarDados()));

  it("treino_do_dia lista séries do dia", async () => {
    const { json } = await chamar("treino_do_dia", { data: "2026-10-01" });
    expect(json.temRegistro).toBe(true);
    expect(json.sessoes[0]).toMatchObject({ tipo: "A", duracaoMin: 60 });
    expect(json.exercicios.length).toBeGreaterThan(3);
  });

  it("status_programa: próxima da fila e aderência", async () => {
    const { json } = await chamar("status_programa");
    // 8 sessões A..E,A,B,C → última concluída é C, próxima D.
    expect(json.sessoesConcluidasNoPrograma).toBe(8);
    expect(json.sessaoSugerida).toBe("D");
    expect(json.aderencia.decisao).toBe("EM_ANDAMENTO");
    // As sessões do fixture são anteriores a DATA_FIM_MESO_1: contam como meso 1 completo.
    expect(json.meso).toBe(2);
    expect(json.rodada).toBe(1);
  });

  it("plano_do_dia traz carga sugerida e série do exercício", async () => {
    const { json } = await chamar("plano_do_dia");
    expect(json.sessao).toBe("D");
    expect(json.exercicios[0].series).toBeGreaterThan(0);
    expect(json.exercicios.some((e: { sugestao: unknown }) => e.sugestao !== null)).toBe(true);
    expect(json.recuperacao.length).toBeGreaterThan(0);
  });

  describe("plano_do_dia com Garmin", () => {
    function comGarmin(diario: object[]) {
      const base = globalThis.fetch;
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) =>
        String(url).includes("biofit_garmin_get") ? new Response(JSON.stringify({ diario, treinos: [] })) : base(url, init as never)));
    }

    it("sono e Body Battery ruins hoje: ajusteHoje em cada exercício, cargas sugeridas intactas", async () => {
      const sem = (await chamar("plano_do_dia")).json;
      comGarmin([{ data: HOJE, sono_minutos: 270, sono_score: 48, body_battery_acordar: 28 }]);
      const { json } = await chamar("plano_do_dia");
      expect(json.prontidaoGarmin).toMatchObject({ nivel: "baixa" });
      const ex = json.exercicios[0];
      expect(ex.ajusteHoje).toMatchObject({ naoProgredirCarga: true, semTesteDeFalha: true });
      expect(ex.ajusteHoje.series).toBe(Math.max(Math.min(2, ex.series), ex.series - 1));
      expect(json.exercicios.map((e: { sugestao: unknown }) => e.sugestao)).toEqual(sem.exercicios.map((e: { sugestao: unknown }) => e.sugestao));
    });

    it("VFC sustentadamente abaixo da base própria entra na prontidão; sem base, não", async () => {
      const dia = (n: number, vfc: number) => {
        const d = new Date(`${HOJE}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() - n);
        return { data: d.toISOString().slice(0, 10), vfc_noturna_ms: vfc };
      };
      const ruido = [0, 2, -2, 1, -1, 3, -3];
      const base = Array.from({ length: 28 }, (_, i) => dia(7 + i, 50 + ruido[i % 7]));
      const recentes = [0, 1, 2, 3, 4, 5, 6].map((n) => dia(n, 37));
      const hoje = { ...recentes[0], sono_minutos: 450, sono_score: 80, body_battery_acordar: 85 };

      comGarmin([...base, ...recentes.slice(1), hoje]);
      let r = (await chamar("plano_do_dia")).json;
      expect(r.prontidaoGarmin.nivel).toBe("atencao");
      expect(r.prontidaoGarmin.motivos.join(" ")).toContain("VFC");
      expect(r.prontidaoGarmin.ajuste.reduzirSeries).toBe(0);

      comGarmin([...recentes.slice(1), hoje]); // ~6 dias de histórico: sem base, sem efeito
      r = (await chamar("plano_do_dia")).json;
      expect(r.prontidaoGarmin.nivel).toBe("normal");
    });

    it("dado só de ontem ou Garmin fora do ar: plano normal, sem ajuste", async () => {
      comGarmin([{ data: "2026-09-01", sono_minutos: 200, body_battery_acordar: 10 }]);
      let r = (await chamar("plano_do_dia")).json;
      expect(r.prontidaoGarmin.nivel).toBe("sem_dados");
      expect(r.exercicios.every((e: { ajusteHoje?: unknown }) => e.ajusteHoje === undefined)).toBe(true);
      vi.spyOn(console, "error").mockImplementation(() => {});
      r = (await chamar("plano_do_dia")).json; // fetch falso devolve 404 para biofit_garmin_get
      expect(r.prontidaoGarmin.nivel).toBe("sem_dados");
    });

    it("data diferente de hoje não recebe prontidão", async () => {
      comGarmin([{ data: HOJE, sono_minutos: 200, body_battery_acordar: 10 }]);
      expect((await chamar("plano_do_dia", { data: "2026-10-01" })).json.prontidaoGarmin).toBeNull();
    });
  });

  it("plano_do_dia respeita sessão forçada e exercício sem histórico usa a partida", async () => {
    const { json } = await chamar("plano_do_dia", { sessao: "E" });
    expect(json.sessao).toBe("E");
    expect(json.exercicios.every((e: { id: string }) => typeof e.id === "string")).toBe(true);
  });

  it("relatorio_volume é idêntico ao calcularVolumePorGrupo do app", async () => {
    const dados = dadosDoBackup(montarDados());
    const esperado = calcularVolumePorGrupo(14, new Date(`${HOJE}T12:00:00`), dados.log);
    const { json } = await chamar("relatorio_volume", { dias: 14 });
    for (const v of esperado) {
      const g = json.grupos.find((x: { grupo: string }) => x.grupo === v.grupo);
      expect(g.seriesDiretas).toBe(v.seriesDiretas);
      expect(g.seriesEfetivas).toBeCloseTo(v.seriesFeitas, 1);
    }
  });

  it("resumo_periodo conta secundários como o relatório (não só o grupo primário)", async () => {
    const { json } = await chamar("resumo_periodo", { dias: 14 });
    const diretas = Object.values(json.seriesPorGrupo as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(diretas).toBeGreaterThanOrEqual(json.totalSeries);
    expect(json.diasTreinados).toBe(8);
  });

  it("historico_exercicio resolve por nome e traz recordes", async () => {
    const { json } = await chamar("historico_exercicio", { exercicio: "supino inclinado" });
    expect(json.exercicio.id).toBe("supino-inclinado-maquina");
    expect(json.recordes.melhor1RM.kg).toBeGreaterThan(0);
    expect(json.datas.length).toBeGreaterThan(0);
  });

  it("historico_exercicio com nome desconhecido dá erro útil", async () => {
    const r = await chamar("historico_exercicio", { exercicio: "xyz-inexistente" });
    expect(r.erro).toBe(true);
    expect(r.texto).toMatch(/listar_exercicios/);
  });

  it("progresso, relatorio_semanal e listar_exercicios respondem", async () => {
    expect((await chamar("progresso")).json.exercicios.length).toBeGreaterThan(0);
    const sem = (await chamar("relatorio_semanal")).json;
    expect(sem.semana.periodo).toEqual({ inicio: "2026-10-06", fim: HOJE });
    expect(sem.volume.grupos.length).toBeGreaterThan(0);
    const lista = (await chamar("listar_exercicios", { sessao: "A" })).json;
    expect(lista.sessoes).toHaveLength(1);
  });

  it("valida argumentos", async () => {
    expect((await chamar("treino_do_dia", { data: "12/10" })).erro).toBe(true);
    expect((await chamar("resumo_periodo", { dias: 0 })).erro).toBe(true);
  });
});

describe("escrita", () => {
  it("registrar_series grava, numera em sequência, inicia a sessão e devolve o dia", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    const r = await chamar("registrar_series", {
      exercicio: EX_D,
      series: [{ cargaKg: 65, reps: 8 }, { cargaKg: 65, reps: 7, rir: 1 }],
    });
    expect(r.erro).toBe(false);
    expect(r.json.dia.exercicios[0].series.map((s: { n: number }) => s.n)).toEqual([1, 2]);
    expect(r.json.dia.sessoes[0]).toMatchObject({ tipo: "D", fim: null }); // sessão do dia (D) iniciada
    const salvo = dadosDoBackup(banco.dados!);
    expect(salvo.log.filter((s) => s.data === HOJE)).toHaveLength(2);
    expect(JSON.parse(banco.dados![KEY_ORIGEM]).origem).toBe("mcp");
    // as séries antigas continuam lá
    expect(salvo.log.length).toBeGreaterThan(2);
  });

  it("sobrevive ao sync do celular com snapshot antigo (o motivo do merge)", async () => {
    const antigo = montarDados();
    const banco = instalarSupabaseFalso(antigo);
    await chamar("registrar_series", { exercicio: EX_D, series: [{ cargaKg: 70, reps: 6 }] });

    const { POST: sync } = await import("@/app/api/sync/route");
    vi.stubEnv("SYNC_TOKEN", "s".repeat(32));
    const res = await sync(
      new Request("http://x/api/sync", {
        method: "POST",
        headers: { authorization: `Bearer ${"s".repeat(32)}` },
        body: JSON.stringify({ formato: "biofit-treino-backup", versao: 1, exportadoEm: "", dados: antigo }),
      }),
    );
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { dados: Record<string, string> };
    expect(dadosDoBackup(corpo.dados).log.some((s) => s.data === HOJE && s.cargaKg === 70)).toBe(true);
    expect(dadosDoBackup(banco.dados!).log.some((s) => s.data === HOJE && s.cargaKg === 70)).toBe(true);
    expect(corpo.dados[KEY_ORIGEM]).toBeUndefined();
  });

  it("remover_serie apaga e deixa lápide; o snapshot antigo do app não ressuscita", async () => {
    const antigo = montarDados();
    const banco = instalarSupabaseFalso(antigo);
    const ex = dadosDoBackup(antigo).log[0];
    const r = await chamar("remover_serie", { exercicio: ex.exercicioId, serieNumero: ex.serieNumero, data: ex.data });
    expect(r.erro).toBe(false);
    expect(JSON.parse(banco.dados![KEY_REMOVIDOS])).toHaveLength(1);

    const { POST: sync } = await import("@/app/api/sync/route");
    vi.stubEnv("SYNC_TOKEN", "s".repeat(32));
    await sync(
      new Request("http://x/api/sync", {
        method: "POST",
        headers: { authorization: `Bearer ${"s".repeat(32)}` },
        body: JSON.stringify({ formato: "biofit-treino-backup", versao: 1, exportadoEm: "", dados: antigo }),
      }),
    );
    const final = dadosDoBackup(banco.dados!).log;
    expect(final.some((s) => s.exercicioId === ex.exercicioId && s.data === ex.data && s.serieNumero === ex.serieNumero)).toBe(false);
  });

  it("remover série inexistente é erro", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await chamar("remover_serie", { exercicio: "puxada-frente-pronada", serieNumero: 3, data: "2026-10-11" })).erro).toBe(true);
  });

  it("terminar_sessao conclui a sessão do dia e a fila segue para a próxima", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    await chamar("registrar_series", { exercicio: EX_D, series: [{ cargaKg: 65, reps: 8 }] });
    const r = await chamar("terminar_sessao");
    expect(r.json.dia.sessoes[0]).toMatchObject({ tipo: "D" });
    expect(r.json.dia.sessoes[0].fim).not.toBeNull();
    // Hoje (D) já não é "a sugerida": ela vale como a de hoje e a próxima da fila é E.
    const status = (await chamar("status_programa")).json;
    expect(status.sessaoDeHoje).toBe("D");
    expect(status.proximaDepoisDeHoje).toBe("E");
    expect(status.ultimasConcluidas.at(-1)).toMatchObject({ data: HOJE, sessao: "D" });
    expect(banco.gravacoes).toBe(2);
  });

  it("terminar_sessao sem sessão iniciada e sem séries é erro", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await chamar("terminar_sessao", { sessao: "C" })).erro).toBe(true);
  });

  it("registrar série de exercício fora da sessão do dia usa a sessão que o contém", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    await chamar("registrar_series", { exercicio: "puxada-frente-pronada", series: [{ cargaKg: 65, reps: 8 }] });
    expect(dadosDoBackup(banco.dados!).log.find((x) => x.data === HOJE)?.sessao).toBe("A");
  });

  it("registrar_bike grava e 0 minutos apaga", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await chamar("registrar_bike", { minutos: 25 })).json.dia.bikeIndoor).toEqual({ minutos: 25, concluido: true });
    expect((await chamar("registrar_bike", { minutos: 0 })).json.dia.bikeIndoor).toBeNull();
  });

  it("recusa série no futuro e exercício inexistente", async () => {
    instalarSupabaseFalso(montarDados());
    expect((await chamar("registrar_series", { exercicio: "puxada-frente-pronada", data: "2026-10-20", series: [{ reps: 5 }] })).erro).toBe(true);
    expect((await chamar("registrar_series", { exercicio: "nada", series: [{ reps: 5 }] })).erro).toBe(true);
  });

  it("conflito de gravação: relê, mescla e tenta de novo sem perder a outra escrita", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    // Entre a leitura do MCP e a gravação, o app grava uma série própria.
    banco.aoGravar = () => {
      const d = dadosDoBackup(banco.dados!);
      d.log.push({ exercicioId: "x-app", data: HOJE, serieNumero: 1, cargaKg: 10, reps: 10, registradoEm: `${HOJE}T14:00:00Z` });
      banco.dados = { ...banco.dados!, [KEY_LOG]: JSON.stringify(d.log) };
      banco.atualizadoEm = "2026-10-12T14:00:00.000Z";
    };
    const r = await chamar("registrar_series", { exercicio: EX_D, series: [{ cargaKg: 65, reps: 8 }] });
    expect(r.erro).toBe(false);
    const log = dadosDoBackup(banco.dados!).log;
    expect(log.some((s) => s.exercicioId === "x-app")).toBe(true);
    expect(log.some((s) => s.exercicioId === EX_D && s.data === HOJE)).toBe(true);
  });

  it("sem a função put_se no banco, cai na gravação simples", async () => {
    const banco = instalarSupabaseFalso(montarDados());
    banco.sem_put_se = true;
    const r = await chamar("registrar_bike", { minutos: 10 });
    expect(r.erro).toBe(false);
    expect(banco.gravacoes).toBe(1);
  });
});

describe("contexto", () => {
  it("hoje vem de America/Belem", () => {
    vi.setSystemTime(new Date("2026-10-13T02:00:00Z")); // ainda 12/10 em Belém (UTC-3)
    expect(contextoDe({ dados: montarDados(), atualizadoEm: "" }).hoje).toBe("2026-10-12");
  });
});
