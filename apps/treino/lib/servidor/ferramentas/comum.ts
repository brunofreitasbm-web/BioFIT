import { dadosDoBackup, KEY_REMOVIDOS, type DadosTreino } from "@/lib/dados";
import type { Removido } from "@/lib/merge";
import { EXERCICIOS_PPL_V4 } from "@/lib/arquivo/pplV4";
import { getExercicio, SESSOES, SLOTS } from "@/lib/exercicios";
import { getStatusPrograma, sessaoSugerida } from "@/lib/program";
import type { RegistroSessao, SerieRegistrada, SessaoTreino } from "@/lib/tipos";
import type { BackupGuardado, DadosBackup } from "../backup";

export interface Contexto {
  backup: BackupGuardado;
  dados: DadosTreino;
  hoje: string; // YYYY-MM-DD em America/Belem
}

interface Base {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface FerramentaLeitura extends Base {
  tipo: "leitura";
  executar: (args: Record<string, unknown>, ctx: Contexto) => unknown;
}

// Escritas não gravam direto: devolvem só as chaves alteradas, que a rota mescla no backup
// (lib/merge.ts) com controle de concorrência. `data` é o dia cujo estado volta na resposta.
export interface ResultadoEscrita {
  entrada: DadosBackup;
  data?: string; // se informado, a resposta traz o estado desse dia
  mensagem: string;
  detalhe?: unknown;
}

export interface FerramentaEscrita extends Base {
  tipo: "escrita";
  destrutiva: boolean;
  idempotente: boolean;
  escrever: (args: Record<string, unknown>, ctx: Contexto) => ResultadoEscrita | Promise<ResultadoEscrita>;
}

export type Ferramenta = FerramentaLeitura | FerramentaEscrita;

export function contextoDe(backup: BackupGuardado, hoje = hojeBelem()): Contexto {
  return { backup, dados: dadosDoBackup(backup.dados), hoje };
}

export const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function hojeBelem(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Belem" }).format(new Date());
}

export function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// As funções do app recebem `hoje` como Date e o convertem em data local; meio-dia evita
// que o fuso do servidor mude o dia.
export function dataLocal(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export const r1 = (n: number) => Math.round(n * 10) / 10;

export function dataArg(args: Record<string, unknown>, nome: string): string | null {
  const v = args[nome];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !ISO.test(v)) throw new Error(`"${nome}" deve ser YYYY-MM-DD.`);
  return v;
}

export function numArg(args: Record<string, unknown>, nome: string, padrao: number, min: number, max: number): number {
  const v = args[nome];
  if (v === undefined) return padrao;
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new Error(`"${nome}" deve ser inteiro entre ${min} e ${max}.`);
  }
  return v;
}

export function sessaoArg(args: Record<string, unknown>, nome = "sessao"): SessaoTreino | null {
  const v = args[nome];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !(SESSOES as string[]).includes(v.toUpperCase())) {
    throw new Error(`"${nome}" deve ser uma de ${SESSOES.join(", ")}.`);
  }
  return v.toUpperCase() as SessaoTreino;
}

export function removidosDe(ctx: Contexto): Removido[] {
  try {
    return JSON.parse(ctx.backup.dados[KEY_REMOVIDOS] ?? "[]") as Removido[];
  } catch {
    return [];
  }
}

export function exigirDataInicio(ctx: Contexto): string {
  if (!ctx.dados.dataInicio) throw new Error("Programa sem data de início no backup: abra o app uma vez para sincronizar.");
  return ctx.dados.dataInicio;
}

// Sessão que vale para o dia: a escolha manual do app, senão a sugerida pela fila A → E.
// null = descanso escolhido.
export function sessaoDoDia(ctx: Contexto, data: string): { sessao: SessaoTreino | null; sugerida: SessaoTreino; escolhida: boolean } {
  const sugerida = sessaoSugerida(exigirDataInicio(ctx), data, ctx.dados);
  const escolha = ctx.dados.escolhas[data];
  if (escolha === "DESCANSO") return { sessao: null, sugerida, escolhida: true };
  return { sessao: escolha ?? sugerida, sugerida, escolhida: Boolean(escolha) };
}

export function mesoAtual(ctx: Contexto, data: string, sessao: SessaoTreino | null): number {
  return getStatusPrograma(exigirDataInicio(ctx), data, sessao, ctx.dados).meso;
}

// ===== Exercícios =====

interface Candidato {
  id: string;
  nome: string;
}

function candidatosDoPrograma(): Candidato[] {
  const mapa = new Map<string, string>();
  for (const s of SLOTS) for (const v of [s.meso1, s.meso2]) mapa.set(v.id, v.nome);
  return Array.from(mapa, ([id, nome]) => ({ id, nome }));
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Aceita o id exato ou um trecho do nome (sem acento/caixa). Ambíguo ou desconhecido = erro
// com as opções, para o modelo perguntar em vez de chutar.
export function resolverExercicio(busca: unknown, opcoes: { incluirArquivados?: boolean; preferir?: string[] } = {}): Candidato {
  if (typeof busca !== "string" || !busca.trim()) throw new Error('"exercicio" é obrigatório.');
  const candidatos = candidatosDoPrograma();
  if (opcoes.incluirArquivados) {
    for (const e of EXERCICIOS_PPL_V4) if (!candidatos.some((c) => c.id === e.id)) candidatos.push({ id: e.id, nome: e.nome });
  }
  const exato = candidatos.find((c) => c.id === busca.trim());
  if (exato) return exato;
  const termo = normalizar(busca);
  let achados = candidatos.filter((c) => normalizar(c.nome).includes(termo) || c.id.includes(termo));
  if (achados.length > 1 && opcoes.preferir) {
    const preferidos = achados.filter((c) => opcoes.preferir!.includes(c.id));
    if (preferidos.length > 0) achados = preferidos;
  }
  if (achados.length === 1) return achados[0];
  if (achados.length === 0) throw new Error(`Exercício "${busca}" não encontrado. Use listar_exercicios para ver os ids.`);
  throw new Error(`"${busca}" é ambíguo: ${achados.map((c) => `${c.id} (${c.nome})`).join("; ")}.`);
}

export function nomeExercicio(id: string): string {
  return getExercicio(id)?.nome ?? id;
}

// ===== Formatação =====

export function resumirSerie(s: SerieRegistrada) {
  return { n: s.serieNumero, cargaKg: s.cargaKg, reps: s.reps, rir: s.rir ?? null, obs: s.observacoes || undefined };
}

export function agruparPorExercicio(series: SerieRegistrada[]) {
  const mapa = new Map<string, SerieRegistrada[]>();
  for (const s of series) mapa.set(s.exercicioId, [...(mapa.get(s.exercicioId) ?? []), s]);
  return Array.from(mapa.entries()).map(([id, lista]) => {
    const info = getExercicio(id);
    const ordenadas = [...lista].sort((a, b) => a.serieNumero - b.serieNumero);
    const volume = ordenadas.reduce((t, s) => t + (s.cargaKg ?? 0) * (s.reps ?? 0), 0);
    return {
      id,
      nome: info?.nome ?? id,
      grupo: info?.grupoMuscular ?? null,
      series: ordenadas.map(resumirSerie),
      volumeKg: Math.round(volume),
    };
  });
}

export function duracaoMin(r: RegistroSessao): number | null {
  if (!r.fimISO) return null;
  return Math.round((new Date(r.fimISO).getTime() - new Date(r.inicioISO).getTime()) / 60000);
}

export function estadoDoDia(dados: DadosTreino, data: string) {
  const doDia = dados.log.filter((s) => s.data === data);
  const sessoes = dados.sessoes[data] ?? [];
  const bike = dados.bike[data];
  return {
    data,
    sessoes: sessoes.map((r) => ({ tipo: r.sessaoTipo, inicio: r.inicioISO, fim: r.fimISO, duracaoMin: duracaoMin(r) })),
    exercicios: agruparPorExercicio(doDia),
    bikeIndoor: bike ? { minutos: bike.tempoMinutos, concluido: bike.concluido } : null,
    temRegistro: doDia.length > 0 || sessoes.length > 0 || Boolean(bike),
  };
}
