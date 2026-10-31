// Formato único dos dados Garmin para o painel. Sem dependência de servidor: o mesmo tipo
// é usado pela API (/api/garmin/painel), pelo painel (cliente), pelo Coach e pelo MCP.

export interface DiaRecuperacao {
  data: string; // YYYY-MM-DD
  hrvMs: number | null;
  hrvStatus: string | null;
  hrvMediaSemanal: number | null;
  hrvBaseBaixo: number | null;
  hrvBaseAlto: number | null;
  fcRepouso: number | null;
  sonoMin: number | null;
  sonoScore: number | null;
  sonoProfundoMin: number | null;
  sonoRemMin: number | null;
  sonoLeveMin: number | null;
  sonoAcordadoMin: number | null;
  sonoInicioUtc: string | null;
  sonoFimUtc: string | null;
  respiracao: number | null;
  spo2Media: number | null;
  spo2Min: number | null;
  bodyBatteryAcordar: number | null;
  bodyBatteryMax: number | null;
  estresse: number | null;
  passos: number | null;
  prontidaoGarmin: number | null;
  prontidaoNivel: string | null;
  statusTreino: string | null;
  cargaAguda: number | null;
  cargaCronica: number | null;
  acwrGarmin: number | null;
  vo2max: number | null;
  intensidadeMod: number | null;
  intensidadeVig: number | null;
  caloriasAtivas: number | null;
}

export interface TreinoGarmin {
  data: string; // dia local (Belém) da sessão
  inicioUtc: string;
  tipo: string;
  duracaoMin: number | null;
  fcMedia: number | null;
  fcMax: number | null;
  calorias: number | null;
  teAerobico: number | null;
  teAnaerobico: number | null;
  zonasFcS: number[] | null; // [z1..z5] em segundos
  distanciaM: number | null;
  potenciaMedia: number | null;
}

export type TipoCurva = "body_battery" | "estresse";

export interface CurvaIntraday {
  data: string;
  tipo: TipoCurva;
  pontos: [number, number][]; // [timestamp ms, valor]
}

export interface PainelGarmin {
  dias: DiaRecuperacao[]; // do mais antigo ao mais recente
  treinos: TreinoGarmin[]; // do mais recente ao mais antigo
  intraday: CurvaIntraday[];
}

// Série de força registrada no BioFIT, reduzida ao que a análise precisa.
export interface DiaForca {
  data: string;
  series: number; // séries preenchidas no dia
}

export type Confianca = "baixa" | "media" | "alta";

export interface Insight {
  id: string;
  titulo: string;
  resumo: string; // frase pronta, já com o número
  n: number; // pares/observações usados
  confianca: Confianca;
  r?: number | null; // correlação, quando aplicável
  pontos?: { x: number; y: number }[]; // para dispersão
  rotuloX?: string;
  rotuloY?: string;
  detalhe?: string;
}
