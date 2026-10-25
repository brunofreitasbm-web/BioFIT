import type { EscolhaDoDia, PalpiteCalibracao, RegistroDiaLeve, RegistroSessao, SerieRegistrada, SessaoTreino } from "./tipos";

// Tudo que as contas do app precisam, já lido do localStorage (`lerDadosLocais` em storage.ts).
// As funções puras abaixo recebem isto em vez de ler o storage, para serem testáveis.
export interface DadosTreino {
  log: SerieRegistrada[];
  sessoes: Record<string, RegistroSessao[]>;
  diasLeves: Record<string, RegistroDiaLeve>;
  palpites: PalpiteCalibracao[];
  escolhas: Record<string, EscolhaDoDia>;
  dataInicio: string | null;
}

export const KEY_LOG = "treino:log";
export const KEY_INICIO = "treino:dataInicio";
export const KEY_SESSOES = "treino:sessoesPorDia";
export const KEY_ESCOLHAS = "treino:escolhaPorDia";
export const KEY_DIAS_LEVES = "treino:diasLeves";
export const KEY_CALIBRACAO = "treino:calibracaoRIR";
export const KEY_META_SEMANAL = "treino:metaSemanal";
// O que já foi comemorado (conquistas e nível), para cada marco ser celebrado uma vez só.
export const KEY_CELEBRADO = "treino:celebrado";

function analisar<T>(bruto: string | null | undefined, padrao: T): T {
  if (!bruto) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

// Monta os dados a partir do mapa chave → texto bruto (formato do localStorage).
export function dadosDoBackup(dados: Record<string, string | null | undefined>): DadosTreino {
  return {
    log: analisar<SerieRegistrada[]>(dados[KEY_LOG], []),
    sessoes: analisar<Record<string, RegistroSessao[]>>(dados[KEY_SESSOES], {}),
    diasLeves: analisar<Record<string, RegistroDiaLeve>>(dados[KEY_DIAS_LEVES], {}),
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
// (quem esquece de apertar "Terminar" não perde a sessão).
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
