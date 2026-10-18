# MCP do BioFIT (dados de treino para Claude / Gemini)

Fluxo: app (localStorage) ⇄ `POST /api/sync` ⇄ Supabase (`biofit_backup`) ⇄ `POST /api/mcp` (leitura **e escrita**).

O sync **mescla** nos dois sentidos: cada registro tem uma chave natural e um carimbo, a gravação mais recente vence e remoções viram lápides (`treino:removidos`, podadas após 90 dias). Assim o que o Claude grava não é apagado pelo próximo envio do celular, e o app recebe o que o Claude gravou ao sincronizar (ao gravar, abrir o app ou voltar para a aba). A lógica está em `lib/merge.ts`.

## Variáveis de ambiente (Vercel, projeto do app `treino`)

| Variável | O que é |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase (PLAY) |
| `SUPABASE_ANON_KEY` | Chave publicável do projeto (não é a service role) |
| `BIOFIT_DB_SECRET` | Segredo que as funções SQL `biofit_backup_*` exigem. No banco fica só o hash (SHA-256) em `biofit_config` |
| `SYNC_TOKEN` | Token que o app usa para enviar dados (>= 24 caracteres) |
| `MCP_TOKEN` | Token do MCP (>= 24 caracteres). Diferente do `SYNC_TOKEN` |

Gerar tokens: `openssl rand -base64 32 | tr -d '=+/'`. Servidor sem token válido recusa tudo.

## Banco

`public.biofit_backup` (RLS ligado, sem policies) e `public.biofit_config` (hash do segredo). O acesso é só pelas funções `security definer`, que exigem o segredo. O SQL está em `supabase/migrations/`:

- `0001_biofit_backup_rpc.sql`: `biofit_backup_get/put` (já aplicadas em produção; o arquivo só versiona).
- `0002_biofit_backup_put_se.sql`: gravação condicional (`p_esperado` = `atualizado_em` lido). Evita que MCP e celular, gravando ao mesmo tempo, percam dados: o servidor relê, mescla e tenta de novo (3 vezes). **Precisa ser aplicada**; sem ela o servidor cai na gravação simples e registra um aviso.

## Conectar

- Claude Code / Gemini CLI (aceitam header): URL `https://<dominio>/api/mcp` + `Authorization: Bearer <MCP_TOKEN>`.
- Conector customizado do claude.ai (só aceita URL): `https://<dominio>/api/mcp/<MCP_TOKEN>`. Aqui a URL é a credencial: não compartilhe.

## Ferramentas

Leitura (mesmos cálculos do app: `lib/relatorio.ts`, `lib/program.ts`, `lib/progressao.ts`, `lib/descanso.ts`):

| Ferramenta | O que devolve |
| --- | --- |
| `plano_do_dia` | Treino **planejado**: exercícios com séries (deload reduzido), reps, descanso, alvo de RIR, carga sugerida (dupla progressão), última vez, recorde, o que já foi feito e recuperação por grupo |
| `treino_do_dia` | Treino **registrado** num dia |
| `status_programa` | Meso, rodada/deload, sessões concluídas, sessão de hoje e próxima, aderência (14 dias), dias seguidos |
| `historico_exercicio` | Evolução de um exercício (por id ou nome) com recordes |
| `resumo_periodo` | Resumo dos últimos N dias |
| `relatorio_volume` | Séries por grupo (diretas + secundárias) vs meta 10–20/semana, frequência por sessão e grupo |
| `progresso` | Todos os exercícios (variação de 1RM), evolução recente, calibração do RIR |
| `relatorio_semanal` | Semana vs semana anterior, volume vs meta, recordes batidos, evolução, programa |
| `listar_exercicios` | Ids, nomes e prescrição do programa |
| `status_sync` | Última gravação no servidor e por quem (app ou MCP) |

Composição corporal (bioimpedância da balança AvaBio / Avanutri):

| Ferramenta | O que faz |
| --- | --- |
| `importar_bioimpedancia` | Recebe o link do botão “Acessar Relatório” do e-mail “Relatório bioimpedância” (noreply@avanutrionline.com) e importa as medições. Cada link traz as 6 mais recentes até aquela data; reimportar não duplica (cada medição tem id próprio) e, se não há nada novo, nem grava |
| `evolucao_corpo` | Série de medições com hora do dia, tendência por mês (por data), massa magra por segmento, veredito cruzado com a força (`recomposicao_em_curso`, `dentro_do_ruido`, `ganho_de_massa`, `ganho_sem_retorno`, `alerta_perda_de_massa`, `inconclusivo`, `dados_insuficientes`), confiança e avisos |
| `remover_corpo` | Apaga as medições de uma data |
| `relatorio_semanal` | Ganha o bloco `corpo`: última medição e lembrete após 14 dias |

A bioimpedância é ruidosa (hidratação, refeição, hora do dia). A análise usa tendência por data e massa magra/força como sinal principal, trata variações pequenas como ruído (`RUIDO_GORDURA_PP`, `RUIDO_MASSA_MAGRA_KG` em `lib/corpo.ts`: pontos de partida, não medidos) e rebaixa a confiança quando as medições foram feitas em horários muito diferentes. Com confiança baixa **e** mais de 45 dias sem medir dentro da janela, o veredito vira `inconclusivo` (a conta original fica em `leituraProvisoria`, só como pista). O app mostra tudo isso na aba **Corpo** do Relatório (somente leitura).

Escrita de treino (anotações `readOnlyHint=false`; a resposta traz o estado do dia depois da gravação):

| Ferramenta | O que faz |
| --- | --- |
| `registrar_series` | Grava uma ou mais séries de um exercício; numera em sequência; inicia a sessão se for hoje e ainda não iniciada |
| `remover_serie` | Apaga uma série (com lápide) |
| `iniciar_sessao` / `terminar_sessao` | Timer da sessão; concluir faz ela contar na fila A→E, rodada e aderência |
| `registrar_bike` | Bike indoor do dia (`minutos: 0` apaga) |

### Mudança de comportamento

`resumo_periodo.seriesPorGrupo` passou a contar os grupos secundários (supino conta meia série para tríceps), igual ao relatório do app. Antes contava só o grupo primário, então os números mudam. `totalSeries` continua sendo o número de séries registradas.

## Importação da Avanutri: dados e segurança

O link do e-mail aponta para uma página que lê `GET balancaapi.avanutrionline.com/Relatorio/<código>` (JSON, sem login; o código é o do link). A resposta traz, além das medições, dados pessoais de quem foi avaliado e **da conta do profissional (inclusive um campo `password`)**. Por isso (`lib/servidor/avanutri.ts`):

- o servidor só aceita o link no formato e domínio da Avanutri (ou o código solto) e chama sempre o host fixo da API: não serve para fazer o servidor acessar outro endereço;
- só os campos de medição são copiados; o resto é descartado sem ser lido nem registrado em log, e o código do link não é guardado;
- o conteúdo da resposta nunca entra em mensagens de erro.

Importação semanal: uma tarefa agendada do Claude (domingo, 20h, horário de Belém) procura o e-mail mais recente do remetente e chama `importar_bioimpedancia`. Para carregar o histórico, importe o link mais recente e o de uma medição antiga que cubra o início.

## Testes

`npm test -w @biofit/treino` (vitest). Cobre o merge (última gravação vence, lápides, idempotência), cada ferramenta pelo endpoint com um Supabase falso, a sobrevivência de uma escrita do MCP a um sync com snapshot antigo, conflito de gravação e paridade do volume com `calcularVolumePorGrupo`.

## Limites conhecidos

- O dado é tão atual quanto o último envio do app. Uma escrita do MCP só aparece no app no próximo sync (ao abrir, ao voltar para a aba ou após gravar algo).
- Um único usuário (`id = 'default'`).
- Aparelho sem histórico nunca sobrescreve o do servidor (409).
- Chaves sem carimbo (`dataInicio`, escolha de sessão do dia, palpites de RIR, versão do programa) não são mescladas: vale a do aparelho que enviou por último. O MCP não escreve nelas.
