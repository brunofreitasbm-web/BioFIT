import type { LinhaDiario, LinhaTreino } from "./garminHealth";

// Cliente da Garmin Connect Personal API (chave pessoal, só leitura). Fluxo oficial: troca a
// chave por um bearer token (texto puro, ~24 h, sem refresh) e chama os serviços do Connect.
// Os nomes de campos das respostas NÃO são documentados pela Garmin; aqui usamos os mesmos do
// biofit_garmin_sync.py (que rodou com dados reais) e aceitamos formatos alternativos. A rota
// de sync registra a estrutura recebida (só nomes, sem valores) para corrigir diferenças.

const BASE_PADRAO = "https://personal.connectapi.garmin.com";
const CAMINHO_TOKEN = "/personalapitoken-service/personal-api/personal-api-key/token";
const FUSO_BELEM_MS = -3 * 3600 * 1000;

export class ErroGarmin extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const base = () => (process.env.GARMIN_PERSONAL_API_BASE_URL || BASE_PADRAO).replace(/\/+$/, "");

export async function obterToken(chave: string): Promise<string> {
  const res = await fetch(`${base()}${CAMINHO_TOKEN}`, {
    method: "POST",
    headers: { Accept: "*/*", Authorization: `ApiKey ${chave}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const dica =
      res.status === 401 || res.status === 403
        ? " (chave inválida ou expirada: gere outra no Garmin Connect)"
        : res.status === 429
          ? " (limite de requisições da Garmin: aguarde alguns minutos)"
          : "";
    throw new ErroGarmin(res.status, `Troca de token falhou: HTTP ${res.status}${dica}`);
  }
  const corpo = (await res.text()).trim();
  // A documentação do cliente oficial trata o corpo inteiro como o token; tolera JSON por garantia.
  if (corpo.startsWith("{")) {
    try {
      const t = (JSON.parse(corpo) as { access_token?: unknown }).access_token;
      if (typeof t === "string" && t) return t;
    } catch {
      // cai no erro abaixo
    }
  }
  if (!corpo || corpo.startsWith("{")) throw new ErroGarmin(502, "Resposta do token em formato inesperado.");
  return corpo;
}

const dormir = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

// 429 = limite de requisições da chave. Espera (Retry-After, senão 2 s, 4 s) e tenta de novo até
// 3 vezes; persistindo, falha com status 429 para quem chama parar de insistir.
function esperaRetry(res: Response, tentativa: number): number {
  const ra = Number(res.headers.get("retry-after"));
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 8000);
  return Number(process.env.GARMIN_RETRY_MS ?? 2000) * tentativa;
}

export async function buscar(caminho: string, token: string): Promise<unknown> {
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(`${base()}${caminho}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 429 && tentativa < 3) {
      await dormir(esperaRetry(res, tentativa));
      continue;
    }
    if (!res.ok) throw new ErroGarmin(res.status, `HTTP ${res.status} em ${caminho.split("?")[0]}`);
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }
}

export const caminhos = {
  sono: (d: string) => `/sleep-service/sleep/dailySleep?date=${d}`,
  hrv: (d: string) => `/hrv-service/hrv/${d}`,
  resumo: (d: string) => `/usersummary-service/v2/dailysummaries?startDate=${d}&endDate=${d}`,
  bodyBattery: (d: string) => `/wellness-service/wellness/bodyBattery/reports/daily?startDate=${d}&endDate=${d}`,
  // Intervalo: 1 chamada para vários dias (recuperação de histórico respeitando o limite da chave).
  resumoIntervalo: (ini: string, fim: string) => `/usersummary-service/v2/dailysummaries?startDate=${ini}&endDate=${fim}`,
  passosIntervalo: (ini: string, fim: string) => `/usersummary-service/stats/steps/daily/${ini}/${fim}`,
  bodyBatteryIntervalo: (ini: string, fim: string) => `/wellness-service/wellness/bodyBattery/reports/daily?startDate=${ini}&endDate=${fim}`,
  // Opcional: o resumo diário v2 não traz passos. Se a chave não tiver acesso, vira "falha" no log.
  passos: (d: string) => `/usersummary-service/stats/steps/daily/${d}/${d}`,
  atividades: (ini: string, fim: string, limite = 30) => `/activitylist-service/activities/search/activities?start=0&limit=${limite}&startDate=${ini}&endDate=${fim}`,
};

// ===== Conversão =====

type Obj = Record<string, unknown>;
const eObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const inteiro = (v: unknown): number | null => (num(v) === null ? null : Math.round(v as number));

// Primeiro valor numérico de uma chave em qualquer nível. O resumo diário da Personal API não tem
// formato documentado; procurar pelo nome tolera aninhamento diferente do sync antigo.
export function achar(o: unknown, ...nomes: string[]): number | null {
  const visitar = (v: unknown, nivel: number): number | null => {
    if (nivel > 6) return null;
    if (Array.isArray(v)) {
      for (const x of v) {
        const r = visitar(x, nivel + 1);
        if (r !== null) return r;
      }
    } else if (eObj(v)) {
      for (const n of nomes) if (num(v[n]) !== null) return v[n] as number;
      for (const x of Object.values(v)) {
        const r = visitar(x, nivel + 1);
        if (r !== null) return r;
      }
    }
    return null;
  };
  return visitar(o, 0);
}

function g(o: unknown, ...caminho: string[]): unknown {
  let atual = o;
  for (const p of caminho) {
    if (!eObj(atual) || !(p in atual)) return undefined;
    atual = atual[p];
  }
  return atual;
}

// Respostas de intervalo podem vir como lista, ou como objeto com a lista dentro.
function lista(v: unknown): Obj[] {
  if (Array.isArray(v)) return v.filter(eObj);
  if (eObj(v)) for (const x of Object.values(v)) if (Array.isArray(x) && x.some(eObj)) return x.filter(eObj);
  return [];
}

function doDia(v: unknown, dia: string): Obj | null {
  const itens = lista(v);
  const achado = itens.find((i) => i.calendarDate === dia || i.date === dia || i.startDate === dia);
  if (achado) return achado;
  if (itens.length === 1) return itens[0];
  return eObj(v) && itens.length === 0 ? v : null;
}

export interface RespostasDia {
  sono: unknown;
  hrv: unknown;
  resumo: unknown;
  bodyBattery: unknown;
  passos?: unknown;
}

// Body Battery vem como pares [epoch_ms, valor]. "Acordar" = maior valor antes do meio-dia
// (Belém), a mesma aproximação do webhook; o resumo diário, quando traz, tem prioridade.
function bodyBattery(resp: unknown, dia: string): { max: number | null; acordar: number | null } {
  const item = doDia(resp, dia) ?? (Array.isArray(resp) && eObj(resp[0]) ? resp[0] : null);
  const pares = g(item, "bodyBatteryValuesArray");
  let max: number | null = null;
  let acordar: number | null = null;
  if (Array.isArray(pares)) {
    for (const p of pares) {
      if (!Array.isArray(p)) continue;
      const ts = num(p[0]);
      const v = num(p[1]);
      if (ts === null || v === null || v < 0) continue;
      const local = new Date(ts + FUSO_BELEM_MS);
      if (local.toISOString().slice(0, 10) !== dia) continue;
      max = max === null ? v : Math.max(max, v);
      if (local.getUTCHours() < 12) acordar = acordar === null ? v : Math.max(acordar, v);
    }
  }
  return { max, acordar };
}

export function converterDia(dia: string, r: RespostasDia): LinhaDiario | null {
  const bb = bodyBattery(r.bodyBattery, dia);
  // Formato real do resumo v2 (visto em produção): data[].heartRate.restingValue, data[].stress.avgLevel,
  // data[].bodyBattery.maxValue. Os nomes antigos do sync do PC ficam de reserva.
  const resumo = doDia(r.resumo, dia);

  const segSono = num(g(r.sono, "dailySleepDTO", "sleepTimeSeconds") ?? g(r.sono, "sleepTimeSeconds"));
  const statusBruto = g(r.hrv, "hrvSummary", "status") ?? g(r.hrv, "status");
  const estresse = num(g(resumo, "stress", "avgLevel")) ?? achar(resumo, "averageStressLevel", "avgStressLevel");

  const linha: LinhaDiario = {
    data: dia,
    vfc_noturna_ms: num(g(r.hrv, "hrvSummary", "lastNightAvg") ?? g(r.hrv, "lastNightAvg")),
    // "NONE" é a Garmin dizendo "sem classificação": vira nulo para o cartão mostrar os ms.
    vfc_status: typeof statusBruto === "string" && statusBruto !== "NONE" ? statusBruto.slice(0, 60) : null,
    vfc_media_semanal_ms: num(g(r.hrv, "hrvSummary", "weeklyAvg") ?? g(r.hrv, "weeklyAvg")),
    fc_repouso_bpm: inteiro(num(g(resumo, "heartRate", "restingValue")) ?? achar(resumo, "restingHeartRate", "restingHeartRateInBeatsPerMinute")),
    sono_minutos: segSono === null ? null : Math.round(segSono / 60),
    sono_score: inteiro(g(r.sono, "dailySleepDTO", "sleepScores", "overall", "value") ?? g(r.sono, "sleepScores", "overall", "value")),
    body_battery_acordar: inteiro(achar(resumo, "bodyBatteryAtWakeTime") ?? bb.acordar),
    body_battery_max: inteiro(num(g(resumo, "bodyBattery", "maxValue")) ?? achar(resumo, "bodyBatteryHighestValue") ?? bb.max),
    estresse_medio: estresse !== null && estresse >= 0 ? Math.round(estresse) : null,
    passos: inteiro(achar(r.passos, "totalSteps", "steps") ?? achar(resumo, "totalSteps")),
  };
  return Object.entries(linha).some(([k, v]) => k !== "data" && v !== null) ? linha : null;
}

export function converterAtividades(resp: unknown): LinhaTreino[] {
  const saida: LinhaTreino[] = [];
  for (const a of lista(resp)) {
    const id = num(a.activityId);
    const gmt = typeof a.startTimeGMT === "string" ? a.startTimeGMT : null;
    // Sem FC média não é gravação do relógio (treino importado do BIOFIT em FIT): mesmo critério do sync antigo.
    if (id === null || !Number.isSafeInteger(id) || !gmt || num(a.averageHR) === null) continue;
    const inicio = new Date(`${gmt.replace(" ", "T")}Z`);
    if (Number.isNaN(inicio.getTime())) continue;
    saida.push({
      garmin_activity_id: id,
      inicio_utc: inicio.toISOString(),
      tipo: typeof g(a, "activityType", "typeKey") === "string" ? (g(a, "activityType", "typeKey") as string).slice(0, 60) : null,
      duracao_s: inteiro(a.duration),
      fc_media: inteiro(a.averageHR),
      fc_max: inteiro(a.maxHR),
      calorias: inteiro(a.calories),
      biofit_sessao_data: new Date(inicio.getTime() + FUSO_BELEM_MS).toISOString().slice(0, 10),
    });
  }
  return saida;
}

// Nomes de campos (sem valores) para depurar o formato real sem expor dado de saúde nos logs.
export function estrutura(v: unknown, prefixo = "", profundidade = 0, saida: string[] = []): string[] {
  if (saida.length >= 60 || profundidade > 3) return saida;
  if (Array.isArray(v)) {
    saida.push(`${prefixo || "$"}[]`);
    if (v.length > 0) estrutura(v[0], `${prefixo}[]`, profundidade + 1, saida);
  } else if (eObj(v)) {
    for (const [k, x] of Object.entries(v)) {
      const caminho = prefixo ? `${prefixo}.${k}` : k;
      if (eObj(x) || Array.isArray(x)) estrutura(x, caminho, profundidade + 1, saida);
      else saida.push(`${caminho}:${x === null ? "null" : typeof x}`);
    }
  }
  return saida;
}
