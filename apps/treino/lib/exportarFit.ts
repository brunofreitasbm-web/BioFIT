import { getExercicio } from "./exercicios";
import { gerarFit, type SessaoFit } from "./fit";
import { getLog, getTodasSessoes } from "./storage";
import type { RegistroSessao, SerieRegistrada } from "./tipos";

export interface SessaoExportavel {
  chave: string; // "YYYY-MM-DD:A"
  sessao: RegistroSessao;
  series: number;
}

function seriesDaSessao(log: SerieRegistrada[], s: RegistroSessao): SerieRegistrada[] {
  return log.filter((x) => x.data === s.data && x.sessao === s.sessaoTipo);
}

// Só sessões já terminadas e com ao menos uma série: sessão aberta ainda pode mudar.
export function sessoesExportaveis(
  sessoes: Record<string, RegistroSessao[]> = getTodasSessoes(),
  log: SerieRegistrada[] = getLog(),
): SessaoExportavel[] {
  const lista: SessaoExportavel[] = [];
  for (const dia of Object.values(sessoes)) {
    for (const sessao of dia) {
      if (!sessao.fimISO) continue;
      const series = seriesDaSessao(log, sessao).length;
      if (series > 0) lista.push({ chave: `${sessao.data}:${sessao.sessaoTipo}`, sessao, series });
    }
  }
  return lista.sort((a, b) => b.sessao.inicioISO.localeCompare(a.sessao.inicioISO));
}

export function montarSessaoFit(s: RegistroSessao, log: SerieRegistrada[]): SessaoFit {
  const series = seriesDaSessao(log, s)
    .sort((a, b) => a.registradoEm.localeCompare(b.registradoEm))
    .map((x) => ({
      nomeExercicio: getExercicio(x.exercicioId)?.nome ?? x.exercicioId,
      cargaKg: x.cargaKg,
      reps: x.reps,
      fim: new Date(x.registradoEm),
    }));
  return { inicio: new Date(s.inicioISO), fim: new Date(s.fimISO ?? s.inicioISO), series };
}

export function fitDaSessao(s: RegistroSessao, log: SerieRegistrada[] = getLog()): Uint8Array {
  return gerarFit(montarSessaoFit(s, log));
}
