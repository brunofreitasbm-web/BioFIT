import type { SessaoTreino } from "./tipos";
import { SESSOES } from "./exercicios";
import { getLog, getTodasSessoes } from "./storage";
import { sessoesConcluidasEm, type DadosTreino } from "./dados";

// Log + sessões; por padrão lidos do storage do navegador.
type Historico = Pick<DadosTreino, "log" | "sessoes">;
const historicoLocal = (): Historico => ({ log: getLog(), sessoes: getTodasSessoes() });

// Programa sequencial A → B → C → D → A. A contagem é por treinos concluídos, não por
// calendário: faltou um dia, o próximo da fila continua sendo o próximo.
export const SESSOES_POR_CICLO = SESSOES.length;
export const TREINOS_POR_SEMANA = 4;

// Retomada: nos primeiros treinos (a pessoa vem de uma pausa) o volume é reduzido para o corpo
// reaprender o movimento sem dor muscular que derrube a aderência na 2ª semana.
export const TREINOS_DE_RETOMADA = SESSOES_POR_CICLO;
export const SERIES_NA_RETOMADA = 2;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDiasISO(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

export function proximaDaFila(sessao: SessaoTreino): SessaoTreino {
  return SESSOES[(SESSOES.indexOf(sessao) + 1) % SESSOES.length];
}

// Sessão de hoje: se hoje já começou/terminou alguma (timer ou séries registradas), é ela (o app não pula para a próxima no
// meio do dia). Senão, a seguinte à última concluída.
export function sessaoSugerida(hojeISO: string, h: Historico = historicoLocal()): SessaoTreino {
  const deHoje = h.sessoes[hojeISO] ?? [];
  if (deHoje.length > 0) return deHoje[deHoje.length - 1].sessaoTipo;
  // Quem registra séries sem apertar "Iniciar treino" continua na sessão que começou.
  const seriesDeHoje = h.log
    .filter((s) => s.data === hojeISO && s.sessao && (s.cargaKg !== null || s.reps !== null))
    .sort((a, b) => (a.registradoEm < b.registradoEm ? -1 : 1));
  const ultimaSerie = seriesDeHoje[seriesDeHoje.length - 1];
  if (ultimaSerie?.sessao) return ultimaSerie.sessao;
  const concluidas = sessoesConcluidasEm(h);
  const ultima = concluidas[concluidas.length - 1];
  return ultima ? proximaDaFila(ultima.tipo) : "A";
}

export interface StatusPrograma {
  totalConcluidas: number; // sem contar a sessão de hoje
  retomada: boolean; // ainda nos primeiros treinos: volume reduzido
}

// A própria sessão de hoje não entra na conta — senão, ao fechar o 4º treino da retomada, a
// tela de hoje trocaria o volume no meio da sessão.
export function getStatusPrograma(hojeISO: string, sessaoHoje: SessaoTreino | null, h: Historico = historicoLocal()): StatusPrograma {
  const total = sessoesConcluidasEm(h).filter((s) => !(s.data === hojeISO && s.tipo === sessaoHoje)).length;
  return { totalConcluidas: total, retomada: total < TREINOS_DE_RETOMADA };
}

export function seriesDoDia(series: number, retomada: boolean): number {
  return retomada ? Math.min(series, SERIES_NA_RETOMADA) : series;
}
