-- Estado já aplicado em produção (projeto PLAY) antes de o SQL vir para o repo.
-- Tabelas: biofit_backup (id text default 'default', dados jsonb, atualizado_em timestamptz default now())
-- e biofit_config (id int default 1, secret_hash text). RLS ligado, sem policies: acesso só pelas funções.

CREATE OR REPLACE FUNCTION public.biofit_backup_get(p_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r record;
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  select dados, atualizado_em into r from public.biofit_backup where id = 'default';
  if not found then return null; end if;
  return jsonb_build_object('dados', r.dados, 'atualizado_em', r.atualizado_em);
end $function$;

CREATE OR REPLACE FUNCTION public.biofit_backup_put(p_secret text, p_dados jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then
    raise exception 'dados deve ser objeto' using errcode = '22023';
  end if;
  insert into public.biofit_backup (id, dados, atualizado_em)
  values ('default', p_dados, now())
  on conflict (id) do update set dados = excluded.dados, atualizado_em = excluded.atualizado_em;
end $function$;
