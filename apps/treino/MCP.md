# MCP do BioFIT (dados de treino para Claude / Gemini)

Fluxo: app (localStorage) → `POST /api/sync` → Supabase (`biofit_backup`) → `POST /api/mcp` (somente leitura).

## Variáveis de ambiente (Vercel, projeto do app `treino`)

| Variável | O que é |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase (PLAY) |
| `SUPABASE_ANON_KEY` | Chave publicável do projeto (não é a service role) |
| `BIOFIT_DB_SECRET` | Segredo que as funções SQL `biofit_backup_get/put` exigem. No banco fica só o hash (SHA-256) em `biofit_config` |
| `SYNC_TOKEN` | Token que o app usa para enviar dados (>= 24 caracteres) |
| `MCP_TOKEN` | Token do MCP (>= 24 caracteres). Diferente do `SYNC_TOKEN` |

Gerar tokens: `openssl rand -base64 32 | tr -d '=+/'`. Servidor sem token válido recusa tudo.

## Tabela

`public.biofit_backup` (RLS ligado, sem policies) e `public.biofit_config` (hash do segredo). O acesso é só pelas funções `biofit_backup_get/put` (security definer, exigem o segredo). Migrations `biofit_backup_table` e `biofit_backup_rpc`.

## Conectar

- Claude Code / Gemini CLI (aceitam header): URL `https://<dominio>/api/mcp` + `Authorization: Bearer <MCP_TOKEN>`.
- Conector customizado do claude.ai (só aceita URL): `https://<dominio>/api/mcp/<MCP_TOKEN>`. Aqui a URL é a credencial: não compartilhe.

## Ferramentas

`treino_do_dia`, `historico_exercicio`, `resumo_periodo`, `status_sync`.

## Limites conhecidos

- O dado é tão atual quanto o último envio do app (automático após cada gravação, ao abrir e ao esconder a aba). `status_sync` mostra a hora.
- Um único usuário (`id = 'default'`).
- Aparelho sem histórico nunca sobrescreve o do servidor (409).
