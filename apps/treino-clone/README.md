# Meu Treino (clone do BioFIT para outra pessoa)

Versão enxuta do `apps/treino`: **só treino + gamificação de aderência**. Sem coach IA, bioimpedância,
Garmin, postura, MCP ou sync com servidor. Sem configurações: não há data de início, meta, mesociclo
nem calibração. Os dados ficam só no `localStorage` do celular dela (backup em Relatório → Backup).

## Subir o link secundário (Vercel)
Projeto novo apontando para este repositório com **Root Directory = `apps/treino-clone`**. Sem variável de
ambiente e sem Supabase. No celular: abrir o link e "Adicionar à tela inicial".

## Plano (`lib/exercicios.ts`)
4 dias fixos: A Inferior (quadríceps) → B Superior → C Inferior (glúteo/posterior) → D Superior. A fila
segue o último treino feito, não o calendário. Pensado para dor lombar: tudo apoiado em máquina, polia ou
banco, sem peso morto/stiff/remada curvada/agachamento livre e sem impacto (um teste barra nomes proibidos).
É um plano de partida, não prescrição: ela deve alinhar com quem a acompanha (lombar, lipedema).

- Cada posição (`SLOTS`) tem `opcoes[0]` (padrão) e trocas de mesma biomecânica e mesmo grupo. A escolha
  fica salva por posição. Um mesmo `id` não pode mudar de grupo entre posições (teste).
- Retomada: nos 4 primeiros treinos, 2 séries por exercício (`lib/program.ts`).
- Fotos de `public/exercicios/` (free-exercise-db); sem foto = `imagem: null`.

## Gamificação (`lib/gamificacao.ts`, testada)
Unidade = **semana de 4 treinos** (4 dias/semana não combina com sequência diária). Semanas seguidas na meta,
semana livre (cobre 1 semana ruim; ganha 1 a cada 4 seguidas), primeira semana neutra, XP por série/treino
com bônus por semanas seguidas, nível, 15 conquistas (incluindo "Volta por cima" e "Mais forte"). Tudo é
calculado do histórico, nada fica guardado.

```
npm run dev:clone    # porta 3011
npm run test:clone
npm run build:clone
```
