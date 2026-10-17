import type { EscolhaDoDia, PalpiteCalibracao, RegistroBikeIndoor, RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";

// Tudo que as contas do app precisam, já lido. No navegador vem do localStorage
// (`lerDadosLocais` em storage.ts); no servidor, do backup sincronizado (`dadosDoBackup`).
// As funções puras abaixo recebem isto em vez de ler o storage, para o MCP chegar nos
// mesmos números que as telas.
export interface DadosTreino {
  log: SerieRegistrada[];
  sessoes: Record<string, RegistroSessao[]>;
  bike: Record<string, RegistroBikeIndoor>;
  palpites: PalpiteCalibracao[];
  escolhas: Record<string, EscolhaDoDia>;
  dataInicio: string | null;
}

export const KEY_LOG = "treino:log";
export const KEY_INICIO = "treino:dataInicio";
export const KEY_SESSOES = "treino:sessoesPorDia";
export const KEY_ESCOLHAS = "treino:escolhaPorDia";
export const KEY_BIKE = "treino:bikeIndoor";
export const KEY_CALIBRACAO = "treino:calibracaoRIR";
export const KEY_VERSAO = "treino:versaoPrograma";
export const KEY_ARQUIVO_PPL = "treino:arquivo:ppl-v4";
// Lápides das remoções, para o sync com merge não ressuscitar o que foi apagado.
export const KEY_REMOVIDOS = "treino:removidos";
// Quem gravou por último no servidor ("app" ou "mcp"). Só existe no backup do servidor.
export const KEY_ORIGEM = "treino:meta:origem";

function analisar<T>(bruto: string | null | undefined, padrao: T): T {
  if (!bruto) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

// Monta os dados a partir do mapa chave → texto bruto (formato do backup / localStorage).
export function dadosDoBackup(dados: Record<string, string | null | undefined>): DadosTreino {
  return {
    log: analisar<SerieRegistrada[]>(dados[KEY_LOG], []),
    sessoes: analisar<Record<string, RegistroSessao[]>>(dados[KEY_SESSOES], {}),
    bike: analisar<Record<string, RegistroBikeIndoor>>(dados[KEY_BIKE], {}),
    palpites: analisar<PalpiteCalibracao[]>(dados[KEY_CALIBRACAO], []),
    escolhas: analisar<Record<string, EscolhaDoDia>>(dados[KEY_ESCOLHAS], {}),
    dataInicio: dados[KEY_INICIO] || null,
  };
}

export function ultimaExecucaoEm(log: SerieRegistrada[], exercicioId: string, antesDe?: string): SerieRegistrada[] {
  const registros = log.filter((s) => s.exercicioId === exercicioId && (!antesDe || s.data < antesDe));
  if (registros.length === 0) return [];
  const ultimaData = registros.reduce((max, r) => (r.data > max ? r.data : max), registros[0].data);
  return registros.filter((r) => r.data === ultimaData).sort((a, b) => a.serieNumero - b.serieNumero);
}

// ===== Sessões concluídas do programa (fila A → E) =====

const SESSOES_PROGRAMA: SessaoTreino[] = ["A", "B", "C", "D", "E"];

export function ehSessaoDoPrograma(tipo: string): tipo is SessaoTreino {
  return (SESSOES_PROGRAMA as string[]).includes(tipo);
}

export interface SessaoConcluida {
  data: string;
  tipo: SessaoTreino;
  quando: string; // ISO — para ordenar sessões do mesmo dia
}

// Uma sessão conta como concluída se foi terminada no timer OU se tem série registrada
// (quem esquece de apertar "Terminar" não perde a sessão). Registros do PPL não entram:
// têm tipo PUSH/PULL/LEGS e séries sem `sessao`.
export function sessoesConcluidasEm(d: Pick<DadosTreino, "log" | "sessoes">, dataInicioISO: string): SessaoConcluida[] {
  const porChave = new Map<string, SessaoConcluida>();
  for (const lista of Object.values(d.sessoes)) {
    for (const r of lista) {
      if (!r.fimISO || r.data < dataInicioISO || !ehSessaoDoPrograma(r.sessaoTipo)) continue;
      porChave.set(`${r.data}:${r.sessaoTipo}`, { data: r.data, tipo: r.sessaoTipo, quando: r.fimISO });
    }
  }
  for (const s of d.log) {
    if (!s.sessao || s.data < dataInicioISO || (s.cargaKg === null && s.reps === null)) continue;
    const chave = `${s.data}:${s.sessao}`;
    const atual = porChave.get(chave);
    if (!atual || s.registradoEm > atual.quando) porChave.set(chave, { data: s.data, tipo: s.sessao, quando: s.registradoEm });
  }
  return Array.from(porChave.values()).sort((a, b) => (a.quando < b.quando ? -1 : 1));
}

export function diasTreinadosUnicosEm(d: Pick<DadosTreino, "log" | "sessoes">): string[] {
  const dias = new Set(d.log.map((s) => s.data));
  for (const lista of Object.values(d.sessoes)) {
    for (const sessao of lista) {
      if (sessao.fimISO) dias.add(sessao.data);
    }
  }
  return Array.from(dias).sort();
}

// Erro médio (real − palpite) da calibração. O "real" é a última série registrada do
// exercício naquele dia. Erro médio > 2 = você para cedo demais.
export function erroMedioCalibracaoEm(d: Pick<DadosTreino, "log" | "palpites">): { amostras: number; erroMedio: number | null } {
  const erros: number[] = [];
  for (const p of d.palpites) {
    const doDia = d.log.filter((s) => s.exercicioId === p.exercicioId && s.data === p.data && s.reps !== null);
    if (doDia.length === 0) continue;
    const ultima = doDia.reduce((a, b) => (b.serieNumero > a.serieNumero ? b : a));
    erros.push((ultima.reps as number) - p.palpite);
  }
  if (erros.length === 0) return { amostras: 0, erroMedio: null };
  return { amostras: erros.length, erroMedio: Math.round((erros.reduce((a, b) => a + b, 0) / erros.length) * 10) / 10 };
}
