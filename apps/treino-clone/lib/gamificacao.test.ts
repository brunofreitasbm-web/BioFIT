import { describe, expect, it } from "vitest";
import {
  atividadePorDia,
  calcularGamificacao,
  calcularSequencia,
  inicioDaSemana,
  multiplicadorDaSequencia,
  nivelDoXp,
  semanasNaMeta,
  statusSemana,
  xpParaAlcancar,
} from "./gamificacao";
import { addDiasISO } from "./program";
import type { RegistroDiaLeve, SerieRegistrada } from "./tipos";

// 2026-10-26 é segunda-feira.
const SEG = "2026-10-26";
const dia = (n: number) => addDiasISO(SEG, n);

function serie(data: string, n = 1): SerieRegistrada[] {
  return Array.from({ length: n }, (_, i) => ({
    exercicioId: "x",
    data,
    serieNumero: i + 1,
    cargaKg: 20,
    reps: 10,
    sessao: "A" as const,
    registradoEm: `${data}T10:00:00.000Z`,
  }));
}

function hist(treinos: Record<string, number>, leves: string[] = []) {
  const log = Object.entries(treinos).flatMap(([d, n]) => serie(d, n));
  const diasLeves: Record<string, RegistroDiaLeve> = {};
  for (const d of leves) diasLeves[d] = { data: d, atividade: "Caminhada", registradoEm: `${d}T08:00:00.000Z` };
  return { log, sessoes: {}, diasLeves };
}

const seq = (h: ReturnType<typeof hist>, hoje: string) => calcularSequencia(atividadePorDia(h), hoje);

describe("sequência", () => {
  it("conta dias seguidos e hoje ainda aberto não quebra", () => {
    const h = hist({ [dia(0)]: 3, [dia(1)]: 3 });
    expect(seq(h, dia(2)).atual).toBe(2); // hoje (dia 2) ainda não treinou
    expect(seq(h, dia(2)).hojeFeito).toBe(false);
    expect(seq(h, dia(1)).hojeFeito).toBe(true);
  });

  it("zera após uma falta sem escudo", () => {
    const h = hist({ [dia(0)]: 3, [dia(1)]: 3 });
    const s = seq(h, dia(3)); // faltou o dia 2
    expect(s.atual).toBe(0);
    expect(s.recorde).toBe(2);
  });

  it("ganha escudo a cada 7 dias e ele cobre uma falta", () => {
    const treinos: Record<string, number> = {};
    for (let i = 0; i < 7; i++) treinos[dia(i)] = 2;
    treinos[dia(9)] = 2; // faltou o dia 7 e o 8? não: dia 7 coberto, dia 8 quebra
    const h = hist(treinos);
    const s7 = seq(h, dia(6));
    expect(s7.atual).toBe(7);
    expect(s7.escudos).toBe(1);
    // dia 7 faltou: escudo cobre, sequência segue em 7 (não soma)
    const s8 = seq(h, dia(8));
    expect(s8.atual).toBe(7);
    expect(s8.escudos).toBe(0);
    expect(s8.diasProtegidos).toEqual([dia(7)]);
    // dia 8 também faltou, sem escudo: quebra
    const s10 = seq(h, dia(9));
    expect(s10.atual).toBe(1);
    expect(s10.recorde).toBe(7);
  });

  it("escudos têm teto de 2", () => {
    const treinos: Record<string, number> = {};
    for (let i = 0; i < 21; i++) treinos[dia(i)] = 1;
    expect(seq(hist(treinos), dia(20)).escudos).toBe(2);
  });

  it("dia leve mantém a sequência", () => {
    const h = hist({ [dia(0)]: 3, [dia(2)]: 3 }, [dia(1)]);
    expect(seq(h, dia(2)).atual).toBe(3);
  });

  it("conta volta por cima após 3+ dias parada", () => {
    const h = hist({ [dia(0)]: 3, [dia(6)]: 3 }); // 5 dias parada
    const s = seq(h, dia(6));
    expect(s.recomecos).toBe(1);
    expect(s.atual).toBe(1);
  });

  it("1 ou 2 dias de pausa não contam como recomeço", () => {
    const h = hist({ [dia(0)]: 3, [dia(3)]: 3 }); // 2 dias parada
    expect(seq(h, dia(3)).recomecos).toBe(0);
  });

  it("série sem carga nem reps não conta", () => {
    const h = hist({});
    h.log.push({ exercicioId: "x", data: dia(0), serieNumero: 1, cargaKg: null, reps: null, registradoEm: "" });
    expect(seq(h, dia(0)).atual).toBe(0);
  });

  it("sem histórico", () => {
    const s = seq(hist({}), dia(0));
    expect(s).toMatchObject({ atual: 0, recorde: 0, escudos: 0, hojeFeito: false, ultimoDiaAtivo: null });
  });
});

describe("semana", () => {
  it("semana começa na segunda", () => {
    expect(inicioDaSemana(SEG)).toBe(SEG);
    expect(inicioDaSemana(dia(6))).toBe(SEG); // domingo
    expect(inicioDaSemana(dia(7))).toBe(dia(7));
  });

  it("conta dias de musculação (leve não conta) e a meta", () => {
    const h = hist({ [dia(0)]: 3, [dia(2)]: 3 }, [dia(1)]);
    const a = atividadePorDia(h);
    const sem = statusSemana(a, [], dia(3), 3);
    expect(sem.diasDeForca).toBe(2);
    expect(sem.faltam).toBe(1);
    expect(sem.batida).toBe(false);
    expect(sem.dias.map((d) => d.estado)).toEqual(["forca", "leve", "forca", "hoje", "futuro", "futuro", "futuro"]);
  });

  it("detecta meta impossível de fechar", () => {
    const a = atividadePorDia(hist({ [dia(0)]: 3 }));
    // sábado, 1 treino, meta 5 → restam sáb+dom = 2 dias
    expect(statusSemana(a, [], dia(5), 5).possivel).toBe(false);
    expect(statusSemana(a, [], dia(5), 3).possivel).toBe(true);
  });

  it("semanas na meta e seguidas", () => {
    const treinos: Record<string, number> = {};
    // semana 0: 3 dias; semana 1: 1 dia (falha); semana 2: 3 dias; semana 3: 3 dias
    for (const d of [0, 1, 2, 8, 14, 15, 16, 21, 22, 23]) treinos[dia(d)] = 1;
    const a = atividadePorDia(hist(treinos));
    expect(semanasNaMeta(a, dia(28), 3)).toEqual({ total: 3, seguidas: 2 });
  });
});

describe("XP e nível", () => {
  it("multiplicador por sequência", () => {
    expect(multiplicadorDaSequencia(1)).toBe(1);
    expect(multiplicadorDaSequencia(7)).toBe(1.25);
    expect(multiplicadorDaSequencia(14)).toBe(1.5);
    expect(multiplicadorDaSequencia(30)).toBe(2);
  });

  it("série vale 10 e dia leve 40", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 4 }, [dia(1)]), dia(1), 3);
    // dia 0: 4 séries × 10 + 1 sessão × 100 = 140 ; dia 1: dia leve = 40
    expect(g.xp.total).toBe(180);
    expect(g.xp.hoje).toBe(40);
  });

  it("multiplicador entra a partir do 7º dia seguido", () => {
    const treinos: Record<string, number> = {};
    for (let i = 0; i < 7; i++) treinos[dia(i)] = 1;
    const g = calcularGamificacao(hist(treinos), dia(6), 3);
    // por dia: 10 + 100 = 110 ; 6 dias × 110 + 1 dia × round(110 × 1.25)=138
    expect(g.xp.total).toBe(6 * 110 + 138);
    expect(g.xp.hoje).toBe(138);
  });

  it("níveis crescem e a fração fica entre 0 e 1", () => {
    expect(nivelDoXp(0).nivel).toBe(1);
    expect(nivelDoXp(xpParaAlcancar(2)).nivel).toBe(2);
    expect(nivelDoXp(xpParaAlcancar(2) - 1).nivel).toBe(1);
    const n = nivelDoXp(xpParaAlcancar(5) + 10);
    expect(n.nivel).toBe(5);
    expect(n.fracao).toBeGreaterThan(0);
    expect(n.fracao).toBeLessThan(1);
  });

  it("apagar uma série reduz o XP (nada guardado)", () => {
    const cheio = calcularGamificacao(hist({ [dia(0)]: 5 }), dia(0), 3).xp.total;
    const menor = calcularGamificacao(hist({ [dia(0)]: 4 }), dia(0), 3).xp.total;
    expect(cheio - menor).toBe(10);
  });
});

describe("conquistas e mensagens", () => {
  it("desbloqueia por sequência recorde, mesmo depois de quebrar", () => {
    const treinos: Record<string, number> = {};
    for (let i = 0; i < 3; i++) treinos[dia(i)] = 1;
    const g = calcularGamificacao(hist(treinos), dia(10), 3);
    expect(g.conquistas.find((c) => c.id === "sequencia-3")?.desbloqueada).toBe(true);
    expect(g.conquistas.find((c) => c.id === "sequencia-7")?.desbloqueada).toBe(false);
  });

  it("próxima conquista é a mais adiantada", () => {
    const treinos: Record<string, number> = {};
    for (let i = 0; i < 6; i++) treinos[dia(i)] = 1;
    const g = calcularGamificacao(hist(treinos), dia(5), 3);
    expect(g.proxima?.id).toBe("sequencia-7");
  });

  it("mensagem acolhe quem voltou de uma pausa longa em vez de cobrar", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 3 }), dia(8), 3);
    expect(g.mensagem.tom).toBe("acolher");
    expect(g.mensagem.texto).not.toMatch(/perdeu|falhou/i);
  });

  it("mensagem avisa que a sequência está em jogo", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 3, [dia(1)]: 3 }), dia(2), 3);
    expect(g.mensagem.titulo).toMatch(/2 dias/);
    expect(g.mensagem.tom).toBe("empurrar");
  });
});
