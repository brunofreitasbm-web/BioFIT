import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getExercicio, getSessaoCompleta, SESSOES, SLOTS } from "./exercicios";
import { parseFaixaReps } from "./progressao";
import { getStatusPrograma, proximaDaFila, sessaoSugerida, seriesDoDia } from "./program";

describe("plano", () => {
  it("tem 4 sessões e cada posição oferece pelo menos 2 exercícios (troca)", () => {
    expect(SESSOES).toEqual(["A", "B", "C", "D"]);
    for (const s of SLOTS) expect(s.opcoes.length, `${s.sessao}${s.ordem}`).toBeGreaterThanOrEqual(2);
  });

  it("não repete exercício dentro de uma posição nem na mesma sessão", () => {
    for (const s of SLOTS) expect(new Set(s.opcoes.map((o) => o.id)).size).toBe(s.opcoes.length);
    for (const t of SESSOES) {
      const padroes = SLOTS.filter((s) => s.sessao === t).map((s) => s.opcoes[0].id);
      expect(new Set(padroes).size).toBe(padroes.length);
    }
  });

  it("um mesmo id nunca muda de grupo muscular entre posições (histórico e relatório dependem disso)", () => {
    const grupoPorId = new Map<string, string>();
    for (const s of SLOTS) {
      for (const o of s.opcoes) {
        const antes = grupoPorId.get(o.id);
        if (antes) expect(antes, o.id).toBe(s.grupoMuscular);
        grupoPorId.set(o.id, s.grupoMuscular);
      }
    }
  });

  it("toda foto citada existe em public/exercicios", () => {
    for (const s of SLOTS) {
      for (const o of s.opcoes) {
        if (!o.imagem) continue;
        for (const i of [0, 1]) expect(existsSync(path.join(__dirname, "..", "..", "public", "exercicios", o.imagem, `${i}.jpg`)), `${o.id}/${i}`).toBe(true);
      }
    }
  });

  it("toda faixa de repetições é lida pela progressão de carga (ou é em segundos)", () => {
    for (const s of SLOTS) {
      for (const o of s.opcoes) {
        const reps = o.reps ?? s.reps;
        if (/\bs\b/.test(reps)) continue;
        expect(parseFaixaReps(reps), `${o.id}: ${reps}`).not.toBeNull();
      }
    }
  });

  it("nada de exercício que sobrecarrega a lombar", () => {
    const proibidos = /stiff|terra|good morning|romeno|rdl|curvada|barra nas costas|agachamento livre|extensora lombar/i;
    for (const s of SLOTS) for (const o of s.opcoes) expect(o.nome, o.nome).not.toMatch(proibidos);
  });
});

describe("troca de exercício", () => {
  it("sem troca vale o padrão", () => {
    const a = getSessaoCompleta("A");
    expect(a[0].id).toBe("leg-press-45");
    expect(a[0].trocado).toBe(false);
    expect(a[0].slotKey).toBe("A1");
  });

  it("a troca vale só para a posição e mantém a prescrição", () => {
    const a = getSessaoCompleta("A", { A1: "hack-squat" });
    expect(a[0].id).toBe("hack-squat");
    expect(a[0].trocado).toBe(true);
    expect(a[0].series).toBe(3);
    expect(a[1].id).toBe("passada-estatica-smith");
  });

  it("troca para um exercício que não é opção da posição é ignorada", () => {
    expect(getSessaoCompleta("A", { A1: "supino-reto-halteres" })[0].id).toBe("leg-press-45");
  });

  it("a opção pode mudar a unidade (prancha em segundos)", () => {
    const core = getSessaoCompleta("A", { A6: "prancha-frontal" })[5];
    expect(core.reps).toBe("30-45 s");
    expect(getSessaoCompleta("A")[5].reps).toBe("8-10 por lado");
  });

  it("o histórico resolve nome e grupo de qualquer opção", () => {
    expect(getExercicio("hack-squat")?.grupoMuscular).toBe("Quadríceps");
    expect(getExercicio("abdutora-maquina")?.grupoMuscular).toBe("Glúteo");
  });
});

describe("programa", () => {
  const sessao = (data: string, tipo: "A" | "B" | "C" | "D", fim = true) => ({ data, sessaoTipo: tipo, inicioISO: `${data}T09:00:00Z`, fimISO: fim ? `${data}T10:00:00Z` : null });

  it("fila A → B → C → D → A", () => {
    expect(proximaDaFila("A")).toBe("B");
    expect(proximaDaFila("D")).toBe("A");
  });

  it("começa no A e segue a fila a partir do último treino concluído", () => {
    expect(sessaoSugerida("2026-10-26", { log: [], sessoes: {} })).toBe("A");
    expect(sessaoSugerida("2026-10-27", { log: [], sessoes: { "2026-10-26": [sessao("2026-10-26", "A")] } })).toBe("B");
  });

  it("no mesmo dia continua na sessão que já começou", () => {
    expect(sessaoSugerida("2026-10-26", { log: [], sessoes: { "2026-10-26": [sessao("2026-10-26", "B", false)] } })).toBe("B");
  });

  it("séries registradas hoje sem apertar Iniciar mantêm a sessão (não pula para a próxima)", () => {
    const serie = { exercicioId: "leg-press-45", data: "2026-10-26", serieNumero: 1, cargaKg: 60, reps: 10, sessao: "A" as const, registradoEm: "2026-10-26T10:00:00Z" };
    expect(sessaoSugerida("2026-10-26", { log: [serie], sessoes: {} })).toBe("A");
    // no dia seguinte, aí sim, a próxima da fila
    expect(sessaoSugerida("2026-10-27", { log: [serie], sessoes: {} })).toBe("B");
  });

  it("retomada: os 4 primeiros treinos têm 2 séries por exercício", () => {
    expect(getStatusPrograma("2026-10-26", "A", { log: [], sessoes: {} }).retomada).toBe(true);
    expect(seriesDoDia(3, true)).toBe(2);
    expect(seriesDoDia(2, true)).toBe(2);
    expect(seriesDoDia(3, false)).toBe(3);
    const quatro = Object.fromEntries(["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-23"].map((d, i) => [d, [sessao(d, (["A", "B", "C", "D"] as const)[i])]]));
    expect(getStatusPrograma("2026-10-26", "A", { log: [], sessoes: quatro }).retomada).toBe(false);
  });

  it("a sessão de hoje não entra na conta da retomada (o volume não muda no meio do treino)", () => {
    const quatro = Object.fromEntries(["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-26"].map((d, i) => [d, [sessao(d, (["A", "B", "C", "D"] as const)[i])]]));
    expect(getStatusPrograma("2026-10-26", "D", { log: [], sessoes: quatro }).retomada).toBe(true);
  });
});
