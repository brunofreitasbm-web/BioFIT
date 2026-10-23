-- Leitura dos dados do Garmin pelo app (Vercel). As tabelas biofit_garmin_diario / biofit_garmin_treino
-- são alimentadas pela edge function biofit-garmin-ingest e têm RLS ligado, sem policies: o app lê só
-- por esta função, que exige o mesmo segredo das funções biofit_backup_* (BIOFIT_DB_SECRET).
-- Devolve o mesmo formato do garmin-data.json (diario mais recente primeiro; sem a coluna `bruto`).

CREATE OR REPLACE FUNCTION public.biofit_garmin_get(p_secret text, p_dias int DEFAULT 35)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_diario jsonb;
  v_treinos jsonb;
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.data desc), '[]'::jsonb) into v_diario
  from (
    select data, vfc_noturna_ms, vfc_status, vfc_media_semanal_ms, fc_repouso_bpm, sono_minutos,
           sono_score, body_battery_acordar, body_battery_max, estresse_medio, passos, atualizado_em
    from public.biofit_garmin_diario
    where usuario_id = 'bruno'
    order by data desc
    limit least(greatest(coalesce(p_dias, 35), 1), 120)
  ) d;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.inicio_utc desc), '[]'::jsonb) into v_treinos
  from (
    select garmin_activity_id, inicio_utc, tipo, duracao_s, fc_media, fc_max, calorias, biofit_sessao_data
    from public.biofit_garmin_treino
    where usuario_id = 'bruno'
    order by inicio_utc desc
    limit 30
  ) t;

  return jsonb_build_object('diario', v_diario, 'treinos', v_treinos);
end $function$;

REVOKE ALL ON FUNCTION public.biofit_garmin_get(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.biofit_garmin_get(text, int) TO anon, authenticated;
