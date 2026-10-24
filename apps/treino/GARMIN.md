# Garmin no BioFIT (Health API, modo push)

Fluxo: relógio → Garmin Connect → **Garmin Health API** → `POST /api/garmin/webhook/<GARMIN_WEBHOOK_TOKEN>` → Supabase (`biofit_garmin_diario`, `biofit_garmin_treino`) → quadro "Recuperação Garmin" (`/api/garmin/today`) e ferramenta `recuperacao_garmin` do MCP.

A Garmin envia assim que o relógio sincroniza; não há horário fixo nem PC envolvido.

## Variáveis de ambiente (Vercel)

| Variável | O que é |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BIOFIT_DB_SECRET` | As mesmas do backup (ver `MCP.md`) |
| `GARMIN_WEBHOOK_TOKEN` | Token no caminho da URL do webhook (>= 24 caracteres). `openssl rand -base64 32 \| tr -d '=+/'` |
| `GARMIN_API_USER_ID` | (opcional) `userId` da Garmin; com ele, entregas de outros usuários são ignoradas. O valor aparece no log da Vercel (`[garmin webhook]`) na primeira entrega |

A consumer key/secret da Garmin **não** são usadas pelo webhook (push não precisa assinar nada); só serão necessárias para backfill do histórico.

## Portal de desenvolvedores da Garmin

Em *Endpoint Configuration*, modo **PUSH** (não "ping"), com a URL `https://<dominio>/api/garmin/webhook/<GARMIN_WEBHOOK_TOKEN>` para os resumos: **Dailies, Sleeps, HRV, Stress Details, Activities**. Em modo ping a Garmin só avisa que há dado e é preciso buscar com OAuth assinado; isso não está implementado.

O usuário (você) precisa ter autorizado o app na Garmin; sem isso nada é entregue.

## Banco

- `0003_biofit_garmin_get.sql`: leitura (`biofit_garmin_get`).
- `0004_biofit_garmin_put.sql`: gravação com merge (`biofit_garmin_put`). Resumos chegam separados e em partes: campo nulo não apaga o existente; `body_battery_max` e `passos` só sobem.

## O que vem e o que é aproximado

| Campo | Origem | Observação |
| --- | --- | --- |
| Sono (min, score) | `sleeps` | Soma das fases (profundo + leve + REM); sem fases, `durationInSeconds` |
| VFC noturna (ms) | `hrv.lastNightAvg` | A API não informa o status da VFC nem a média semanal |
| Body Battery máx. / acordar | `stressDetails.timeOffsetBodyBatteryValues` | "Acordar" é o maior valor antes do meio-dia (a API não dá a hora de acordar) |
| FC repouso, passos, estresse | `dailies` | Estresse negativo (sem dados) vira nulo |
| Atividades | `activities` | Descarta as sem FC média (treinos importados do BIOFIT em FIT) |

Escrito a partir da documentação, sem payload real. Se um campo vier sempre nulo, o log `[garmin webhook]` mostra quais resumos chegaram (`ignorados` lista os não reconhecidos); ajuste `lib/servidor/garminHealth.ts`.

## Plano do dia (`plano_do_dia`)

Para **hoje**, o plano traz `prontidaoGarmin` (regras em `lib/prontidao.ts`, limiares no topo do arquivo):

| Nível | Quando | Ajuste |
| --- | --- | --- |
| `sem_dados` | Sem sono/Body Battery de **hoje** (relógio não sincronizou) | Nenhum: treino como planejado |
| `normal` | Sono ≥ 6 h, score ≥ 60, Body Battery ao acordar ≥ 50 | Nenhum |
| `atencao` | Só um dos dois ruins (sono < 6 h ou score < 60; **ou** Body Battery < 50) | +1 RIR, não subir carga, sem teste de falha |
| `baixa` | Sono **e** Body Battery ruins | Igual, e −1 série por exercício (mínimo 2) |

Cada exercício ganha `ajusteHoje`. As cargas sugeridas pela dupla progressão e o histórico **não** são alterados, e o plano nunca manda pular o treino. Em semana de deload o nível aparece, mas sem ajuste. Duas noites seguidas com menos de 6 h pesam mais que uma.

Só o MCP usa isso; a tela de treino do app ainda mostra o plano sem o ajuste.

## Legado

`biofit_garmin_sync.py`, `sync-garmin.bat` e `configurar-agendador-garmin.ps1` (sync pelo PC via garminconnect, não oficial) continuam funcionando e gravam nas mesmas tabelas pela função `biofit-garmin-ingest`. Com o push funcionando, desligue a tarefa `BioFIT_Garmin_Sync` do Agendador do Windows.
