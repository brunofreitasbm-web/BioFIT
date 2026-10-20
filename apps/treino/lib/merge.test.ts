import { describe, expect, it } from "vitest";
import { KEY_BIKE, KEY_LOG, KEY_POSTURA, KEY_REMOVIDOS, KEY_SESSOES } from "./dados";
import { chaveBike, chavePostura, chaveSerie, mesclar, registrarRemocao } from "./merge";
import type { RegistroPostura, RegistroSessao, SerieRegistrada } from "./tipos";

const AGORA = new Date("2026-10-12T12:00:00Z");
const serie = (n: number, reps: number, quando: string, extra: Partial<SerieRegistrada> = {}): SerieRegistrada => ({
  exercicioId: "ex1", data: "2026-10-10", serieNumero: n, cargaKg: 50, reps, registradoEm: quando, ...extra,
});
const log = (...s: SerieRegistrada[]) => ({ [KEY_LOG]: JSON.stringify(s) });
const lerLog = (d: Record<string, string>) => JSON.parse(d[KEY_LOG]) as SerieRegistrada[];

describe("mesclar", () => {
  it("une séries de lados diferentes", () => {
    const r = mesclar(log(serie(1, 8, "2026-10-10T10:00:00Z")), log(serie(2, 9, "2026-10-10T10:05:00Z")), AGORA);
    expect(lerLog(r).map((s) => s.serieNumero).sort()).toEqual([1, 2]);
  });

  it("a gravação mais recente vence a mesma série, qualquer que seja o lado", () => {
    const velha = serie(1, 8, "2026-10-10T10:00:00Z");
    const nova = serie(1, 10, "2026-10-10T10:30:00Z");
    expect(lerLog(mesclar(log(nova), log(velha), AGORA))[0].reps).toBe(10);
    expect(lerLog(mesclar(log(velha), log(nova), AGORA))[0].reps).toBe(10);
  });

  it("empate de carimbo: a entrada vence", () => {
    const base = serie(1, 8, "2026-10-10T10:00:00Z");
    const entrada = serie(1, 9, "2026-10-10T10:00:00Z");
    expect(lerLog(mesclar(log(base), log(entrada), AGORA))[0].reps).toBe(9);
  });

  it("lápide derruba série mais antiga e perde para série mais nova", () => {
    const s = serie(1, 8, "2026-10-10T10:00:00Z");
    const lapide = { [KEY_REMOVIDOS]: JSON.stringify(registrarRemocao([], chaveSerie(s), "2026-10-10T11:00:00Z")) };
    // O celular ainda tem a série antiga; o servidor tem a lápide.
    expect(lerLog(mesclar({ ...log(), ...lapide }, log(s), AGORA))).toEqual([]);
    // Regravada depois da remoção, ela volta.
    const nova = serie(1, 12, "2026-10-10T12:00:00Z");
    expect(lerLog(mesclar({ ...log(), ...lapide }, log(nova), AGORA))).toHaveLength(1);
  });

  it("poda lápides com mais de 90 dias", () => {
    const velho = { [KEY_REMOVIDOS]: JSON.stringify(registrarRemocao([], "serie:x|2026-01-01|1", "2026-01-01T00:00:00Z")) };
    expect(JSON.parse(mesclar(velho, {}, AGORA)[KEY_REMOVIDOS])).toEqual([]);
  });

  it("é idempotente e comutativo no conteúdo", () => {
    const a = log(serie(1, 8, "2026-10-10T10:00:00Z"), serie(2, 9, "2026-10-10T10:05:00Z"));
    const b = log(serie(2, 11, "2026-10-10T10:20:00Z"), serie(3, 7, "2026-10-10T10:25:00Z"));
    const ab = mesclar(a, b, AGORA);
    expect(mesclar(ab, b, AGORA)).toEqual(ab);
    expect(mesclar(ab, ab, AGORA)).toEqual(ab);
    const ordenar = (d: Record<string, string>) => lerLog(d).sort((x, y) => x.serieNumero - y.serieNumero);
    expect(ordenar(mesclar(b, a, AGORA))).toEqual(ordenar(ab));
  });

  it("sessões: vence a mais recente por atualizadoEm, sem duplicar", () => {
    const aberta: RegistroSessao = { data: "2026-10-10", sessaoTipo: "A", inicioISO: "2026-10-10T10:00:00Z", fimISO: null, atualizadoEm: "2026-10-10T10:00:00Z" };
    const fechada: RegistroSessao = { ...aberta, fimISO: "2026-10-10T11:00:00Z", atualizadoEm: "2026-10-10T11:00:00Z" };
    const mapa = (r: RegistroSessao) => ({ [KEY_SESSOES]: JSON.stringify({ [r.data]: [r] }) });
    const r = JSON.parse(mesclar(mapa(fechada), mapa(aberta), AGORA)[KEY_SESSOES]);
    expect(r["2026-10-10"]).toHaveLength(1);
    expect(r["2026-10-10"][0].fimISO).toBe("2026-10-10T11:00:00Z");
  });

  it("bike: lápide vence registro antigo", () => {
    const b = { data: "2026-10-10", tempoMinutos: 20, concluido: true, registradoEm: "2026-10-10T09:00:00Z" };
    const lapide = JSON.stringify(registrarRemocao([], chaveBike(b.data), "2026-10-10T10:00:00Z"));
    const r = mesclar({ [KEY_BIKE]: "{}", [KEY_REMOVIDOS]: lapide }, { [KEY_BIKE]: JSON.stringify({ [b.data]: b }) }, AGORA);
    expect(JSON.parse(r[KEY_BIKE])).toEqual({});
  });

  it("não cria chaves que nenhum lado tinha", () => {
    expect(Object.keys(mesclar({}, { "treino:dataInicio": "2026-10-01" }, AGORA))).toEqual(["treino:dataInicio"]);
  });
});

describe("mesclar postura", () => {
  const postura = (quando: string, cif: number, registradoEm = `${quando}.000Z`): RegistroPostura => ({
    chave: `postura:${quando}:perfil`,
    vista: "perfil",
    data: quando.slice(0, 10),
    quando,
    proporcao: 0.75,
    pontos: { c7: { x: 0.5, y: 0.2 } },
    medidas: { anguloCifose: cif },
    confiancaDeteccao: 0.9,
    registradoEm,
  });
  const mapa = (...regs: RegistroPostura[]) => ({ [KEY_POSTURA]: JSON.stringify(Object.fromEntries(regs.map((r) => [r.chave, r]))) });
  const ler = (d: Record<string, string>) => Object.values(JSON.parse(d[KEY_POSTURA]) as Record<string, RegistroPostura>);

  it("une capturas de lados diferentes e a mais recente vence a mesma chave", () => {
    const a = postura("2026-10-10T08:00:00", 40);
    const b = postura("2026-10-11T08:00:00", 41);
    expect(ler(mesclar(mapa(a), mapa(b), AGORA)).map((r) => r.medidas.anguloCifose).sort()).toEqual([40, 41]);
    const corrigida = postura("2026-10-10T08:00:00", 38, "2026-10-10T09:00:00.000Z");
    expect(ler(mesclar(mapa(corrigida), mapa(a), AGORA))[0].medidas.anguloCifose).toBe(38);
  });

  it("lápide derruba a captura removida", () => {
    const a = postura("2026-10-10T08:00:00", 40);
    const lapide = { [KEY_REMOVIDOS]: JSON.stringify(registrarRemocao([], chavePostura(a.chave), "2026-10-10T09:00:00Z")) };
    expect(ler(mesclar({ ...mapa(), ...lapide }, mapa(a), AGORA))).toEqual([]);
  });
});
