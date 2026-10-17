-- Gravação condicional (concorrência otimista): só grava se o backup ainda estiver na versão
-- lida (`p_esperado` = atualizado_em lido; null = ainda não existe linha). Retorna o novo
-- atualizado_em, ou null quando alguém gravou no meio — o servidor relê, mescla e tenta de novo.
CREATE OR REPLACE FUNCTION public.biofit_backup_put_se(p_secret text, p_dados jsonb, p_esperado timestamptz)
 RETURNS timestamptz
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare novo timestamptz;
begin
  if p_secret is null
     or encode(digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.biofit_config where id = 1) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then
    raise exception 'dados deve ser objeto' using errcode = '22023';
  end if;
  if p_esperado is null then
    insert into public.biofit_backup (id, dados, atualizado_em)
    values ('default', p_dados, clock_timestamp())
    on conflict (id) do nothing
    returning atualizado_em into novo;
  else
    update public.biofit_backup set dados = p_dados, atualizado_em = clock_timestamp()
    where id = 'default' and atualizado_em = p_esperado
    returning atualizado_em into novo;
  end if;
  return novo;
end $function$;

-- O Supabase concede execute a anon/authenticated/service_role em funções novas; mantém só o
-- que as outras biofit_backup_* têm (o app usa a chave anon, protegida pelo segredo).
revoke all on function public.biofit_backup_put_se(text, jsonb, timestamptz) from public, authenticated;
grant execute on function public.biofit_backup_put_se(text, jsonb, timestamptz) to anon, service_role;
