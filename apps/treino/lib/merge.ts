import { KEY_BIKE, KEY_LOG, KEY_REMOVIDOS, KEY_SESSOES } from "./dados";
import type { RegistroBikeIndoor, RegistroSessao, SerieRegistrada } from "./tipos";

// Sync com merge entre o app e o servidor (onde o MCP também grava). Cada registro tem uma
// chave natural e um carimbo de tempo; a gravação mais recente vence. Remoções viram lápides
// (`treino:removidos`) que só derrubam registros mais antigos que elas.
//
// `entrada` é quem está chegando (o app no /api/sync, o MCP numa escrita, o servidor quando
// o app aplica a resposta) e vence empates. Chaves sem carimbo (data de início, escolhas do
// dia, calibração, versão, arquivo) só o app edita: valem as da entrada quando presentes.

export interface Removido {
  chave: string;
  removidoEm: string; // ISO
}

const DIAS_LAPIDE = 90;

export const chaveSerie = (s: Pick<SerieRegistrada, "exercicioId" | "data" | "serieNumero">) =>
  `serie:${s.exercicioId}|${s.data}|${s.serieNumero}`;
export const chaveSessao = (r: Pick<RegistroSessao, "data" | "sessaoTipo">) => `sessao:${r.data}|${r.sessaoTipo}`;
export const chaveBike = (data: string) => `bike:${data}`;

const carimboSessao = (r: RegistroSessao) => r.atualizadoEm ?? r.fimISO ?? r.inicioISO;

export function registrarRemocao(lista: Removido[], chave: string, quando: string): Removido[] {
  return [...lista.filter((r) => r.chave !== chave), { chave, removidoEm: quando }];
}

function analisar<T>(bruto: string | undefined, padrao: T): T {
  if (!bruto) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

// União por chave: a entrada vem primeiro (preserva a ordem dela), a base completa o resto.
function unir<T>(entrada: T[], base: T[], chave: (x: T) => string, carimbo: (x: T) => string): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const x of entrada) mapa.set(chave(x), x);
  for (const x of base) {
    const k = chave(x);
    const atual = mapa.get(k);
    if (!atual || carimbo(x) > carimbo(atual)) mapa.set(k, x);
  }
  return mapa;
}

function semRemovidos<T>(mapa: Map<string, T>, carimbo: (x: T) => string, lapides: Map<string, string>): T[] {
  return Array.from(mapa.entries())
    .filter(([k, x]) => {
      const removidoEm = lapides.get(k);
      return !removidoEm || carimbo(x) > removidoEm;
    })
    .map(([, x]) => x);
}

export function mesclar(base: Record<string, string>, entrada: Record<string, string>, agora = new Date()): Record<string, string> {
  const resultado: Record<string, string> = { ...base, ...entrada };

  const limite = new Date(agora.getTime() - DIAS_LAPIDE * 86_400_000).toISOString();
  const removidos = Array.from(
    unir(
      analisar<Removido[]>(entrada[KEY_REMOVIDOS], []),
      analisar<Removido[]>(base[KEY_REMOVIDOS], []),
      (r) => r.chave,
      (r) => r.removidoEm,
    ).values(),
  ).filter((r) => r.removidoEm >= limite);
  const lapides = new Map(removidos.map((r) => [r.chave, r.removidoEm]));

  const log = semRemovidos(
    unir(analisar<SerieRegistrada[]>(entrada[KEY_LOG], []), analisar<SerieRegistrada[]>(base[KEY_LOG], []), chaveSerie, (s) => s.registradoEm),
    (s) => s.registradoEm,
    lapides,
  );

  const sessoesEntrada = Object.values(analisar<Record<string, RegistroSessao[]>>(entrada[KEY_SESSOES], {})).flat();
  const sessoesBase = Object.values(analisar<Record<string, RegistroSessao[]>>(base[KEY_SESSOES], {})).flat();
  const sessoes: Record<string, RegistroSessao[]> = {};
  for (const r of semRemovidos(unir(sessoesEntrada, sessoesBase, chaveSessao, carimboSessao), carimboSessao, lapides)) {
    (sessoes[r.data] ??= []).push(r);
  }

  const bikeEntrada = Object.values(analisar<Record<string, RegistroBikeIndoor>>(entrada[KEY_BIKE], {}));
  const bikeBase = Object.values(analisar<Record<string, RegistroBikeIndoor>>(base[KEY_BIKE], {}));
  const bike: Record<string, RegistroBikeIndoor> = {};
  for (const b of semRemovidos(unir(bikeEntrada, bikeBase, (b) => chaveBike(b.data), (b) => b.registradoEm), (b) => b.registradoEm, lapides)) {
    bike[b.data] = b;
  }

  // Só escreve a chave se algum dos lados a tinha: não cria "[]" onde não havia nada.
  const algum = (k: string) => k in base || k in entrada;
  if (algum(KEY_LOG)) resultado[KEY_LOG] = JSON.stringify(log);
  if (algum(KEY_SESSOES)) resultado[KEY_SESSOES] = JSON.stringify(sessoes);
  if (algum(KEY_BIKE)) resultado[KEY_BIKE] = JSON.stringify(bike);
  if (algum(KEY_REMOVIDOS)) resultado[KEY_REMOVIDOS] = JSON.stringify(removidos);
  return resultado;
}

// Chaves cujo conteúdo mudou de `antes` para `depois` (para o app saber se precisa recarregar).
export function chavesAlteradas(antes: Record<string, string>, depois: Record<string, string>): string[] {
  return Object.keys(depois).filter((k) => antes[k] !== depois[k]);
}
