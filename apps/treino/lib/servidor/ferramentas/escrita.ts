import { KEY_BIKE, KEY_LOG, KEY_REMOVIDOS, KEY_SESSOES } from "@/lib/dados";
import { getSessaoCompleta, SESSOES, SLOTS } from "@/lib/exercicios";
import { chaveBike, chaveSerie, registrarRemocao } from "@/lib/merge";
import type { RegistroBikeIndoor, RegistroSessao, SerieRegistrada, SessaoTreino } from "@/lib/tipos";
import {
  dataArg,
  mesoAtual,
  numArg,
  removidosDe,
  resolverExercicio,
  sessaoArg,
  sessaoDoDia,
  type Contexto,
  type FerramentaEscrita,
} from "./comum";

// Escritas do MCP. Cada uma devolve as chaves alteradas; a rota mescla no backup e o app
// recebe no próximo sync (ao abrir ou voltar para a aba). Os registros levam o carimbo de
// agora, então vencem cópias antigas que o celular ainda tenha.

function instanteArg(args: Record<string, unknown>, nome: string): string | null {
  const v = args[nome];
  if (v === undefined || v === null || v === "") return null;
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) throw new Error(`"${nome}" deve ser data e hora ISO 8601 (ex.: 2026-10-17T07:30:00-03:00).`);
  return new Date(t).toISOString();
}

function numeroOuNulo(v: unknown, nome: string, min: number, max: number, inteiro: boolean): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (inteiro && !Number.isInteger(v))) {
    throw new Error(`"${nome}" deve ser ${inteiro ? "inteiro" : "número"} entre ${min} e ${max}.`);
  }
  return v;
}

function sessoesDoExercicio(id: string, meso: number): SessaoTreino[] {
  return SESSOES.filter((s) => getSessaoCompleta(s, meso).some((e) => e.id === id));
}

// Sessão em que a série entra: a pedida; senão a do dia, se o exercício estiver nela; senão a
// do meso atual que tem o exercício.
function sessaoDaSerie(ctx: Contexto, id: string, data: string, pedida: SessaoTreino | null): SessaoTreino {
  const meso = mesoAtual(ctx, data, null);
  const noMeso = sessoesDoExercicio(id, meso);
  const emAlgum = SLOTS.filter((s) => s.meso1.id === id || s.meso2.id === id).map((s) => s.sessao);
  if (pedida) {
    if (!emAlgum.includes(pedida)) throw new Error(`O exercício ${id} não faz parte da sessão ${pedida}.`);
    return pedida;
  }
  const doDia = sessaoDoDia(ctx, data).sessao;
  if (doDia && noMeso.includes(doDia)) return doDia;
  const opcoes = noMeso.length > 0 ? noMeso : Array.from(new Set(emAlgum));
  if (opcoes.length === 1) return opcoes[0];
  throw new Error(`O exercício ${id} aparece nas sessões ${opcoes.join(", ")}: informe "sessao".`);
}

function comSessao(sessoes: Record<string, RegistroSessao[]>, registro: RegistroSessao): Record<string, RegistroSessao[]> {
  const lista = (sessoes[registro.data] ?? []).filter((r) => r.sessaoTipo !== registro.sessaoTipo);
  return { ...sessoes, [registro.data]: [...lista, registro] };
}

const SEM_MUDANCA: Record<string, string> = {};

const sessaoSchema = { type: "string", enum: SESSOES, description: "Sessão A–E. Padrão: a do dia (ou a que contém o exercício)." };

export const ESCRITA: FerramentaEscrita[] = [
  {
    tipo: "escrita",
    name: "registrar_series",
    destrutiva: false,
    idempotente: true,
    description:
      "Registra uma ou mais séries de um exercício (como confirmar no app). Sem 'serieNumero', numera em sequência após as já feitas no dia; com ele, substitui a série. Carga null = peso corporal. Se for hoje e a sessão ainda não foi iniciada, inicia o timer. O app recebe ao abrir/voltar para a aba.",
    inputSchema: {
      type: "object",
      properties: {
        exercicio: { type: "string", description: "Id do exercício (ver listar_exercicios/plano_do_dia) ou trecho do nome." },
        series: {
          type: "array",
          minItems: 1,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              cargaKg: { type: ["number", "null"], minimum: 0, maximum: 1000, description: "kg; no Graviton, a assistência." },
              reps: { type: "integer", minimum: 0, maximum: 200, description: "Reps (ou segundos, em exercícios por tempo)." },
              rir: { type: ["integer", "null"], minimum: 0, maximum: 10, description: "Reps na reserva (o app pede só na última)." },
              obs: { type: "string", maxLength: 500 },
              serieNumero: { type: "integer", minimum: 1, maximum: 20 },
            },
            required: ["reps"],
            additionalProperties: false,
          },
        },
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
        sessao: sessaoSchema,
      },
      required: ["exercicio", "series"],
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      if (data > ctx.hoje) throw new Error("Não dá para registrar séries no futuro.");
      const { id, nome } = resolverExercicio(args.exercicio);
      const sessao = sessaoDaSerie(ctx, id, data, sessaoArg(args));
      if (!Array.isArray(args.series) || args.series.length === 0) throw new Error('"series" deve ter ao menos uma série.');

      const agora = new Date().toISOString();
      let log = [...ctx.dados.log];
      const doDia = () => log.filter((s) => s.exercicioId === id && s.data === data);
      const numeros: number[] = [];
      for (const [i, bruta] of (args.series as Record<string, unknown>[]).entries()) {
        if (typeof bruta !== "object" || bruta === null) throw new Error(`series[${i}] inválida.`);
        const reps = numeroOuNulo(bruta.reps, `series[${i}].reps`, 0, 200, true);
        if (reps === null) throw new Error(`series[${i}].reps é obrigatório.`);
        const n =
          numeroOuNulo(bruta.serieNumero, `series[${i}].serieNumero`, 1, 20, true) ??
          Math.max(0, ...doDia().map((s) => s.serieNumero)) + 1;
        const anterior = doDia().find((s) => s.serieNumero === n);
        const serie: SerieRegistrada = {
          exercicioId: id,
          sessao,
          data,
          serieNumero: n,
          cargaKg: numeroOuNulo(bruta.cargaKg, `series[${i}].cargaKg`, 0, 1000, false),
          reps,
          rir: bruta.rir !== undefined ? numeroOuNulo(bruta.rir, `series[${i}].rir`, 0, 10, true) : (anterior?.rir ?? null),
          registradoEm: agora,
        };
        const obs = typeof bruta.obs === "string" ? bruta.obs.trim().slice(0, 500) : anterior?.observacoes;
        if (obs) serie.observacoes = obs;
        log = [...log.filter((s) => s !== anterior), serie];
        numeros.push(n);
      }

      const entrada: Record<string, string> = { [KEY_LOG]: JSON.stringify(log) };
      let iniciou = false;
      if (data === ctx.hoje && !(ctx.dados.sessoes[data] ?? []).some((r) => r.sessaoTipo === sessao)) {
        const registro: RegistroSessao = { data, sessaoTipo: sessao, inicioISO: agora, fimISO: null, atualizadoEm: agora };
        entrada[KEY_SESSOES] = JSON.stringify(comSessao(ctx.dados.sessoes, registro));
        iniciou = true;
      }
      return {
        entrada,
        data,
        mensagem: `${numeros.length} série(s) de ${nome} registrada(s) (nº ${numeros.join(", ")}) na sessão ${sessao}${iniciou ? "; sessão iniciada" : ""}.`,
      };
    },
  },
  {
    tipo: "escrita",
    name: "remover_serie",
    destrutiva: true,
    idempotente: true,
    description: "Apaga uma série registrada (por exercício, data e número da série). A remoção também vale no app depois do sync.",
    inputSchema: {
      type: "object",
      properties: {
        exercicio: { type: "string", description: "Id do exercício ou trecho do nome." },
        serieNumero: { type: "integer", minimum: 1, maximum: 20 },
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
      },
      required: ["exercicio", "serieNumero"],
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      const { id, nome } = resolverExercicio(args.exercicio, {
        incluirArquivados: true,
        preferir: ctx.dados.log.filter((s) => s.data === data).map((s) => s.exercicioId),
      });
      const serieNumero = numArg(args, "serieNumero", 0, 1, 20);
      const alvo = { exercicioId: id, data, serieNumero };
      const existe = ctx.dados.log.some((s) => chaveSerie(s) === chaveSerie(alvo));
      if (!existe) throw new Error(`Não há série ${serieNumero} de ${nome} em ${data}.`);
      const log = ctx.dados.log.filter((s) => chaveSerie(s) !== chaveSerie(alvo));
      return {
        entrada: {
          [KEY_LOG]: JSON.stringify(log),
          [KEY_REMOVIDOS]: JSON.stringify(registrarRemocao(removidosDe(ctx), chaveSerie(alvo), new Date().toISOString())),
        },
        data,
        mensagem: `Série ${serieNumero} de ${nome} em ${data} removida.`,
      };
    },
  },
  {
    tipo: "escrita",
    name: "iniciar_sessao",
    destrutiva: false,
    idempotente: true,
    description:
      "Inicia o timer de uma sessão (A–E) num dia. Se já estiver aberta, não faz nada. 'inicio' permite registrar a hora real em que começou.",
    inputSchema: {
      type: "object",
      properties: {
        sessao: { ...sessaoSchema, description: "Sessão A–E. Padrão: a do dia." },
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
        inicio: { type: "string", description: "Data e hora ISO 8601 do início. Padrão: agora." },
      },
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      const sessao = sessaoArg(args) ?? sessaoDoDia(ctx, data).sessao;
      if (!sessao) throw new Error('Dia marcado como descanso no app: informe "sessao".');
      const atual = (ctx.dados.sessoes[data] ?? []).find((r) => r.sessaoTipo === sessao);
      if (atual?.fimISO) throw new Error(`A sessão ${sessao} de ${data} já foi concluída.`);
      if (atual) return { entrada: SEM_MUDANCA, data, mensagem: `A sessão ${sessao} de ${data} já estava em andamento.` };
      const agora = new Date().toISOString();
      const registro: RegistroSessao = { data, sessaoTipo: sessao, inicioISO: instanteArg(args, "inicio") ?? agora, fimISO: null, atualizadoEm: agora };
      return {
        entrada: { [KEY_SESSOES]: JSON.stringify(comSessao(ctx.dados.sessoes, registro)) },
        data,
        mensagem: `Sessão ${sessao} iniciada em ${data}.`,
      };
    },
  },
  {
    tipo: "escrita",
    name: "terminar_sessao",
    destrutiva: false,
    idempotente: true,
    description:
      "Conclui uma sessão (conta para a fila A→E, a rodada e a aderência). Se nunca foi iniciada mas tem séries no dia, cria a sessão desde a primeira série. 'fim' permite registrar a hora real.",
    inputSchema: {
      type: "object",
      properties: {
        sessao: { ...sessaoSchema, description: "Sessão A–E. Padrão: a do dia." },
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
        fim: { type: "string", description: "Data e hora ISO 8601 do fim. Padrão: agora." },
      },
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      const sessao = sessaoArg(args) ?? sessaoDoDia(ctx, data).sessao;
      if (!sessao) throw new Error('Dia marcado como descanso no app: informe "sessao".');
      const agora = new Date().toISOString();
      const fim = instanteArg(args, "fim") ?? agora;
      const atual = (ctx.dados.sessoes[data] ?? []).find((r) => r.sessaoTipo === sessao);
      if (atual?.fimISO && !args.fim) return { entrada: SEM_MUDANCA, data, mensagem: `A sessão ${sessao} de ${data} já estava concluída.` };
      let inicio = atual?.inicioISO;
      if (!inicio) {
        const series = ctx.dados.log.filter((s) => s.data === data && s.sessao === sessao).map((s) => s.registradoEm).sort();
        if (series.length === 0) throw new Error(`A sessão ${sessao} de ${data} não foi iniciada e não tem séries.`);
        inicio = series[0];
      }
      if (fim < inicio) throw new Error('"fim" é anterior ao início da sessão.');
      const registro: RegistroSessao = { data, sessaoTipo: sessao, inicioISO: inicio, fimISO: fim, atualizadoEm: agora };
      return {
        entrada: { [KEY_SESSOES]: JSON.stringify(comSessao(ctx.dados.sessoes, registro)) },
        data,
        mensagem: `Sessão ${sessao} de ${data} concluída.`,
      };
    },
  },
  {
    tipo: "escrita",
    name: "registrar_bike",
    destrutiva: false,
    idempotente: true,
    description: "Registra (ou corrige) a bike indoor de um dia, em minutos. 'minutos: 0' apaga o registro do dia.",
    inputSchema: {
      type: "object",
      properties: {
        minutos: { type: "integer", minimum: 0, maximum: 600 },
        concluido: { type: "boolean", description: "Padrão: true." },
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
      },
      required: ["minutos"],
      additionalProperties: false,
    },
    escrever(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      if (data > ctx.hoje) throw new Error("Não dá para registrar bike no futuro.");
      const minutos = numArg(args, "minutos", 0, 0, 600);
      const agora = new Date().toISOString();
      if (minutos === 0) {
        if (!ctx.dados.bike[data]) return { entrada: SEM_MUDANCA, data, mensagem: `Não havia bike em ${data}.` };
        const { [data]: _removida, ...resto } = ctx.dados.bike;
        return {
          entrada: {
            [KEY_BIKE]: JSON.stringify(resto),
            [KEY_REMOVIDOS]: JSON.stringify(registrarRemocao(removidosDe(ctx), chaveBike(data), agora)),
          },
          data,
          mensagem: `Bike de ${data} apagada.`,
        };
      }
      const registro: RegistroBikeIndoor = { data, tempoMinutos: minutos, concluido: args.concluido !== false, registradoEm: agora };
      return {
        entrada: { [KEY_BIKE]: JSON.stringify({ ...ctx.dados.bike, [data]: registro }) },
        data,
        mensagem: `Bike de ${data}: ${minutos} min.`,
      };
    },
  },
];
