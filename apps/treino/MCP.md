# MCP do BioFIT (dados de treino para Claude / Gemini)

Fluxo: app (localStorage) → `POST /api/sync` → Supabase (`biofit_backup`) → `POST /api/mcp` (somente leitura).

## Variáveis de ambiente (Vercel, projeto do app `treino`)

| Variável | O que é |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase (PLAY) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role. Só no servidor, nunca `NEXT_PUBLIC_*` |
| `SYNC_TOKEN` | Token que o app usa para enviar dados (>= 24 caracteres) |
| `MCP_TOKEN` | Token do MCP (>= 24 caracteres). Diferente do `SYNC_TOKEN` |

Gerar tokens: `openssl rand -base64 32 | tr -d '=+/'`. Servidor sem token válido recusa tudo.

## Tabela

`public.biofit_backup` (RLS ligado, sem policies: só a service role acessa). Migration `biofit_backup_table`.

## Conectar

- Claude Code / Gemini CLI (aceitam header): URL `https://<dominio>/api/mcp` + `Authorization: Bearer <MCP_TOKEN>`.
- Conector customizado do claude.ai (só aceita URL): `https://<dominio>/api/mcp/<MCP_TOKEN>`. Aqui a URL é a credencial: não compartilhe.

## Ferramentas

`treino_do_dia`, `historico_exercicio`, `resumo_periodo`, `status_sync`.

## Limites conhecidos

- O dado é tão atual quanto o último envio do app (automático após cada gravação, ao abrir e ao esconder a aba). `status_sync` mostra a hora.
- Um único usuário (`id = 'default'`).
- Aparelho sem histórico nunca sobrescreve o do servidor (409).
