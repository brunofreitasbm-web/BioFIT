# BioFIT

npm workspaces monorepo.

## Apps

- `apps/web` — Next.js dashboard (trainer side: alunos, cobranças, exercícios, desafios).
- `apps/treino` — Next.js client-facing workout/bioimpedância tracker.
- `apps/api` — Fastify + Prisma API.
- `apps/mobile` — Expo/React Native app.
- `apps/opengym` — [openGym](https://github.com/DuarteSantos8/openGym), a self-hosted gym & body-weight
  tracker, vendored as a standalone app (own stack, own Docker Compose — not wired into the
  `@biofit/*` packages). See `apps/opengym/README.md` to run it.

## Packages

- `packages/shared` — shared types/utilities used by the `@biofit/*` apps.

## Development

```bash
npm install
npm run dev:web      # apps/web on :3000
npm run dev:api      # apps/api
npm run dev:mobile   # apps/mobile (Expo)
```

`apps/treino` is a separate Next.js app (`cd apps/treino && npm run dev`, serves on :3010) and
`apps/opengym` runs via Docker Compose (`cd apps/opengym && docker compose up -d`) — neither is
part of the root `dev:*` scripts above.
