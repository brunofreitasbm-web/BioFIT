import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Versão 4 (coleta ampliada). Base: v3 em produção, verify_jwt=false. Autenticação própria por
// BIOFIT_GARMIN_INGEST_TOKEN. Qualquer mudança aqui só vai ao ar com deploy manual.

const USUARIO = "bruno";
const MAX_LINHAS = 400;
const MAX_BYTES = 1_000_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function iguais(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let r = 0;
  for (let i = 0; i < ea.length; i++) r |= ea[i] ^ eb[i];
  return r === 0;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: unknown) => (num(v) === null ? null : Math.round(v as number));
const txt = (v: unknown, max = 60) => (typeof v === "string" ? v.slice(0, max) : null);
const data = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const ts = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erro: "metodo" });

  // Fail-closed: sem segredo configurado, nada entra.
  const segredo = Deno.env.get("BIOFIT_GARMIN_INGEST_TOKEN") ?? "";
  if (segredo.length < 24) return json(503, { erro: "ingest_nao_configurado" });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!iguais(token, segredo)) return json(401, { erro: "nao_autorizado" });

  const bruto = await req.text();
  if (bruto.length > MAX_BYTES) return json(413, { erro: "payload_grande" });

  // deno-lint-ignore no-explicit-any
  let corpo: any;
  try { corpo = JSON.parse(bruto); } catch { return json(400, { erro: "json_invalido" }); }

  const diario = Array.isArray(corpo?.diario) ? corpo.diario.slice(0, MAX_LINHAS) : [];
  const treinos = Array.isArray(corpo?.treinos) ? corpo.treinos.slice(0, MAX_LINHAS) : [];

  const linhasDiario = diario
    // deno-lint-ignore no-explicit-any
    .map((d: any) => ({
      usuario_id: USUARIO,
      data: data(d?.data),
      vfc_noturna_ms: num(d?.vfc_noturna_ms),
      vfc_status: txt(d?.vfc_status),
      vfc_media_semanal_ms: num(d?.vfc_media_semanal_ms),
      fc_repouso_bpm: int(d?.fc_repouso_bpm),
      sono_minutos: int(d?.sono_minutos),
      sono_score: int(d?.sono_score),
      body_battery_acordar: int(d?.body_battery_acordar),
      body_battery_max: int(d?.body_battery_max),
      estresse_medio: int(d?.estresse_medio),
      passos: int(d?.passos),
      sono_profundo_min: int(d?.sono_profundo_min),
      sono_rem_min: int(d?.sono_rem_min),
      sono_leve_min: int(d?.sono_leve_min),
      sono_acordado_min: int(d?.sono_acordado_min),
      sono_inicio_utc: ts(d?.sono_inicio_utc),
      sono_fim_utc: ts(d?.sono_fim_utc),
      respiracao_media: num(d?.respiracao_media),
      spo2_media: num(d?.spo2_media),
      spo2_min: num(d?.spo2_min),
      vfc_base_baixo_ms: num(d?.vfc_base_baixo_ms),
      vfc_base_alto_ms: num(d?.vfc_base_alto_ms),
      prontidao_score: int(d?.prontidao_score),
      prontidao_nivel: txt(d?.prontidao_nivel),
      status_treino: txt(d?.status_treino),
      carga_aguda: num(d?.carga_aguda),
      carga_cronica: num(d?.carga_cronica),
      acwr: num(d?.acwr),
      vo2max: num(d?.vo2max),
      minutos_intensidade_mod: int(d?.minutos_intensidade_mod),
      minutos_intensidade_vig: int(d?.minutos_intensidade_vig),
      calorias_ativas: int(d?.calorias_ativas),
      calorias_bmr: int(d?.calorias_bmr),
      andares: int(d?.andares),
      bruto: d?.bruto ?? null,
      atualizado_em: new Date().toISOString(),
    }))
    // deno-lint-ignore no-explicit-any
    .filter((l: any) => l.data !== null);

  const linhasTreino = treinos
    // deno-lint-ignore no-explicit-any
    .map((t: any) => ({
      usuario_id: USUARIO,
      garmin_activity_id: Number.isSafeInteger(t?.garmin_activity_id) ? t.garmin_activity_id : null,
      inicio_utc: ts(t?.inicio_utc),
      tipo: txt(t?.tipo),
      duracao_s: int(t?.duracao_s),
      fc_media: int(t?.fc_media),
      fc_max: int(t?.fc_max),
      calorias: int(t?.calorias),
      biofit_sessao_data: data(t?.biofit_sessao_data),
      te_aerobico: num(t?.te_aerobico),
      te_anaerobico: num(t?.te_anaerobico),
      zonas_fc_s: Array.isArray(t?.zonas_fc_s) && t.zonas_fc_s.length === 5 ? t.zonas_fc_s.map((x: unknown) => int(x) ?? 0) : null,
      distancia_m: num(t?.distancia_m),
      potencia_media: num(t?.potencia_media),
      bruto: t?.bruto ?? null,
      atualizado_em: new Date().toISOString(),
    }))
    // deno-lint-ignore no-explicit-any
    .filter((l: any) => l.garmin_activity_id !== null && l.inicio_utc !== null);

  const TIPOS_INTRADAY = new Set(["body_battery", "estresse"]);
  const intraday = (Array.isArray(corpo?.intraday) ? corpo.intraday : []).slice(0, MAX_LINHAS * 2);
  const linhasIntraday = intraday
    // deno-lint-ignore no-explicit-any
    .map((i: any) => ({
      usuario_id: USUARIO,
      data: data(i?.data),
      tipo: typeof i?.tipo === "string" && TIPOS_INTRADAY.has(i.tipo) ? i.tipo : null,
      pontos: Array.isArray(i?.pontos) ? i.pontos.slice(0, 200) : null,
      atualizado_em: new Date().toISOString(),
    }))
    // deno-lint-ignore no-explicit-any
    .filter((l: any) => l.data !== null && l.tipo !== null && l.pontos !== null);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  if (linhasDiario.length) {
    const { error } = await sb.from("biofit_garmin_diario").upsert(linhasDiario, { onConflict: "usuario_id,data" });
    if (error) return json(500, { erro: "falha_diario", detalhe: error.message });
  }
  if (linhasTreino.length) {
    const { error } = await sb.from("biofit_garmin_treino").upsert(linhasTreino, { onConflict: "usuario_id,garmin_activity_id" });
    if (error) return json(500, { erro: "falha_treino", detalhe: error.message });
  }

  if (linhasIntraday.length) {
    const { error } = await sb.from("biofit_garmin_intraday").upsert(linhasIntraday, { onConflict: "usuario_id,data,tipo" });
    if (error) return json(500, { erro: "falha_intraday", detalhe: error.message });
  }

  return json(200, { ok: true, diario: linhasDiario.length, treinos: linhasTreino.length, intraday: linhasIntraday.length });
});
