# Garmin no BioFIT

Há dois caminhos para os dados chegarem ao Supabase (`biofit_garmin_diario`, `biofit_garmin_treino`), lidos pelo quadro "Recuperação Garmin" (`/api/garmin/today`), pelo `plano_do_dia` e pela ferramenta `recuperacao_garmin` do MCP:

1. **Personal API (recomendado, abaixo):** chave pessoal; o BioFIT busca 1x por dia via Vercel Cron.
2. **Health API em modo push** (seção seguinte): exige conta de desenvolvedor aprovada pela Garmin; hoje sem uso.

## Personal API (busca diária)

Fluxo: Vercel Cron (07:00 em Belém) → `GET /api/garmin/sync` → troca a chave por um token (24 h) → busca **ontem e hoje** (sono, VFC, resumo diário, Body Battery, atividades) → `biofit_garmin_put` (merge: nulo não apaga).

### Passo a passo

1. Gere a chave em `https://connect.garmin.com/app/settings/personalApiToken` (aparece uma vez; validade de 30 dias a 1 ano; a Garmin avisa por e-mail ~1 semana antes de expirar).
2. Vercel → Settings → Environment Variables (Production), depois **Redeploy**:

| Variável | O que é |
| --- | --- |
| `GARMIN_PERSONAL_API_KEY` | A chave do passo 1. Só na Vercel, nunca no repositório |
| `CRON_SECRET` | Senha qualquer com 24+ caracteres (`openssl rand -base64 32 \| tr -d '=+/'`). A Vercel a envia sozinha ao cron; sem ela a rota recusa tudo |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BIOFIT_DB_SECRET` | As mesmas do backup (ver `MCP.md`) |

3. Teste sem esperar as 7h: Vercel → Settings → **Cron Jobs** → `/api/garmin/sync` → **Run**.
4. Vercel → **Logs**, linha `[garmin sync]`: mostra quantos dias/atividades foram gravados, falhas por endpoint e a **estrutura** das respostas (só nomes de campos, sem valores).

### Recuperar o histórico

`GET /api/garmin/sync?dias=N&ate=AAAA-MM-DD` (N de 1 a 35, padrão 2; `ate` padrão hoje) busca N dias terminando em `ate`. Exige `Authorization: Bearer <CRON_SECRET>`; repetir é seguro (o merge não apaga nem duplica).

**A chave tem limite de requisições (HTTP 429).** Com mais de 3 dias a rota busca resumo, passos e Body Battery em UMA chamada de intervalo cada, e só sono e VFC por dia, com pausa. Se o 429 persistir, ela para, grava o que já tem e responde `parcial: true` (e `semSonoEVfcAPartirDe`). Depois do bloqueio, espere ~3 minutos.

Para 35 dias, em pedaços e com intervalo de ~2 minutos entre eles:

```
curl -H "Authorization: Bearer $CRON_SECRET" "https://biofit-treino.vercel.app/api/garmin/sync?dias=12"
curl -H "Authorization: Bearer $CRON_SECRET" "https://biofit-treino.vercel.app/api/garmin/sync?dias=12&ate=AAAA-MM-DD"   # 12 dias antes de hoje
curl -H "Authorization: Bearer $CRON_SECRET" "https://biofit-treino.vercel.app/api/garmin/sync?dias=11&ate=AAAA-MM-DD"   # 24 dias antes de hoje
```

Nunca rode isso em laço curto (por exemplo, a cada 20 segundos): foi assim que o limite foi estourado.

### Limites e cuidados

- **Formato não documentado.** A Garmin não publica os campos das respostas; o conversor usa os mesmos do `biofit_garmin_sync.py` (que rodou com dados reais) e aceita variações. Se um campo vier vazio, a `estrutura` no log mostra o nome real; ajuste `lib/servidor/garminPersonal.ts`.
- **Horário.** No plano grátis da Vercel o cron roda 1x por dia, com horário aproximado (pode atrasar até ~1 h). Se o relógio ainda não sincronizou às 7h, o sono de hoje não vem; o plano trata como "sem dados" e a execução do dia seguinte completa (busca ontem e hoje).
- **Chave expirada** (ou revogada): o log mostra `Troca de token falhou: HTTP 401`; gere outra e troque a variável. O quadro não avisa por si só; ele mostra a data de referência.
- Dados que a Garmin não entrega por API (ex.: VO2 máx., tempo de recuperação) podem faltar.

## Health API (push, alternativa)

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
