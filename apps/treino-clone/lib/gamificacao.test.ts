import { describe, expect, it } from "vitest";
import {
  atividadePorDia,
  calcularGamificacao,
  calcularSemanas,
  contarCargasNovas,
  inicioDaSemana,
  multiplicadorDasSemanas,
  nivelDoXp,
  statusSemana,
  xpParaAlcancar,
} from "./gamificacao";
import { addDiasISO } from "./program";
import type { SerieRegistrada } from "./tipos";

// 2026-10-26 é segunda-feira.
const SEG = "2026-10-26";
const dia = (n: number) => addDiasISO(SEG, n);

function serie(data: string, n = 1, extra: Partial<SerieRegistrada> = {}): SerieRegistrada[] {
  return Array.from({ length: n }, (_, i) => ({
    exercicioId: "x",
    data,
    serieNumero: i + 1,
    cargaKg: 20,
    reps: 10,
    sessao: "A" as const,
    registradoEm: `${data}T10:00:00.000Z`,
    ...extra,
  }));
}

// treinos: dia → nº de séries. Semana s (0 = 26/10) tem os dias s*7 + [0..6].
function hist(treinos: Record<string, number>) {
  return { log: Object.entries(treinos).flatMap(([d, n]) => serie(d, n)), sessoes: {} };
}

// Semana `s` com `n` treinos (seg, ter, qui, sex...).
const DIAS_DE_TREINO = [0, 1, 3, 4, 2, 5, 6];
function semanas(plano: number[], extra: Record<string, number> = {}) {
  const t: Record<string, number> = { ...extra };
  plano.forEach((n, s) => {
    for (let i = 0; i < n; i++) t[dia(s * 7 + DIAS_DE_TREINO[i])] = 3;
  });
  return hist(t);
}

const sem = (h: ReturnType<typeof hist>, hoje: string) => calcularSemanas(atividadePorDia(h), hoje);

describe("semana atual", () => {
  it("semana começa na segunda", () => {
    expect(inicioDaSemana(SEG)).toBe(SEG);
    expect(inicioDaSemana(dia(6))).toBe(SEG);
    expect(inicioDaSemana(dia(7))).toBe(dia(7));
  });

  it("conta dias com treino, faltam e dias restantes", () => {
    const s = statusSemana(atividadePorDia(hist({ [dia(0)]: 3, [dia(2)]: 3 })), dia(3));
    expect(s.feitos).toBe(2);
    expect(s.faltam).toBe(2);
    expect(s.diasRestantes).toBe(4); // qui (hoje), sex, sáb, dom
    expect(s.dias.map((d) => d.estado)).toEqual(["treinou", "passado", "treinou", "hoje", "futuro", "futuro", "futuro"]);
    expect(s.possivel).toBe(true);
    expect(s.tudoOuNada).toBe(false);
  });

  it("dois treinos no mesmo dia contam como 1 dia", () => {
    const h = { log: [...serie(dia(0), 2, { sessao: "A" }), ...serie(dia(0), 2, { sessao: "B", exercicioId: "y" })], sessoes: {} };
    expect(statusSemana(atividadePorDia(h), dia(0)).feitos).toBe(1);
  });

  it("avisa quando só fecha treinando todos os dias que restam", () => {
    const s = statusSemana(atividadePorDia(hist({ [dia(0)]: 3, [dia(1)]: 3 })), dia(5)); // sáb: faltam 2, restam sáb+dom
    expect(s.tudoOuNada).toBe(true);
    expect(s.possivel).toBe(true);
    const impossivel = statusSemana(atividadePorDia(hist({ [dia(0)]: 3 })), dia(5));
    expect(impossivel.possivel).toBe(false);
  });

  it("hoje já treinado não conta como dia restante", () => {
    const s = statusSemana(atividadePorDia(hist({ [dia(5)]: 3 })), dia(5));
    expect(s.diasRestantes).toBe(1); // só domingo
  });
});

describe("semanas seguidas na meta", () => {
  it("avança com 4 treinos e quebra com menos", () => {
    const h = semanas([4, 4, 3]);
    expect(sem(h, dia(21)).atual).toBe(0); // semana 2 (3 treinos) quebrou
    expect(sem(h, dia(21)).recorde).toBe(2);
    expect(sem(semanas([4, 4]), dia(13)).atual).toBe(2);
  });

  it("a semana em curso conta se já bateu a meta, e não quebra se ainda não", () => {
    const h = semanas([4, 4, 2]); // semana 2 ainda em curso com 2 treinos
    expect(sem(h, dia(15)).atual).toBe(2);
    const bateu = semanas([4, 4, 4]);
    expect(sem(bateu, dia(20)).atual).toBe(3);
  });

  it("a primeira semana é neutra: quem recomeça na quinta não é punida", () => {
    const h = hist({ [dia(3)]: 3, [dia(4)]: 3, ...Object.fromEntries([0, 1, 3, 4].map((i) => [dia(7 + i), 3])) });
    const s = sem(h, dia(13));
    expect(s.atual).toBe(1); // semana 1 fechou 4; semana 0 foi neutra
    expect(s.recorde).toBe(1);
  });

  it("ganha semana livre a cada 4 semanas e ela cobre uma semana ruim", () => {
    const h = semanas([4, 4, 4, 4, 2, 4]);
    const s = sem(h, dia(5 * 7 + 6));
    expect(s.semanasProtegidas).toEqual([dia(4 * 7)]);
    expect(s.atual).toBe(5); // 4 + (protegida não soma) + 1
    expect(s.escudos).toBe(0);
  });

  it("sem semana livre, a semana ruim zera", () => {
    const s = sem(semanas([4, 4, 2, 4]), dia(3 * 7 + 6));
    expect(s.atual).toBe(1);
    expect(s.recorde).toBe(2);
  });

  it("semana livre tem teto de 1", () => {
    const s = sem(semanas([4, 4, 4, 4, 4, 4, 4, 4]), dia(7 * 7 + 6));
    expect(s.escudos).toBe(1);
    expect(s.atual).toBe(8);
  });

  it("conta volta por cima após 7+ dias parada, não antes", () => {
    const longe = hist({ [dia(0)]: 3, [dia(9)]: 3 }); // 8 dias sem treinar
    expect(sem(longe, dia(9)).recomecos).toBe(1);
    const curto = hist({ [dia(0)]: 3, [dia(7)]: 3 }); // 6 dias sem treinar
    expect(sem(curto, dia(7)).recomecos).toBe(0);
  });

  it("série sem carga nem reps não conta", () => {
    const h = hist({});
    h.log.push({ exercicioId: "x", data: dia(0), serieNumero: 1, cargaKg: null, reps: null, registradoEm: "" });
    expect(sem(h, dia(0)).totalNaMeta).toBe(0);
    expect(sem(h, dia(0)).ultimoTreino).toBeNull();
  });
});

describe("XP e nível", () => {
  it("série vale 10 e treino 100", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 4 }), dia(0));
    expect(g.xp.total).toBe(140);
    expect(g.xp.hoje).toBe(140);
  });

  it("multiplicador por semanas seguidas", () => {
    expect(multiplicadorDasSemanas(0)).toBe(1);
    expect(multiplicadorDasSemanas(2)).toBe(1.25);
    expect(multiplicadorDasSemanas(4)).toBe(1.5);
    expect(multiplicadorDasSemanas(8)).toBe(2);
  });

  it("o bônus vale na semana seguinte a 2 semanas na meta", () => {
    const h = semanas([4, 4], { [dia(14)]: 4 }); // terça da 3ª semana
    const g = calcularGamificacao(h, dia(14));
    expect(g.xp.hoje).toBe(Math.round((4 * 10 + 100) * 1.25));
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
    const a = calcularGamificacao(hist({ [dia(0)]: 5 }), dia(0)).xp.total;
    const b = calcularGamificacao(hist({ [dia(0)]: 4 }), dia(0)).xp.total;
    expect(a - b).toBe(10);
  });
});

describe("cargas novas", () => {
  const s = (exercicioId: string, data: string, cargaKg: number) => serie(data, 1, { exercicioId, cargaKg });
  it("conta só quando supera o melhor anterior; a 1ª vez não conta", () => {
    const log = [...s("a", dia(0), 20), ...s("a", dia(2), 20), ...s("a", dia(4), 25), ...s("a", dia(6), 22), ...s("a", dia(8), 27.5)];
    expect(contarCargasNovas(log)).toBe(2);
  });
  it("exercícios independentes", () => {
    expect(contarCargasNovas([...s("a", dia(0), 10), ...s("b", dia(1), 50), ...s("a", dia(2), 12.5)])).toBe(1);
  });
});

describe("conquistas e mensagens", () => {
  it("desbloqueia por recorde de semanas, mesmo depois de quebrar", () => {
    const g = calcularGamificacao(semanas([4, 4, 0, 0]), dia(3 * 7 + 6));
    expect(g.conquistas.find((c) => c.id === "semanas-2")?.desbloqueada).toBe(true);
    expect(g.conquistas.find((c) => c.id === "semanas-4")?.desbloqueada).toBe(false);
  });

  it("primeiro treino e primeiro ciclo", () => {
    const um = calcularGamificacao(hist({ [dia(0)]: 3 }), dia(0));
    expect(um.conquistas.find((c) => c.id === "primeiro-treino")?.desbloqueada).toBe(true);
    expect(um.conquistas.find((c) => c.id === "sessoes-4")?.desbloqueada).toBe(false);
  });

  it("sem histórico, a mensagem explica a retomada em vez de cobrar", () => {
    const g = calcularGamificacao(hist({}), dia(0));
    expect(g.mensagem.titulo).toMatch(/volta/i);
    expect(g.mensagem.texto).toMatch(/2 séries/);
  });

  it("mensagem acolhe quem passou 7+ dias parada", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 3 }), dia(9));
    expect(g.mensagem.tom).toBe("acolher");
    expect(g.mensagem.texto).not.toMatch(/perdeu|falhou/i);
  });

  it("mensagem diz quando não dá para pular nenhum dia", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 3, [dia(1)]: 3 }), dia(5));
    expect(g.mensagem.titulo).toMatch(/dia de treino/i);
    expect(g.mensagem.texto).toMatch(/não dá para pular/);
    expect(g.mensagem.texto).toMatch(/Faltam 2 treinos e restam 2 dias/);
  });

  it("depois de treinar hoje, mostra quanto falta", () => {
    const g = calcularGamificacao(hist({ [dia(0)]: 3 }), dia(0));
    expect(g.treinouHoje).toBe(true);
    expect(g.mensagem.texto).toMatch(/Faltam 3 treinos/);
  });
});
