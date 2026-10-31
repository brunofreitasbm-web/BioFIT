import fs from "fs";
import path from "path";
import { rpc } from "@/lib/servidor/backup";
import { supabaseConfigurado } from "@/lib/servidor/garmin";
import { montarDadosPainel } from "@/lib/recuperacao/painel";
import type { GarminRecuperacao } from "@/lib/ai/prompts";
import type { CurvaIntraday, DiaRecuperacao, PainelGarmin, TipoCurva, TreinoGarmin } from "@/lib/recuperacao/tipos";

// Leitura completa do Garmin para o painel de recuperação. Usa a RPC `biofit_garmin_janela`
// (todas as colunas, mais as curvas intradia), separada de `biofit_garmin_get`, que serve o
// cartão da tela Hoje com um conjunto menor de campos. Sem Supabase (dev local), cai no
// `.local/garmin-data.json` gerado por biofit_garmin_sync.py.

export interface LinhaDiario {
  [campo: string]: unknown;
  data?: string;
}

export type LinhaTreino = Record<string, unknown>;

export interface LinhaIntraday {
  data?: unknown;
  tipo?: unknown;
  pontos?: unknown;
}

export interface DadosGarminBrutos {
  diario: LinhaDiario[];
  treinos: LinhaTreino[];
  intraday: LinhaIntraday[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function diasAtras(n: number, base = new Date()): string {
  const d = new Date(base.getTime() - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function lerArquivoLocal(): DadosGarminBrutos | null {
  const filePath = path.join(process.cwd(), ".local", "garmin-data.json");
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(data?.diario)) return null;
  return { diario: data.diario, treinos: Array.isArray(data?.treinos) ? data.treinos : [], intraday: [] };
}

export async function lerGarminPainel(dias = 120): Promise<DadosGarminBrutos | null> {
  if (!supabaseConfigurado()) return lerArquivoLocal();
  const r = (await rpc("biofit_garmin_janela", { p_inicio: diasAtras(dias), p_fim: diasAtras(0) })) as {
    diario?: LinhaDiario[];
    treinos?: LinhaTreino[];
    intraday?: LinhaIntraday[];
  } | null;
  if (!r) return null;
  return { diario: r.diario ?? [], treinos: r.treinos ?? [], intraday: r.intraday ?? [] };
}

// Prontidão e alertas calculados só com dados Garmin (o servidor não vê as séries de força do
// navegador; a carga usa apenas o TRIMP do relógio).
export function resumirRecuperacao(brutos: DadosGarminBrutos): GarminRecuperacao | null {
  const d = montarDadosPainel(montarPainelGarmin(brutos), []);
  if (!d) return null;
  const ultimo = d.painel.dias[d.painel.dias.length - 1];
  return {
    data: d.hoje,
    prontidaoBiofit: d.prontidaoHoje.score,
    recomendacao: d.prontidaoHoje.recomendacao,
    prontidaoGarmin: ultimo.prontidaoGarmin,
    acwr: d.resumo?.acwr ?? ultimo.acwrGarmin,
    sonoProfundoMin: ultimo.sonoProfundoMin,
    sonoRemMin: ultimo.sonoRemMin,
    alertas: d.insights.filter((i) => i.id === "alerta-precoce" && i.resumo.startsWith("Atenção")).map((i) => i.resumo),
  };
}

// ===== Painel completo (todas as colunas) =====

const txt = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function dataLocal(t: LinhaTreino): string {
  return typeof t.biofit_sessao_data === "string" ? t.biofit_sessao_data : String(t.inicio_utc ?? "").slice(0, 10);
}

function zonas(v: unknown): number[] | null {
  return Array.isArray(v) && v.length === 5 && v.every((x) => typeof x === "number") ? (v as number[]) : null;
}

export function montarPainelGarmin(brutos: DadosGarminBrutos): PainelGarmin {
  const dias: DiaRecuperacao[] = brutos.diario
    .filter((d) => typeof d.data === "string")
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
    .map((d) => ({
      data: String(d.data),
      hrvMs: num(d.vfc_noturna_ms),
      hrvStatus: txt(d.vfc_status),
      hrvMediaSemanal: num(d.vfc_media_semanal_ms),
      hrvBaseBaixo: num(d.vfc_base_baixo_ms),
      hrvBaseAlto: num(d.vfc_base_alto_ms),
      fcRepouso: num(d.fc_repouso_bpm),
      sonoMin: num(d.sono_minutos),
      sonoScore: num(d.sono_score),
      sonoProfundoMin: num(d.sono_profundo_min),
      sonoRemMin: num(d.sono_rem_min),
      sonoLeveMin: num(d.sono_leve_min),
      sonoAcordadoMin: num(d.sono_acordado_min),
      sonoInicioUtc: txt(d.sono_inicio_utc),
      sonoFimUtc: txt(d.sono_fim_utc),
      respiracao: num(d.respiracao_media),
      spo2Media: num(d.spo2_media),
      spo2Min: num(d.spo2_min),
      bodyBatteryAcordar: num(d.body_battery_acordar),
      bodyBatteryMax: num(d.body_battery_max),
      estresse: num(d.estresse_medio),
      passos: num(d.passos),
      prontidaoGarmin: num(d.prontidao_score),
      prontidaoNivel: txt(d.prontidao_nivel),
      statusTreino: txt(d.status_treino),
      cargaAguda: num(d.carga_aguda),
      cargaCronica: num(d.carga_cronica),
      acwrGarmin: num(d.acwr),
      vo2max: num(d.vo2max),
      intensidadeMod: num(d.minutos_intensidade_mod),
      intensidadeVig: num(d.minutos_intensidade_vig),
      caloriasAtivas: num(d.calorias_ativas),
    }));

  const treinos: TreinoGarmin[] = brutos.treinos
    .filter((t) => typeof t.inicio_utc === "string")
    .map((t) => ({
      data: dataLocal(t),
      inicioUtc: String(t.inicio_utc),
      tipo: String(t.tipo ?? ""),
      duracaoMin: num(t.duracao_s) !== null ? Math.round((t.duracao_s as number) / 60) : null,
      fcMedia: num(t.fc_media),
      fcMax: num(t.fc_max),
      calorias: num(t.calorias),
      teAerobico: num(t.te_aerobico),
      teAnaerobico: num(t.te_anaerobico),
      zonasFcS: zonas(t.zonas_fc_s),
      distanciaM: num(t.distancia_m),
      potenciaMedia: num(t.potencia_media),
    }))
    .sort((a, b) => b.inicioUtc.localeCompare(a.inicioUtc));

  const intraday: CurvaIntraday[] = brutos.intraday
    .filter((i) => typeof i.data === "string" && (i.tipo === "body_battery" || i.tipo === "estresse") && Array.isArray(i.pontos))
    .map((i) => ({
      data: String(i.data),
      tipo: i.tipo as TipoCurva,
      pontos: (i.pontos as unknown[]).filter(
        (p): p is [number, number] => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number",
      ),
    }));

  return { dias, treinos, intraday };
}
