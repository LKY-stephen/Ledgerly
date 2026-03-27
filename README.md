# Creator CFO Monorepo

Creator CFO is now a mobile-first monorepo foundation for a unified finance console aimed at creators who operate across multiple revenue platforms. The original local guide defaults to `Next.js + FastAPI`, but this PRD explicitly overrides that baseline: the current phase is `Expo / React Native`, front-end owned local persistence, and no backend for now.

## Stack

- Frontend: Expo + React Native + Expo Router + TypeScript
- Local persistence: Expo SQLite for structured finance data, Expo File System for document vault storage
- Repo: pnpm workspace monorepo
- Contract: `packages/storage/src/contracts.ts` and `docs/contracts/local-storage.md`
- Quality gates: pre-commit, GitHub Actions, unit tests, smoke checklist, contract check

## Quick Start

### Mobile App

```bash
pnpm install
pnpm --filter @creator-cfo/mobile start
pnpm --filter @creator-cfo/mobile ios
pnpm --filter @creator-cfo/mobile android
pnpm --filter @creator-cfo/mobile web
```

### Shared Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
```

## Directory Layout

```text
.
|-- AGENTS.md
|-- CLAUDE.md
|-- README.md
|-- apps
|   `-- mobile
|       |-- app
|       |   |-- _layout.tsx
|       |   `-- index.tsx
|       |-- src
|       |   |-- features/home
|       |   |   |-- home-screen.tsx
|       |   |   `-- sections.ts
|       |   `-- storage
|       |       |-- bootstrap.ts
|       |       `-- status.ts
|       `-- tests
|           `-- sections.test.ts
|-- docs
|   |-- adr/0001-monorepo-foundation.md
|   |-- architecture.md
|   |-- contracts
|   |   `-- README.md
|   |-- development.md
|   `-- testing.md
|-- packages
|   |-- schemas
|   |   |-- package.json
|   |   |-- README.md
|   |   `-- src/index.ts
|   |-- storage
|   |   |-- package.json
|   |   |-- README.md
|   |   |-- src
|   |   |   |-- contracts.ts
|   |   |   `-- index.ts
|   |   `-- tests
|   |       `-- contracts.test.ts
|   `-- ui
|       |-- package.json
|       |-- README.md
|       `-- src
|           |-- index.ts
|           |-- section-card.tsx
|           |-- stat-pill.tsx
|           `-- tokens.ts
|-- tests
|   |-- README.md
|   `-- smoke/README.md
|-- .github/workflows/ci.yml
|-- .pre-commit-config.yaml
|-- eslint.config.mjs
|-- package.json
|-- pnpm-workspace.yaml
|-- tsconfig.base.json
`-- turbo.json
```

## Working Agreements

- Keep storage contracts in `packages/storage` and companion notes in `docs/contracts/`.
- Route new domain features through the three-role workflow documented in `.cursor/rules/work_flow.md`.
- Use `packages/ui`, `packages/schemas`, and `packages/storage` as the shared mobile-facing layers; apps stay isolated.
- Do not introduce a backend or cloud dependency until a later PRD explicitly reopens that scope.

## Local Data Direction

- Structured database: `expo-sqlite` stores creator finance records such as income snapshots, invoices, expenses, tax forecasts, and cash-flow snapshots.
- File vault: `expo-file-system` stores receipts, invoice exports, statements, and tax support files directly on device.
- Contracts: storage tables, migration SQL, and vault directory rules are versioned inside the repo and covered by tests.

## What Is Implemented In This Adjustment

- An Expo Router mobile shell with a dashboard that reflects the product direction.
- A local storage bootstrap path that provisions SQLite tables and document-vault directories on device.
- Shared schema, UI, and storage packages aligned to a mobile-first monorepo.
- Updated CI, pre-commit hooks, contract docs, and context tracking for the RN baseline.
