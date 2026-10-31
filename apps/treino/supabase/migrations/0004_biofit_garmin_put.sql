-- Gravação dos dados do Garmin pelo webhook da Health API (rota /api/garmin/webhook/[token]).
-- A Garmin entrega sono, VFC, estresse/Body Battery e dias em resumos separados e, às vezes, em
-- partes. Por isso é um merge: campo novo nulo NÃO apaga o que já existe, e body_battery_max só sobe.
-- Mesmo segredo das funções biofit_backup_* / biofit_garmin_get (BIOFIT_DB_SECRET); o app usa a
-- chave publicável, nunca a service role.

CREATE OR REPLACE FUNCTION public.biofit_garmin_put(p_secret text, p_diario jsonb DEFAULT '[]', p_treinos jsonb DEFAULT '[]')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  n_diario int := 0;
  n_treinos int := 0;
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if jsonb_typeof(p_diario) is distinct from 'array' or jsonb_typeof(p_treinos) is distinct from 'array' then
    raise exception 'diario e treinos devem ser arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(p_diario) > 400 or jsonb_array_length(p_treinos) > 400 then
    raise exception 'payload grande demais' using errcode = '22023';
  end if;

  insert into public.biofit_garmin_diario as t
    (usuario_id, data, vfc_noturna_ms, vfc_status, vfc_media_semanal_ms, fc_repouso_bpm, sono_minutos,
     sono_score, body_battery_acordar, body_battery_max, estresse_medio, passos, atualizado_em)
  select 'bruno', r.data, r.vfc_noturna_ms, r.vfc_status, r.vfc_media_semanal_ms, r.fc_repouso_bpm, r.sono_minutos,
         r.sono_score, r.body_battery_acordar, r.body_battery_max, r.estresse_medio, r.passos, now()
  from jsonb_to_recordset(p_diario) as r(
    data date, vfc_noturna_ms numeric, vfc_status text, vfc_media_semanal_ms numeric, fc_repouso_bpm int,
    sono_minutos int, sono_score int, body_battery_acordar int, body_battery_max int, estresse_medio int, passos int)
  where r.data is not null
  on conflict (usuario_id, data) do update set
    vfc_noturna_ms       = coalesce(excluded.vfc_noturna_ms, t.vfc_noturna_ms),
    vfc_status           = coalesce(excluded.vfc_status, t.vfc_status),
    vfc_media_semanal_ms = coalesce(excluded.vfc_media_semanal_ms, t.vfc_media_semanal_ms),
    fc_repouso_bpm       = coalesce(excluded.fc_repouso_bpm, t.fc_repouso_bpm),
    sono_minutos         = coalesce(excluded.sono_minutos, t.sono_minutos),
    sono_score           = coalesce(excluded.sono_score, t.sono_score),
    body_battery_acordar = coalesce(excluded.body_battery_acordar, t.body_battery_acordar),
    body_battery_max     = greatest(excluded.body_battery_max, t.body_battery_max),
    estresse_medio       = coalesce(excluded.estresse_medio, t.estresse_medio),
    passos               = greatest(excluded.passos, t.passos),
    atualizado_em        = now();
  get diagnostics n_diario = row_count;

  insert into public.biofit_garmin_treino as t
    (usuario_id, garmin_activity_id, inicio_utc, tipo, duracao_s, fc_media, fc_max, calorias, biofit_sessao_data, atualizado_em)
  select 'bruno', r.garmin_activity_id, r.inicio_utc, r.tipo, r.duracao_s, r.fc_media, r.fc_max, r.calorias, r.biofit_sessao_data, now()
  from jsonb_to_recordset(p_treinos) as r(
    garmin_activity_id bigint, inicio_utc timestamptz, tipo text, duracao_s int, fc_media int, fc_max int,
    calorias int, biofit_sessao_data date)
  where r.garmin_activity_id is not null and r.inicio_utc is not null
  on conflict (usuario_id, garmin_activity_id) do update set
    inicio_utc         = excluded.inicio_utc,
    tipo               = coalesce(excluded.tipo, t.tipo),
    duracao_s          = coalesce(excluded.duracao_s, t.duracao_s),
    fc_media           = coalesce(excluded.fc_media, t.fc_media),
    fc_max             = coalesce(excluded.fc_max, t.fc_max),
    calorias           = coalesce(excluded.calorias, t.calorias),
    biofit_sessao_data = coalesce(excluded.biofit_sessao_data, t.biofit_sessao_data),
    atualizado_em      = now();
  get diagnostics n_treinos = row_count;

  return jsonb_build_object('diario', n_diario, 'treinos', n_treinos);
end $function$;

REVOKE ALL ON FUNCTION public.biofit_garmin_put(text, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.biofit_garmin_put(text, jsonb, jsonb) TO anon, authenticated;
