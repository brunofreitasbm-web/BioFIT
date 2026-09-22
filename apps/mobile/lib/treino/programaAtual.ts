// "Programa Atual": qual exercício do banco está escolhido para cada slot, agora.
// Não rotaciona por calendário — só muda quando o usuário troca manualmente (estagnação,
// dor, falta de equipamento), e a troca fica registrada no "Log de Trocas".
import type { ExercicioEfetivo, SessaoTreino } from "./tipos";
import { getExercicio, getExercicioPadrao, mesclarExercicio, SLOTS_POR_SESSAO } from "./exercicios";
import { adicionarLogTroca, getEscolhaPrograma, getLog, setEscolhaPrograma } from "./storage";

function chave(sessao: SessaoTreino, slot: number): string {
  return `${sessao}-${slot}`;
}

// Exercício escolhido para o slot: o que foi trocado manualmente, ou o padrão da v4 (origem 1).
export function getExercicioIdDoSlot(sessao: SessaoTreino, slot: number): string {
  const escolhas = getEscolhaPrograma();
  return escolhas[chave(sessao, slot)] ?? getExercicioPadrao(sessao, slot).id;
}

export function getExercicioDoSlot(sessao: SessaoTreino, slot: number): ExercicioEfetivo {
  const id = getExercicioIdDoSlot(sessao, slot);
  const exercicio = getExercicio(id) ?? getExercicioPadrao(sessao, slot);
  return mesclarExercicio(exercicio);
}

// Os 6 exercícios (com a escolha atual de cada slot) de uma sessão, na ordem do slot.
export function getSessaoCompleta(sessao: SessaoTreino): ExercicioEfetivo[] {
  return SLOTS_POR_SESSAO[sessao].map((slot) => getExercicioDoSlot(sessao, slot));
}

// Quantas sessões já foram registradas para um exercício específico do banco (usado para
// a progressão de RIR contínua e para preencher "sessões no exercício anterior" no log).
export function sessoesRegistradasDoExercicio(exercicioId: string): number {
  const dias = new Set(
    getLog()
      .filter((s) => s.exercicioId === exercicioId && (s.cargaKg !== null || s.reps !== null))
      .map((s) => s.data),
  );
  return dias.size;
}

// Última carga registrada do exercício (para "carga de referência" no log de trocas).
function ultimaCargaRegistrada(exercicioId: string): number | null {
  const registros = getLog()
    .filter((s) => s.exercicioId === exercicioId && s.cargaKg !== null)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  return registros[0]?.cargaKg ?? null;
}

// Troca o exercício de um slot: persiste a nova escolha e registra no Log de Trocas.
// `hojeISO` é a data do registro (YYYY-MM-DD).
export function trocarExercicioDoSlot(
  sessao: SessaoTreino,
  slot: number,
  novoExercicioId: string,
  hojeISO: string,
  motivo: string,
): boolean {
  const anteriorId = getExercicioIdDoSlot(sessao, slot);
  if (anteriorId === novoExercicioId) return true;

  const escolhas = getEscolhaPrograma();
  escolhas[chave(sessao, slot)] = novoExercicioId;
  const salvouEscolha = setEscolhaPrograma(escolhas);

  const salvouLog = adicionarLogTroca({
    data: hojeISO,
    sessao,
    slot,
    exercicioAnteriorId: anteriorId,
    exercicioNovoId: novoExercicioId,
    sessoesNoAnterior: sessoesRegistradasDoExercicio(anteriorId),
    cargaReferenciaKg: ultimaCargaRegistrada(anteriorId),
    motivo,
  });

  return salvouEscolha && salvouLog;
}

// Reverte o slot para o padrão da v4 (origem 1) — não conta como "troca" no log, é o
// equivalente a desfazer uma substituição.
export function restaurarExercicioPadrao(sessao: SessaoTreino, slot: number): boolean {
  const escolhas = getEscolhaPrograma();
  delete escolhas[chave(sessao, slot)];
  return setEscolhaPrograma(escolhas);
}
