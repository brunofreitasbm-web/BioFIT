# Meu Treino da Isabela (`/isabela`)

Versão enxuta do `apps/treino`: **só treino + gamificação de aderência**. Sem coach IA, bioimpedância,
Garmin, postura, MCP ou sync com servidor. Sem configurações: não há data de início, meta, mesociclo
nem calibração. Os dados ficam só no `localStorage` do celular dela (backup em Relatório → Backup).

## Onde fica
Dentro do mesmo projeto Vercel do BioFIT (`biofit-treino`), na rota `/isabela`. Sem projeto novo, sem variável de
ambiente. Código em `app/isabela`, `components/isabela`, `lib/isabela`, `hooks/isabela`. Os dados dela usam chaves
`isabela:*` no localStorage e não tocam nos do Bruno (sem sync, sem MCP, sem Garmin). No celular dela: abrir
`/isabela` e "Adicionar à tela inicial" (manifest próprio em `public/isabela/manifest.webmanifest`).

## Plano (`lib/isabela/exercicios.ts`)
4 dias fixos: A Inferior (quadríceps) → B Superior → C Inferior (glúteo/posterior) → D Superior. A fila
segue o último treino feito, não o calendário. Pensado para dor lombar: tudo apoiado em máquina, polia ou
banco, sem peso morto/stiff/remada curvada/agachamento livre e sem impacto (um teste barra nomes proibidos).
É um plano de partida, não prescrição: ela deve alinhar com quem a acompanha (lombar, lipedema).

- Cada posição (`SLOTS`) tem `opcoes[0]` (padrão) e trocas de mesma biomecânica e mesmo grupo. A escolha
  fica salva por posição. Um mesmo `id` não pode mudar de grupo entre posições (teste).
- Retomada: nos 4 primeiros treinos, 2 séries por exercício (`lib/isabela/program.ts`).
- Fotos de `public/exercicios/` (free-exercise-db); sem foto = `imagem: null`.

## Gamificação (`lib/isabela/gamificacao.ts`, testada)
Unidade = **semana de 4 treinos** (4 dias/semana não combina com sequência diária). Semanas seguidas na meta,
semana livre (cobre 1 semana ruim; ganha 1 a cada 4 seguidas), primeira semana neutra, XP por série/treino
com bônus por semanas seguidas, nível, 15 conquistas (incluindo "Volta por cima" e "Mais forte"). Tudo é
calculado do histórico, nada fica guardado.

```
npm run dev            # http://localhost:3010/isabela
npm test -w @biofit/treino
```
