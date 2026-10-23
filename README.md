# BioFIT

App de musculação com programa de treino de A a E em mesociclos, com semanas de deload, acompanhamento de bioimpedância e avaliação de postura.

## Estrutura

Monorepo com npm workspaces (apps/*). O app principal é o pacote @biofit/treino.

## Rodar localmente

npm install
npm run dev

## Build

npm run build

## Testes

npm test -w @biofit/treino

## Deploy

A produção muda somente quando o PR é mergeado em main. Sem deploy por linha de comando.

## Segredos

Credenciais ficam em variáveis de ambiente e no painel do provedor, nunca no repositório.
