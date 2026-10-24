import { KEY_ORIGEM, erroMedioCalibracaoEm, sessoesConcluidasEm, ultimaExecucaoEm, diasTreinadosUnicosEm } from "@/lib/dados";
import { alvoDeEsforco, statusDescansoPorSessao } from "@/lib/descanso";
import { EXERCICIOS_ASSISTIDOS, getSessaoCompleta, GRUPOS_INFERIORES, partidaKg, SESSAO_LABEL, SESSOES } from "@/lib/exercicios";
import { calcularStreak, labelRodada } from "@/lib/motivacao";
import { getStatusAderencia, getStatusPrograma, proximaDaFila, seriesDaRodada } from "@/lib/program";
import { avaliarProntidao, deslocarRir, type Prontidao } from "@/lib/prontidao";
import { sugerirProximaCarga } from "@/lib/progressao";
import {
  calcularFrequenciaPorGrupo,
  calcularFrequenciaPorSessao,
  calcularVolumePorGrupo,
  evolucaoRecente,
  GRUPOS_SEM_META,
  historicoExercicio,
  META_SERIES_SEMANA,
  recordesPessoais,
  resumoExercicios,
  semanasNoPeriodo,
} from "@/lib/relatorio";
import type { SerieRegistrada } from "@/lib/tipos";
import { lerGarmin } from "../garmin";
import { blocoCorpo } from "./corpo";
import { blocoPostura } from "./postura";
import {
  dataArg,
  dataLocal,
  estadoDoDia,
  exigirDataInicio,
  nomeExercicio,
  numArg,
  r1,
  resolverExercicio,
  resumirSerie,
  sessaoArg,
  sessaoDoDia,
  somaDias,
  type Contexto,
  type FerramentaLeitura,
} from "./comum";

// Prontidão só vale para hoje: o dado de outro dia não diz nada sobre o treino de amanhã. Falha ao
// ler o Garmin não pode derrubar o plano.
async function prontidaoDoDia(data: string, hoje: string, deload: boolean): Promise<Prontidao | null> {
  if (data !== hoje) return null;
  try {
    const dados = await lerGarmin();
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const dias = (dados?.diario ?? []).map((l) => ({
      data: String(l.data),
      sonoHoras: num(l.sono_minutos) === null ? null : Math.round((num(l.sono_minutos)! / 60) * 10) / 10,
      sonoScore: num(l.sono_score),
      bodyBatteryAcordar: num(l.body_battery_acordar),
    }));
    return avaliarProntidao(dias, hoje, deload);
  } catch (e) {
    console.error("[plano_do_dia] Garmin indisponível:", e);
    return avaliarProntidao([], hoje, deload);
  }
}

const semArgs = { type: "object", properties: {}, additionalProperties: false };

function periodoArg(args: Record<string, unknown>, padrao: number): number | "tudo" {
  if (args.dias === "tudo") return "tudo";
  return numArg(args, "dias", padrao, 1, 365);
}

const preenchida = (s: SerieRegistrada) => s.cargaKg !== null || s.reps !== null;

// Volume por grupo (com secundários, igual ao relatório do app) numa janela que termina em `fim`.
function volumeComMeta(ctx: Contexto, periodo: number | "tudo", fim: string) {
  const log = ctx.dados.log.filter((s) => s.data <= fim);
  const volumes = calcularVolumePorGrupo(periodo, dataLocal(fim), log);
  const semanas = semanasNoPeriodo(periodo, dataLocal(fim), log);
  return {
    semanas: r1(semanas),
    meta: { ...META_SERIES_SEMANA, gruposSemMeta: GRUPOS_SEM_META },
    grupos: volumes.map((v) => {
      const porSemana = v.seriesFeitas / semanas;
      const semMeta = GRUPOS_SEM_META.includes(v.grupo);
      return {
        grupo: v.grupo,
        seriesDiretas: v.seriesDiretas,
        seriesIndiretas: r1(v.seriesIndiretas),
        seriesEfetivas: r1(v.seriesFeitas),
        seriesPorSemana: r1(porSemana),
        situacao: semMeta
          ? "sem_meta"
          : porSemana < META_SERIES_SEMANA.min
            ? "abaixo"
            : porSemana > META_SERIES_SEMANA.max
              ? "acima"
              : "dentro",
      };
    }),
    totalSeries: volumes.reduce((t, v) => t + v.seriesDiretas, 0),
  };
}

function resumoJanela(ctx: Contexto, inicio: string, fim: string) {
  const { log, sessoes, bike } = ctx.dados;
  const noPeriodo = log.filter((s) => s.data >= inicio && s.data <= fim && preenchida(s));
  const diasTreinados = new Set(noPeriodo.map((s) => s.data));
  const porTipo: Record<string, number> = {};
  const duracoes: number[] = [];
  for (const [data, lista] of Object.entries(sessoes)) {
    if (data < inicio || data > fim) continue;
    for (const r of lista) {
      if (!r.fimISO) continue;
      diasTreinados.add(data);
      porTipo[r.sessaoTipo] = (porTipo[r.sessaoTipo] ?? 0) + 1;
      duracoes.push((new Date(r.fimISO).getTime() - new Date(r.inicioISO).getTime()) / 60000);
    }
  }
  return {
    periodo: { inicio, fim },
    diasTreinados: diasTreinados.size,
    datasTreinadas: Array.from(diasTreinados).sort(),
    sessoesConcluidasPorTipo: porTipo,
    duracaoMediaMin: duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : null,
    totalSeries: noPeriodo.length,
    volumeTotalKg: Math.round(noPeriodo.reduce((t, s) => t + (s.cargaKg ?? 0) * (s.reps ?? 0), 0)),
    bikeIndoorMinutos: Object.entries(bike)
      .filter(([d, b]) => d >= inicio && d <= fim && b.concluido)
      .reduce((t, [, b]) => t + b.tempoMinutos, 0),
  };
}

// Recordes (1RM estimado ou carga máxima) batidos dentro da janela, contra tudo que veio antes.
function recordesNaJanela(ctx: Contexto, inicio: string, fim: string) {
  const log = ctx.dados.log.filter((s) => s.data <= fim);
  const ids = new Set(log.filter((s) => s.data >= inicio).map((s) => s.exercicioId));
  const prs = [];
  for (const id of ids) {
    if (EXERCICIOS_ASSISTIDOS.has(id)) continue; // assistência: menos é melhor, não é recorde
    const antes = recordesPessoais(id, inicio, log);
    const tudo = recordesPessoais(id, undefined, log);
    if (!antes.melhor1RM) continue; // primeira vez não é recorde
    const bateu1RM = tudo.melhor1RM && tudo.melhor1RM.kg > antes.melhor1RM.kg + 1e-9 && tudo.melhor1RM.data >= inicio;
    const bateuCarga = tudo.cargaMax && antes.cargaMax && tudo.cargaMax.kg > antes.cargaMax.kg && tudo.cargaMax.data >= inicio;
    if (!bateu1RM && !bateuCarga) continue;
    prs.push({
      exercicioId: id,
      nome: nomeExercicio(id),
      melhor1RM: bateu1RM ? { antesKg: r1(antes.melhor1RM.kg), agoraKg: r1(tudo.melhor1RM!.kg), data: tudo.melhor1RM!.data } : undefined,
      cargaMax: bateuCarga ? { antesKg: antes.cargaMax!.kg, agoraKg: tudo.cargaMax!.kg, data: tudo.cargaMax!.data } : undefined,
    });
  }
  return prs;
}

function statusPrograma(ctx: Contexto) {
  const inicio = exigirDataInicio(ctx);
  const { sessao, sugerida, escolhida } = sessaoDoDia(ctx, ctx.hoje);
  const status = getStatusPrograma(inicio, ctx.hoje, sessao, ctx.dados);
  const aderencia = getStatusAderencia(inicio, ctx.hoje, ctx.dados);
  const concluidas = sessoesConcluidasEm(ctx.dados, inicio);
  return {
    hoje: ctx.hoje,
    inicioDoPrograma: inicio,
    sessaoDeHoje: sessao,
    sessaoDeHojeEscolhidaNoApp: escolhida,
    sessaoSugerida: sugerida,
    proximaDepoisDeHoje: sessao ? proximaDaFila(sessao) : sugerida,
    meso: status.meso,
    rodada: status.rodada,
    deload: status.isDeload,
    rotulo: labelRodada(status),
    sessoesConcluidasNoPrograma: status.totalConcluidas,
    concluidasNaRodada: status.concluidasNaRodada,
    ultimasConcluidas: concluidas.slice(-5).map((c) => ({ data: c.data, sessao: c.tipo })),
    aderencia: {
      ...aderencia,
      explicacao:
        "Janela de 14 dias desde o início: meta 10 sessões; menos de 8 ao fechar a janela = cair para Upper/Lower 4x. EM_ANDAMENTO até a janela fechar.",
    },
    diasSeguidos: calcularStreak(ctx.hoje, diasTreinadosUnicosEm(ctx.dados)),
  };
}

export const LEITURA: FerramentaLeitura[] = [
  {
    tipo: "leitura",
    name: "treino_do_dia",
    description:
      "Treino REGISTRADO em um dia: sessões (tipo, início, fim, duração), exercícios com cada série (carga, reps, RIR) e bike indoor. Sem 'data', usa hoje (America/Belem). Para o treino PLANEJADO, use plano_do_dia.",
    inputSchema: {
      type: "object",
      properties: { data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." } },
      additionalProperties: false,
    },
    executar(args, ctx) {
      return estadoDoDia(ctx.dados, dataArg(args, "data") ?? ctx.hoje);
    },
  },
  {
    tipo: "leitura",
    name: "plano_do_dia",
    description:
      "Treino PLANEJADO para um dia, como o app mostra: sessão (escolhida no app ou próxima da fila A→E), cada exercício com séries (já reduzidas no deload), faixa de reps, descanso, notas, alvo de RIR, carga sugerida pela dupla progressão e o que já foi feito no dia; e a recuperação dos grupos (48 h). Para hoje, inclui 'prontidaoGarmin' (sono e Body Battery do relógio): quando o nível for 'atencao' ou 'baixa', cada exercício traz 'ajusteHoje' (séries ajustadas, alvo de RIR +1, sem subir carga, sem teste de falha) e você deve apresentar esse ajuste ao usuário; 'sem_dados' significa treino como planejado. As cargas sugeridas não são alteradas. Use antes de orientar o treino ou registrar séries.",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." },
        sessao: { type: "string", enum: SESSOES, description: "Força uma sessão (A–E) em vez da do dia." },
      },
      additionalProperties: false,
    },
    async executar(args, ctx) {
      const data = dataArg(args, "data") ?? ctx.hoje;
      const inicio = exigirDataInicio(ctx);
      const doDia = sessaoDoDia(ctx, data);
      const sessao = sessaoArg(args) ?? doDia.sessao;
      if (!sessao) {
        return { data, descanso: true, mensagem: "Dia de descanso escolhido no app.", sessaoSugerida: doDia.sugerida };
      }
      const status = getStatusPrograma(inicio, data, sessao, ctx.dados);
      const log = ctx.dados.log;
      const prontidao = await prontidaoDoDia(data, ctx.hoje, status.isDeload);
      const ajuste = prontidao?.ajuste ?? null;
      return {
        data,
        sessao,
        titulo: SESSAO_LABEL[sessao],
        prontidaoGarmin: prontidao,
        escolhidaNoApp: doDia.escolhida && !sessaoArg(args),
        programa: { meso: status.meso, rodada: status.rodada, deload: status.isDeload, rotulo: labelRodada(status) },
        recuperacao: statusDescansoPorSessao(sessao, data, log),
        exercicios: getSessaoCompleta(sessao, status.meso).map((ex) => {
          const ultima = ultimaExecucaoEm(log, ex.id, data);
          const anterior = ultima.length > 0 ? ultimaExecucaoEm(log, ex.id, ultima[0].data) : [];
          const assistencia = EXERCICIOS_ASSISTIDOS.has(ex.id);
          const sugestao = sugerirProximaCarga(
            ex.reps,
            ultima,
            anterior,
            { inferior: GRUPOS_INFERIORES.has(ex.grupoMuscular), assistencia },
            status.isDeload,
          );
          const feitasHoje = log.filter((s) => s.exercicioId === ex.id && s.data === data).sort((a, b) => a.serieNumero - b.serieNumero);
          return {
            id: ex.id,
            ordem: ex.ordem,
            nome: ex.nome,
            grupo: ex.grupoMuscular,
            series: seriesDaRodada(ex.series, status.isDeload),
            ajusteHoje: ajuste
              ? {
                  series: Math.max(Math.min(2, seriesDaRodada(ex.series, status.isDeload)), seriesDaRodada(ex.series, status.isDeload) - ajuste.reduzirSeries),
                  rirAlvo: deslocarRir(alvoDeEsforco(ex, status).rirAlvo, ajuste.rirExtra),
                  naoProgredirCarga: true,
                  semTesteDeFalha: true,
                }
              : undefined,
            reps: ex.reps,
            descanso: ex.descanso,
            composto: ex.composto,
            biset: ex.bisetCom !== undefined ? `com o exercício ${ex.bisetCom}` : undefined,
            assistido: assistencia || undefined,
            notas: ex.notas || undefined,
            alvo: alvoDeEsforco(ex, status),
            partidaKg: ultima.length === 0 ? (partidaKg(ex.partida) ?? ex.partida) : undefined,
            ultimaVez: ultima.length ? { data: ultima[0].data, series: ultima.map(resumirSerie) } : null,
            sugestao,
            recorde1RMKg: (() => {
              const r = recordesPessoais(ex.id, data, log).melhor1RM;
              return r ? r1(r.kg) : null;
            })(),
            feitasHoje: feitasHoje.map(resumirSerie),
          };
        }),
      };
    },
  },
  {
    tipo: "leitura",
    name: "status_programa",
    description:
      "Onde o programa está: meso, rodada (5 = deload), sessões concluídas, sessão de hoje e próxima da fila, aderência da janela de 14 dias (decisão MANTER_5X ou CAIR_UPPER_LOWER) e dias seguidos treinando.",
    inputSchema: semArgs,
    executar(_args, ctx) {
      return statusPrograma(ctx);
    },
  },
  {
    tipo: "leitura",
    name: "historico_exercicio",
    description:
      "Evolução de um exercício: por data, as séries, a carga máxima e o melhor 1RM estimado (Epley), mais os recordes. Aceita o id ou parte do nome (ex.: 'supino').",
    inputSchema: {
      type: "object",
      properties: {
        exercicio: { type: "string", description: "Id do exercício ou trecho do nome." },
        limite: { type: "integer", minimum: 1, maximum: 60, description: "Quantas datas mais recentes. Padrão 8." },
      },
      required: ["exercicio"],
      additionalProperties: false,
    },
    executar(args, ctx) {
      const limite = numArg(args, "limite", 8, 1, 60);
      const log = ctx.dados.log;
      const { id, nome } = resolverExercicio(args.exercicio, {
        incluirArquivados: true,
        preferir: Array.from(new Set(log.map((s) => s.exercicioId))),
      });
      // Exercícios de peso corporal não têm carga: entram pelas reps, sem 1RM.
      const porData = new Map(historicoExercicio(id, log).map((p) => [p.data, p]));
      const datas = Array.from(new Set(log.filter((s) => s.exercicioId === id && s.reps !== null).map((s) => s.data)))
        .sort()
        .slice(-limite);
      const recordes = recordesPessoais(id, undefined, log);
      return {
        exercicio: { id, nome },
        recordes: {
          cargaMax: recordes.cargaMax,
          melhor1RM: recordes.melhor1RM ? { ...recordes.melhor1RM, kg: r1(recordes.melhor1RM.kg) } : null,
        },
        datas: datas.map((data) => {
          const p = porData.get(data);
          return {
            data,
            series: log
              .filter((s) => s.exercicioId === id && s.data === data)
              .sort((a, b) => a.serieNumero - b.serieNumero)
              .map(resumirSerie),
            cargaMaxKg: p?.cargaMaxKg ?? null,
            melhor1RMEstimadoKg: p ? r1(p.melhor1RM) : null,
            volumeKg: p ? Math.round(p.volumeKg) : 0,
          };
        }),
      };
    },
  },
  {
    tipo: "leitura",
    name: "resumo_periodo",
    description:
      "Resumo dos últimos N dias: dias treinados, sessões por tipo, duração média, total de séries, volume (carga × reps), bike e séries por grupo muscular contando os secundários (mesmo cálculo do relatório do app; supino conta meia série para tríceps).",
    inputSchema: {
      type: "object",
      properties: {
        dias: { type: "integer", minimum: 1, maximum: 365, description: "Janela em dias. Padrão 7." },
        ate: { type: "string", description: "Último dia da janela, YYYY-MM-DD. Padrão: hoje." },
      },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const dias = numArg(args, "dias", 7, 1, 365);
      const fim = dataArg(args, "ate") ?? ctx.hoje;
      const inicio = somaDias(fim, -(dias - 1));
      const { grupos } = volumeComMeta(ctx, dias, fim);
      return {
        ...resumoJanela(ctx, inicio, fim),
        dias,
        seriesPorGrupo: Object.fromEntries(grupos.filter((g) => g.seriesEfetivas > 0).map((g) => [g.grupo, g.seriesEfetivas])),
      };
    },
  },
  {
    tipo: "leitura",
    name: "relatorio_volume",
    description:
      "Volume por grupo muscular (séries diretas, indiretas pelos secundários e por semana) comparado à meta de 10–20 séries/semana, mais a frequência por sessão (A–E) e por grupo. Mesmos números do relatório do app.",
    inputSchema: {
      type: "object",
      properties: {
        dias: {
          oneOf: [{ type: "integer", minimum: 1, maximum: 365 }, { type: "string", enum: ["tudo"] }],
          description: "Janela em dias ou 'tudo'. Padrão 7.",
        },
      },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const periodo = periodoArg(args, 7);
      const hoje = dataLocal(ctx.hoje);
      return {
        periodo,
        ...volumeComMeta(ctx, periodo, ctx.hoje),
        frequenciaPorSessao: calcularFrequenciaPorSessao(periodo, hoje, ctx.dados.sessoes),
        frequenciaPorGrupo: calcularFrequenciaPorGrupo(periodo, hoje, ctx.dados.log),
      };
    },
  },
  {
    tipo: "leitura",
    name: "progresso",
    description:
      "Progresso de força: todos os exercícios com histórico (sessões, recorde de 1RM, variação % do primeiro ao último 1RM), a evolução recente (último 1RM vs o anterior) e a calibração do RIR (erro médio real − palpite; > 2 = parando cedo demais).",
    inputSchema: {
      type: "object",
      properties: { limite: { type: "integer", minimum: 1, maximum: 50, description: "Itens da evolução recente. Padrão 10." } },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const log = ctx.dados.log;
      return {
        exercicios: resumoExercicios(log).map((r) => ({
          ...r,
          recorde1RM: r1(r.recorde1RM),
          variacao1RM: r.variacao1RM === null ? null : r1(r.variacao1RM),
        })),
        evolucaoRecente: evolucaoRecente(numArg(args, "limite", 10, 1, 50), log).map((e) => ({
          ...e,
          anterior1RM: r1(e.anterior1RM),
          atual1RM: r1(e.atual1RM),
          variacaoPct: r1(e.variacaoPct),
        })),
        calibracaoRIR: erroMedioCalibracaoEm(ctx.dados),
      };
    },
  },
  {
    tipo: "leitura",
    name: "relatorio_semanal",
    description:
      "Relatório de uma semana (7 dias até 'ate') pronto para revisão: resumo, comparação com a semana anterior, volume por grupo vs meta, recordes batidos, evolução recente e status do programa/aderência. Bom para relatórios periódicos.",
    inputSchema: {
      type: "object",
      properties: { ate: { type: "string", description: "Último dia da semana, YYYY-MM-DD. Padrão: hoje." } },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const fim = dataArg(args, "ate") ?? ctx.hoje;
      const inicio = somaDias(fim, -6);
      const semana = resumoJanela(ctx, inicio, fim);
      const anterior = resumoJanela(ctx, somaDias(inicio, -7), somaDias(inicio, -1));
      const delta = (a: number, b: number) => a - b;
      return {
        semana,
        semanaAnterior: anterior,
        variacao: {
          diasTreinados: delta(semana.diasTreinados, anterior.diasTreinados),
          totalSeries: delta(semana.totalSeries, anterior.totalSeries),
          volumeTotalKg: delta(semana.volumeTotalKg, anterior.volumeTotalKg),
          bikeIndoorMinutos: delta(semana.bikeIndoorMinutos, anterior.bikeIndoorMinutos),
        },
        volume: volumeComMeta(ctx, 7, fim),
        recordes: recordesNaJanela(ctx, inicio, fim),
        evolucaoRecente: evolucaoRecente(8, ctx.dados.log.filter((s) => s.data <= fim)).map((e) => ({
          nome: e.nome,
          anterior1RM: r1(e.anterior1RM),
          atual1RM: r1(e.atual1RM),
          variacaoPct: r1(e.variacaoPct),
          ultimaData: e.ultimaData,
        })),
        programa: ctx.dados.dataInicio ? statusPrograma(ctx) : null,
        corpo: blocoCorpo(ctx),
        postura: blocoPostura(ctx),
      };
    },
  },
  {
    tipo: "leitura",
    name: "listar_exercicios",
    description:
      "Exercícios do programa (sessões A–E) com id, nome, grupo, séries, reps e descanso, na variação do meso atual. Use os ids nas ferramentas de registro.",
    inputSchema: {
      type: "object",
      properties: {
        sessao: { type: "string", enum: SESSOES, description: "Só uma sessão. Padrão: todas." },
        meso: { type: "integer", minimum: 1, maximum: 50, description: "Meso cuja variação mostrar. Padrão: o atual." },
      },
      additionalProperties: false,
    },
    executar(args, ctx) {
      const filtro = sessaoArg(args);
      const meso = args.meso === undefined ? getStatusPrograma(exigirDataInicio(ctx), ctx.hoje, null, ctx.dados).meso : numArg(args, "meso", 1, 1, 50);
      return {
        meso,
        sessoes: SESSOES.filter((s) => !filtro || s === filtro).map((s) => ({
          sessao: s,
          titulo: SESSAO_LABEL[s],
          exercicios: getSessaoCompleta(s, meso).map((ex) => ({
            id: ex.id,
            ordem: ex.ordem,
            nome: ex.nome,
            grupo: ex.grupoMuscular,
            series: ex.series,
            reps: ex.reps,
            descanso: ex.descanso,
            pesoCorporal: ex.pesoCorporal || undefined,
          })),
        })),
      };
    },
  },
  {
    tipo: "leitura",
    name: "status_sync",
    description:
      "Quando o backup do servidor foi gravado pela última vez e por quem (app ou MCP), e o que há nele. Use para saber se 'hoje' já foi sincronizado antes de concluir que o usuário não treinou.",
    inputSchema: semArgs,
    executar(_args, ctx) {
      const { log, sessoes } = ctx.dados;
      const datas = [...log.map((s) => s.data), ...Object.keys(sessoes)].sort();
      let ultimaGravacao: unknown = null;
      try {
        ultimaGravacao = JSON.parse(ctx.backup.dados[KEY_ORIGEM] ?? "null");
      } catch {
        // backup antigo, sem a marca de origem
      }
      return {
        ultimaSincronizacao: ctx.backup.atualizadoEm,
        ultimaGravacao,
        totalSeries: log.length,
        primeiroDiaRegistrado: datas[0] ?? null,
        ultimoDiaRegistrado: datas[datas.length - 1] ?? null,
        inicioDoPrograma: ctx.dados.dataInicio,
        hoje: ctx.hoje,
      };
    },
  },
];
