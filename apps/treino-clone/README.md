# Meu Treino (clone do BioFIT para outra pessoa)

Versão enxuta do `apps/treino`: **só treino + gamificação de aderência**. Sem coach IA, bioimpedância,
Garmin, postura, MCP ou sync com servidor. Os dados ficam só no `localStorage` do celular dela
(backup em Relatório → Backup).

## Subir o link secundário (Vercel)
Criar um **novo projeto** apontando para este repositório com **Root Directory = `apps/treino-clone`**.
Não precisa de variável de ambiente nem de Supabase. No celular: abrir o link e "Adicionar à tela inicial".

## Trocar o plano de treino
Tudo em `lib/exercicios.ts` (`SLOTS`, `SESSAO_NOME`, `SESSAO_LABEL`). O plano atual é **provisório**
(o do app original, com cargas de partida zeradas para "calibrar"). Fotos em `public/exercicios/`.

## Gamificação (`lib/gamificacao.ts`, testada em `lib/gamificacao.test.ts`)
Tudo é calculado do histórico, nada fica guardado que possa dessincronizar. Constantes no topo do arquivo:
XP por série/treino/dia leve, multiplicador por sequência, escudos (1 a cada 7 dias, máx. 2), conquistas.
Meta semanal (padrão 5 dias) é ajustável na aba Conquistas.

```
npm run dev:clone    # porta 3011
npm run test:clone
npm run build:clone
```
