import { KEY_BIKE, KEY_INICIO, KEY_LOG, KEY_SESSOES } from "@/lib/dados";
import { SLOTS } from "@/lib/exercicios";
import type { RegistroSessao, SerieRegistrada, SessaoTreino } from "@/lib/tipos";
import type { BackupGuardado } from "../backup";

// Duas semanas de treino: sessões A–E em sequência a partir de 2026-10-01 (uma por dia, com
// um descanso), mais bike. O "hoje" dos testes é 2026-10-12.
export const HOJE = "2026-10-12";
export const INICIO = "2026-10-01";

const ORDEM: SessaoTreino[] = ["A", "B", "C", "D", "E"];

function idsDaSessao(sessao: SessaoTreino) {
  return SLOTS.filter((s) => s.sessao === sessao)
    .sort((a, b) => a.ordem - b.ordem)
    .map((s) => ({ id: s.meso1.id, series: s.series }));
}

export function montarDados(): Record<string, string> {
  const log: SerieRegistrada[] = [];
  const sessoes: Record<string, RegistroSessao[]> = {};
  const bike: Record<string, unknown> = {};
  const dias = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
  dias.forEach((data, i) => {
    const sessao = ORDEM[i % ORDEM.length];
    const inicio = `${data}T10:00:00.000Z`;
    const fim = `${data}T11:00:00.000Z`;
    sessoes[data] = [{ data, sessaoTipo: sessao, inicioISO: inicio, fimISO: fim }];
    for (const ex of idsDaSessao(sessao)) {
      for (let n = 1; n <= ex.series; n++) {
        log.push({
          exercicioId: ex.id,
          sessao,
          data,
          serieNumero: n,
          cargaKg: 20 + i * 2.5,
          reps: 8 + (n % 3),
          rir: n === ex.series ? 1 : null,
          registradoEm: `${data}T10:${String(10 + n).padStart(2, "0")}:00.000Z`,
        });
      }
    }
  });
  bike["2026-10-04"] = { data: "2026-10-04", tempoMinutos: 30, concluido: true, registradoEm: "2026-10-04T12:00:00.000Z" };
  return {
    [KEY_LOG]: JSON.stringify(log),
    [KEY_SESSOES]: JSON.stringify(sessoes),
    [KEY_BIKE]: JSON.stringify(bike),
    [KEY_INICIO]: INICIO,
  };
}

export function montarBackup(dados = montarDados()): BackupGuardado {
  return { dados, atualizadoEm: "2026-10-09T12:00:00.000Z" };
}
