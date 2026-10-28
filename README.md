# BioFIT

App de treino de musculação com programa A→E em mesociclos com deload, registro de séries, bioimpedância, postura e exportação de sessões em .FIT (Garmin).

## Estrutura
- `apps/treino`: app web (Next.js 14, React 18, Tailwind) publicado na Vercel no projeto `biofit-treino`.
- `scripts/` e `biofit_garmin_sync.py`: sincronização com Garmin.
- `Treinos/`: definição dos treinos do programa.

## Rodar localmente
```bash
npm ci
npm run dev        # http://localhost:3010
npm test -w @biofit/treino
npm run build
```

## Fluxo de trabalho
Mudanças entram por Pull Request com merge squash. Veja `CLAUDE.md` para o padrão de commits e o que não pode ser versionado. O CI roda testes e build em todo PR.
