import { estimar1RM } from "../rm";
import type { RegistroBikeIndoor, RegistroSessao, SerieRegistrada } from "@/lib/tipos";
import { getExercicio } from "@/lib/exercicios";
import type { BackupGuardado } from "./backup";

// Ferramentas do MCP: leitura sobre o snapshot do app. Tudo somente leitura.

export interface Ferramenta {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  executar: (args: Record<string, unknown>, backup: BackupGuardado) => unknown;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function hojeBelem(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Belem" }).format(new Date());
}

function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function analisar<T>(backup: BackupGuardado, chave: string, padrao: T): T {
  const bruto = backup.dados[chave];
  if (!bruto) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

function dadosDe(backup: BackupGuardado) {
  return {
    log: analisar<SerieRegistrada[]>(backup, "treino:log", []),
    sessoes: analisar<Record<string, RegistroSessao[]>>(backup, "treino:sessoesPorDia", {}),
    bike: analisar<Record<string, RegistroBikeIndoor>>(backup, "treino:bikeIndoor", {}),
  };
}

function dataArg(args: Record<string, unknown>, nome: string): string | null {
  const v = args[nome];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !ISO.test(v)) throw new Error(`"${nome}" deve ser YYYY-MM-DD.`);
  return v;
}

function numArg(args: Record<string, unknown>, nome: string, padrao: number, min: number, max: number): number {
  const v = args[nome];
  if (v === undefined) return padrao;
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new Error(`"${nome}" deve ser inteiro entre ${min} e ${max}.`);
  }
  return v;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const epley = estimar1RM;

function resumirSerie(s: SerieRegistrada) {
  return { n: s.serieNumero, cargaKg: s.cargaKg, reps: s.reps, rir: s.rir ?? null, obs: s.observacoes || undefined };
}

function agruparPorExercicio(series: SerieRegistrada[]) {
  const mapa = new Map<string, SerieRegistrada[]>();
  for (const s of series) mapa.set(s.exercicioId, [...(mapa.get(s.exercicioId) ?? []), s]);
  return Array.from(mapa.entries()).map(([id, lista]) => {
    const info = getExercicio(id);
    const ordenadas = lista.sort((a, b) => a.serieNumero - b.serieNumero);
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

function duracaoMin(r: RegistroSessao): number | null {
  if (!r.fimISO) return null;
  return Math.round((new Date(r.fimISO).getTime() - new Date(r.inicioISO).getTime()) / 60000);
}

export const FERRAMENTAS: Ferramenta[] = [
  {
    name: "treino_do_dia",
    description:
      "Treino registrado em um dia: sessões (tipo, início, fim, duração), exercícios com cada série (carga, reps, RIR) e bike indoor. Sem 'data', usa hoje (America/Belem).",
    inputSchema: {
      type: "object",
      properties: { data: { type: "string", description: "YYYY-MM-DD. Padrão: hoje." } },
      additionalProperties: false,
    },
    executar(args, backup) {
      const data = dataArg(args, "data") ?? hojeBelem();
      const { log, sessoes, bike } = dadosDe(backup);
      const doDia = log.filter((s) => s.data === data);
      return {
        data,
        sessoes: (sessoes[data] ?? []).map((r) => ({
          tipo: r.sessaoTipo,
          inicio: r.inicioISO,
          fim: r.fimISO,
          duracaoMin: duracaoMin(r),
        })),
        exercicios: agruparPorExercicio(doDia),
        bikeIndoor: bike[data] ? { minutos: bike[data].tempoMinutos, concluido: bike[data].concluido } : null,
        temRegistro: doDia.length > 0 || (sessoes[data] ?? []).length > 0 || Boolean(bike[data]),
      };
    },
  },
  {
    name: "historico_exercicio",
    description:
      "Evolução de um exercício: por data, as séries e o melhor 1RM estimado (Epley). Aceita o id ou parte do nome (ex.: 'supino').",
    inputSchema: {
      type: "object",
      properties: {
        exercicio: { type: "string", description: "Id do exercício ou trecho do nome." },
        limite: { type: "integer", minimum: 1, maximum: 60, description: "Quantas datas mais recentes. Padrão 8." },
      },
      required: ["exercicio"],
      additionalProperties: false,
    },
    executar(args, backup) {
      const busca = typeof args.exercicio === "string" ? args.exercicio.trim().toLowerCase() : "";
      if (!busca) throw new Error('"exercicio" é obrigatório.');
      const limite = numArg(args, "limite", 8, 1, 60);
      const { log } = dadosDe(backup);
      const ids = Array.from(new Set(log.map((s) => s.exercicioId))).filter(
        (id) => id.toLowerCase() === busca || id.toLowerCase().includes(busca) || (getExercicio(id)?.nome ?? "").toLowerCase().includes(busca),
      );
      if (ids.length === 0) return { exercicio: busca, encontrados: [], datas: [] };
      const doExercicio = log.filter((s) => ids.includes(s.exercicioId) && s.reps !== null);
      const datas = Array.from(new Set(doExercicio.map((s) => s.data))).sort().slice(-limite);
      return {
        encontrados: ids.map((id) => ({ id, nome: getExercicio(id)?.nome ?? id })),
        datas: datas.map((data) => {
          const series = doExercicio.filter((s) => s.data === data).sort((a, b) => a.serieNumero - b.serieNumero);
          const melhor1RM = Math.max(...series.map((s) => epley(s.cargaKg ?? 0, s.reps ?? 0)));
          return { data, series: series.map(resumirSerie), melhor1RMEstimadoKg: r1(melhor1RM) };
        }),
      };
    },
  },
  {
    name: "resumo_periodo",
    description:
      "Resumo dos últimos N dias: dias treinados, sessões por tipo, séries por grupo muscular (só grupo primário) e volume total (carga × reps).",
    inputSchema: {
      type: "object",
      properties: {
        dias: { type: "integer", minimum: 1, maximum: 365, description: "Janela em dias. Padrão 7." },
        ate: { type: "string", description: "Último dia da janela, YYYY-MM-DD. Padrão: hoje." },
      },
      additionalProperties: false,
    },
    executar(args, backup) {
      const dias = numArg(args, "dias", 7, 1, 365);
      const fim = dataArg(args, "ate") ?? hojeBelem();
      const inicio = somaDias(fim, -(dias - 1));
      const { log, sessoes, bike } = dadosDe(backup);
      const noPeriodo = log.filter((s) => s.data >= inicio && s.data <= fim && (s.reps !== null || s.cargaKg !== null));

      const diasTreinados = new Set(noPeriodo.map((s) => s.data));
      const porTipo: Record<string, number> = {};
      for (const [data, lista] of Object.entries(sessoes)) {
        if (data < inicio || data > fim) continue;
        for (const r of lista) {
          if (!r.fimISO) continue;
          diasTreinados.add(data);
          porTipo[r.sessaoTipo] = (porTipo[r.sessaoTipo] ?? 0) + 1;
        }
      }
      const seriesPorGrupo: Record<string, number> = {};
      for (const s of noPeriodo) {
        const grupo = getExercicio(s.exercicioId)?.grupoMuscular ?? "Desconhecido";
        seriesPorGrupo[grupo] = (seriesPorGrupo[grupo] ?? 0) + 1;
      }
      const volumeKg = noPeriodo.reduce((t, s) => t + (s.cargaKg ?? 0) * (s.reps ?? 0), 0);
      const bikeMin = Object.entries(bike)
        .filter(([d, b]) => d >= inicio && d <= fim && b.concluido)
        .reduce((t, [, b]) => t + b.tempoMinutos, 0);

      return {
        periodo: { inicio, fim, dias },
        diasTreinados: diasTreinados.size,
        datasTreinadas: Array.from(diasTreinados).sort(),
        sessoesConcluidasPorTipo: porTipo,
        totalSeries: noPeriodo.length,
        seriesPorGrupo,
        volumeTotalKg: Math.round(volumeKg),
        bikeIndoorMinutos: bikeMin,
      };
    },
  },
  {
    name: "status_sync",
    description:
      "Quando o app enviou dados pela última vez e o que há no servidor. Use para saber se 'hoje' já foi sincronizado antes de concluir que o usuário não treinou.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    executar(_args, backup) {
      const { log, sessoes } = dadosDe(backup);
      const datas = [...log.map((s) => s.data), ...Object.keys(sessoes)].sort();
      return {
        ultimaSincronizacao: backup.atualizadoEm,
        totalSeries: log.length,
        primeiroDiaRegistrado: datas[0] ?? null,
        ultimoDiaRegistrado: datas[datas.length - 1] ?? null,
        inicioDoPrograma: backup.dados["treino:dataInicio"] ?? null,
        hoje: hojeBelem(),
      };
    },
  },
];
