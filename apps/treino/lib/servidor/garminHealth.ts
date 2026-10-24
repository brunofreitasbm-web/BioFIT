// Converte os resumos que a Garmin Health API empurra (push) para as linhas de
// biofit_garmin_diario / biofit_garmin_treino. Escrito a partir da documentação da API, sem
// payload real em mãos: tudo é lido de forma defensiva (campo ausente = nulo) e o que não for
// reconhecido é só contado em `ignorados`, nunca derruba a entrega.

export interface LinhaDiario {
  data: string;
  vfc_noturna_ms: number | null;
  vfc_status: string | null;
  vfc_media_semanal_ms: number | null;
  fc_repouso_bpm: number | null;
  sono_minutos: number | null;
  sono_score: number | null;
  body_battery_acordar: number | null;
  body_battery_max: number | null;
  estresse_medio: number | null;
  passos: number | null;
}

export interface LinhaTreino {
  garmin_activity_id: number;
  inicio_utc: string;
  tipo: string | null;
  duracao_s: number | null;
  fc_media: number | null;
  fc_max: number | null;
  calorias: number | null;
  biofit_sessao_data: string;
}

export interface Convertido {
  diario: LinhaDiario[];
  treinos: LinhaTreino[];
  usuarios: string[]; // userId (Garmin) visto na entrega: serve para travar GARMIN_API_USER_ID
  ignorados: Record<string, number>;
}

type Obj = Record<string, unknown>;

const FUSO_BELEM_S = -3 * 3600;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const eObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const inteiro = (v: unknown): number | null => (num(v) === null ? null : Math.round(v as number));
// A Garmin usa -1/-2 para "sem dados suficientes" em estresse; vira nulo.
const positivo = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 0 ? n : null;
};
const lista = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(eObj) : []);

function diaVazio(data: string): LinhaDiario {
  return {
    data, vfc_noturna_ms: null, vfc_status: null, vfc_media_semanal_ms: null, fc_repouso_bpm: null,
    sono_minutos: null, sono_score: null, body_battery_acordar: null, body_battery_max: null,
    estresse_medio: null, passos: null,
  };
}

function dataLocalBelem(epochS: number): string {
  return new Date((epochS + FUSO_BELEM_S) * 1000).toISOString().slice(0, 10);
}

// Body Battery vem em stressDetails como {deslocamento_em_segundos: valor}, relativo ao início
// do trecho (startTimeInSeconds). Como a Garmin pode mandar o dia em partes, calcula-se o horário
// absoluto de cada leitura: `max` é o maior valor do dia e `acordar` o maior da primeira metade
// do dia (aproximação: o pico depois da noite de sono; a API não informa a hora de acordar).
function bodyBattery(s: Obj, data: string): { max: number | null; acordar: number | null } {
  const valores = s.timeOffsetBodyBatteryValues;
  const inicio = num(s.startTimeInSeconds);
  const fuso = num(s.startTimeOffsetInSeconds) ?? FUSO_BELEM_S;
  if (!eObj(valores)) return { max: null, acordar: null };
  let max: number | null = null;
  let acordar: number | null = null;
  for (const [deslocamento, v] of Object.entries(valores)) {
    const n = num(v);
    const off = Number(deslocamento);
    if (n === null || n < 0 || !Number.isFinite(off)) continue;
    const local = inicio === null ? null : new Date((inicio + off + fuso) * 1000);
    if (local && local.toISOString().slice(0, 10) !== data) continue;
    max = max === null ? n : Math.max(max, n);
    const hora = local ? local.getUTCHours() : off / 3600;
    if (hora < 12) acordar = acordar === null ? n : Math.max(acordar, n);
  }
  return { max: max === null ? null : Math.round(max), acordar: acordar === null ? null : Math.round(acordar) };
}

export function converterPayload(corpo: unknown, userIdPermitido?: string): Convertido {
  const saida: Convertido = { diario: [], treinos: [], usuarios: [], ignorados: {} };
  if (!eObj(corpo)) return saida;

  const dias = new Map<string, LinhaDiario>();
  const treinos = new Map<number, LinhaTreino>();
  const usuarios = new Set<string>();
  const dia = (data: unknown): LinhaDiario | null => {
    if (typeof data !== "string" || !ISO.test(data)) return null;
    if (!dias.has(data)) dias.set(data, diaVazio(data));
    return dias.get(data)!;
  };
  // Só preenche o que veio; o merge no banco cuida do resto.
  const por = <K extends keyof LinhaDiario>(l: LinhaDiario, k: K, v: LinhaDiario[K]) => {
    if (v !== null) l[k] = v;
  };

  for (const [tipo, itens] of Object.entries(corpo)) {
    const registros = lista(itens);
    if (registros.length === 0) continue;
    const doUsuario = registros.filter((r) => {
      if (typeof r.userId === "string") usuarios.add(r.userId);
      return !userIdPermitido || r.userId === userIdPermitido;
    });

    for (const r of doUsuario) {
      switch (tipo) {
        case "dailies": {
          const l = dia(r.calendarDate);
          if (!l) break;
          por(l, "passos", inteiro(r.steps));
          por(l, "fc_repouso_bpm", inteiro(r.restingHeartRateInBeatsPerMinute));
          por(l, "estresse_medio", inteiro(positivo(r.averageStressLevel)));
          break;
        }
        case "sleeps": {
          const l = dia(r.calendarDate);
          if (!l) break;
          const estagios = [r.deepSleepDurationInSeconds, r.lightSleepDurationInSeconds, r.remSleepInSeconds ?? r.remSleepDurationInSeconds]
            .map(num)
            .filter((n): n is number => n !== null);
          const seg = estagios.length ? estagios.reduce((a, b) => a + b, 0) : num(r.durationInSeconds);
          por(l, "sono_minutos", seg === null ? null : Math.round(seg / 60));
          const score = eObj(r.overallSleepScore) ? r.overallSleepScore.value : r.overallSleepScore;
          por(l, "sono_score", inteiro(score));
          break;
        }
        case "hrv": {
          const l = dia(r.calendarDate);
          if (!l) break;
          por(l, "vfc_noturna_ms", num(r.lastNightAvg));
          break;
        }
        case "stressDetails": {
          const l = dia(r.calendarDate);
          if (!l) break;
          const bb = bodyBattery(r, l.data);
          por(l, "body_battery_max", bb.max);
          por(l, "body_battery_acordar", bb.acordar);
          break;
        }
        case "activities": {
          const id = num(r.activityId);
          const inicio = num(r.startTimeInSeconds);
          // Mesmo critério do sync antigo: sem FC média não é gravação do relógio (é treino
          // importado do BIOFIT em arquivo FIT, com duração estimada).
          if (id === null || !Number.isSafeInteger(id) || inicio === null || num(r.averageHeartRateInBeatsPerMinute) === null) {
            saida.ignorados.atividade_descartada = (saida.ignorados.atividade_descartada ?? 0) + 1;
            break;
          }
          treinos.set(id, {
            garmin_activity_id: id,
            inicio_utc: new Date(inicio * 1000).toISOString(),
            tipo: typeof r.activityType === "string" ? r.activityType.toLowerCase().slice(0, 60) : null,
            duracao_s: inteiro(r.durationInSeconds),
            fc_media: inteiro(r.averageHeartRateInBeatsPerMinute),
            fc_max: inteiro(r.maxHeartRateInBeatsPerMinute),
            calorias: inteiro(r.activeKilocalories),
            biofit_sessao_data: dataLocalBelem(inicio),
          });
          break;
        }
        default:
          saida.ignorados[tipo] = (saida.ignorados[tipo] ?? 0) + 1;
      }
    }
  }

  saida.diario = [...dias.values()].filter((l) => Object.entries(l).some(([k, v]) => k !== "data" && v !== null));
  saida.treinos = [...treinos.values()];
  saida.usuarios = [...usuarios];
  return saida;
}
