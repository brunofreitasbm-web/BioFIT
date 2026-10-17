import { describe, expect, it, vi } from "vitest";
import { buscarRelatorio, extrairIdRelatorio, normalizarRelatorio } from "../avanutri";
import { CODIGO, DATAS_MANHA, LINK, NOME_PESSOA, SEGREDO, avaliacao, relatorioFalso } from "./avanutriFixture";

describe("extrairIdRelatorio", () => {
  it("aceita o link do e-mail e o código solto", () => {
    expect(extrairIdRelatorio(LINK)).toBe(CODIGO);
    expect(extrairIdRelatorio(CODIGO.toUpperCase())).toBe(CODIGO);
    expect(extrairIdRelatorio(`  ${LINK}  `)).toBe(CODIGO);
  });

  it.each([
    ["host de outro site", `https://evil.example.com/relatorios/index.html?lang=pt#${CODIGO}`],
    ["host com sufixo enganoso", `https://d196bwsv53491l.cloudfront.net.evil.com/relatorios/index.html#${CODIGO}`],
    ["http", `http://d196bwsv53491l.cloudfront.net/relatorios/index.html#${CODIGO}`],
    ["outro caminho", `https://d196bwsv53491l.cloudfront.net/outra/pagina.html#${CODIGO}`],
    ["sem código", "https://d196bwsv53491l.cloudfront.net/relatorios/index.html?lang=pt"],
    ["código que não é UUID", "https://d196bwsv53491l.cloudfront.net/relatorios/index.html#../../etc/passwd"],
    ["texto qualquer", "não é link"],
    ["URL interna", "http://169.254.169.254/latest/meta-data"],
  ])("recusa %s", (_nome, entrada) => {
    expect(() => extrairIdRelatorio(entrada)).toThrow();
  });

  it("recusa entrada que não é texto", () => {
    expect(() => extrairIdRelatorio(undefined)).toThrow(/obrigatório/);
    expect(() => extrairIdRelatorio(42)).toThrow(/obrigatório/);
  });
});

describe("buscarRelatorio", () => {
  const resposta = (corpo: string, status = 200) => vi.fn(async () => new Response(corpo, { status })) as unknown as typeof fetch;

  it("chama sempre o host fixo da API", async () => {
    const f = resposta("{}");
    await buscarRelatorio(CODIGO, f);
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(`https://balancaapi.avanutrionline.com/Relatorio/${CODIGO}`);
  });

  it("recusa código que não é UUID antes de qualquer chamada", async () => {
    const f = resposta("{}");
    await expect(buscarRelatorio("../x", f)).rejects.toThrow(/inválido/);
    expect(f).not.toHaveBeenCalled();
  });

  it("traduz 404, erro de servidor, JSON inválido, resposta enorme e falha de rede", async () => {
    await expect(buscarRelatorio(CODIGO, resposta("", 404))).rejects.toThrow(/não encontrado/);
    await expect(buscarRelatorio(CODIGO, resposta("", 500))).rejects.toThrow(/500/);
    await expect(buscarRelatorio(CODIGO, resposta("<html>"))).rejects.toThrow(/JSON/);
    await expect(buscarRelatorio(CODIGO, resposta("x".repeat(600_000)))).rejects.toThrow(/grande demais/);
    const queda = vi.fn(async () => {
      throw new Error("ECONNRESET com detalhes internos");
    }) as unknown as typeof fetch;
    await expect(buscarRelatorio(CODIGO, queda)).rejects.toThrow(/rede ou tempo esgotado/);
  });

  it("a mensagem de erro não carrega o corpo da resposta", async () => {
    await expect(buscarRelatorio(CODIGO, resposta(`erro ${SEGREDO}`, 500))).rejects.not.toThrow(new RegExp(SEGREDO));
  });
});

describe("normalizarRelatorio", () => {
  const AGORA = "2026-10-12T15:00:00.000Z";
  const json = relatorioFalso(DATAS_MANHA.map((data, i) => avaliacao(i, { data, peso: 90 + i * 0.1, gordura: 24 - i * 0.2 })));

  it("mapeia os campos de medição", () => {
    const { registros, ignoradas } = normalizarRelatorio(json, AGORA);
    expect(ignoradas).toBe(0);
    expect(registros).toHaveLength(6);
    const r = registros[0];
    expect(r).toMatchObject({
      chave: "avanutri:1000",
      fonte: "avanutri",
      data: "2026-07-20",
      quando: "2026-07-20T08:05:11",
      pesoKg: 90,
      gorduraPct: 24,
      musculoEsqueleticoKg: 41,
      gorduraVisceral: 10,
      tmbKcal: 1850,
      registradoEm: AGORA,
    });
    expect(r.massaGordaKg).toBeCloseTo(21.6, 1);
    expect(r.segmentos?.bracoDireito.massaMagraKg).toBe(4.8);
    expect(r.segmentos?.tronco.massaMagraKg).toBe(30);
    expect(r.segmentos?.pernaEsquerda.massaMagraKg).toBe(11.4);
  });

  it("não guarda dados pessoais nem da conta do profissional (nem a senha)", () => {
    const { registros } = normalizarRelatorio(json, AGORA);
    const texto = JSON.stringify(registros);
    expect(texto).not.toContain(SEGREDO);
    expect(texto).not.toContain(NOME_PESSOA);
    expect(texto).not.toContain("example.com");
    expect(texto).not.toContain("CNPJ");
    expect(texto).not.toContain(CODIGO);
    expect(texto).not.toMatch(/password|email|telefone|crn/i);
  });

  it("ignora avaliações sem data ou com peso impossível e mantém as boas", () => {
    const sujo = relatorioFalso([
      avaliacao(1, { data: "2026-09-01T10:00:00.000000", peso: 91 }),
      { ...avaliacao(2, { data: "2026-09-02T10:00:00.000000" }), peso: 3 },
      { ...avaliacao(3, { data: "2026-09-03T10:00:00.000000" }), peso: "noventa" as unknown as number },
      { ...avaliacao(4, { data: "ontem" }) },
    ]);
    const { registros, ignoradas } = normalizarRelatorio(sujo, AGORA);
    expect(registros.map((r) => r.data)).toEqual(["2026-09-01"]);
    expect(ignoradas).toBe(3);
  });

  it("campos fora da faixa viram null em vez de valores absurdos", () => {
    const a = avaliacao(1, { data: "2026-09-01T10:00:00.000000", gordura: 24 });
    (a.dadosCorpo as Record<string, number>).fmPercentual = 900;
    const { registros } = normalizarRelatorio(relatorioFalso([a]), AGORA);
    expect(registros[0].gorduraPct).toBeNull();
    expect(registros[0].pesoKg).toBe(90);
  });

  it("usa a data como chave quando a avaliação não tem id utilizável", () => {
    const a = { ...avaliacao(1, { data: "2026-09-01T10:00:00.000000" }), id: "../x y" as unknown as number };
    expect(normalizarRelatorio(relatorioFalso([a]), AGORA).registros[0].chave).toBe("avanutri:2026-09-01T10:00:00");
  });

  it("sem segmentos completos, segmentos = null", () => {
    const a = { ...avaliacao(1, { data: "2026-09-01T10:00:00.000000" }), dadosMembros: [] };
    expect(normalizarRelatorio(relatorioFalso([a]), AGORA).registros[0].segmentos).toBeNull();
  });

  it("recusa resposta sem lista de avaliações", () => {
    expect(() => normalizarRelatorio({ user: {} }, AGORA)).toThrow(/avaliações/);
    expect(() => normalizarRelatorio(null, AGORA)).toThrow();
  });
});
