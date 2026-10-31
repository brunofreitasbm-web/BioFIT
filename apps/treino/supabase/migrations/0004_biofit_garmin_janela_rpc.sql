-- Leitura dos dados Garmin pelo app (Vercel). Mesmo segredo de biofit_backup_get (biofit_config).
-- Retorna {diario: [...], treinos: [...]} no intervalo [p_inicio, p_fim], só do usuário 'bruno'.
-- Aplicar manualmente, só quando o Tenente-Coronel autorizar.

CREATE OR REPLACE FUNCTION public.biofit_garmin_janela(p_secret text, p_inicio date, p_fim date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 400 then
    raise exception 'intervalo invalido' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'diario', coalesce((
      select jsonb_agg(to_jsonb(d) - 'usuario_id' - 'bruto' order by d.data)
      from public.biofit_garmin_diario d
      where d.usuario_id = 'bruno' and d.data between p_inicio and p_fim
    ), '[]'::jsonb),
    'treinos', coalesce((
      select jsonb_agg(to_jsonb(t) - 'usuario_id' - 'bruto' order by t.inicio_utc desc)
      from public.biofit_garmin_treino t
      where t.usuario_id = 'bruno'
        and t.inicio_utc >= p_inicio::timestamptz
        and t.inicio_utc < (p_fim + 1)::timestamptz
    ), '[]'::jsonb)
  );
end $function$;

REVOKE ALL ON FUNCTION public.biofit_garmin_janela(text, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.biofit_garmin_janela(text, date, date) TO anon, authenticated;
