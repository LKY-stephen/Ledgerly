# Creator CFO Monorepo

Creator CFO is a monorepo foundation for a unified finance console aimed at creators who operate across multiple revenue platforms. The initial architecture follows the local `Ai Agent friendly development guide`: Next.js App Router for the web app, FastAPI for the API, OpenAPI as the contract layer, and a repository layout that keeps product context, tests, and docs in one workspace.

## Stack

- Frontend: Next.js App Router + TypeScript + workspace UI package
- Backend: FastAPI + Pydantic v2 style schemas
- Repo: pnpm workspace monorepo
- Contract: `openapi/openapi.yaml`
- Quality gates: pre-commit, GitHub Actions, unit tests, smoke checklist, contract check

## Quick Start

### Frontend

```bash
pnpm install
pnpm --filter @creator-cfo/web dev
```

### Backend

```bash
pip install uv
python3 -m uv sync --directory apps/api
python3 -m uv run --directory apps/api uvicorn creator_cfo_api.main:app --reload
```

### Shared Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python3 -m uv run --directory apps/api python scripts/export_openapi.py --check
```

## Directory Layout

```text
.
|-- AGENTS.md
|-- CLAUDE.md
|-- README.md
|-- apps
|   |-- api
|   |   |-- pyproject.toml
|   |   |-- scripts
|   |   |   `-- export_openapi.py
|   |   |-- src/creator_cfo_api
|   |   |   |-- app.py
|   |   |   |-- config.py
|   |   |   |-- main.py
|   |   |   |-- routes
|   |   |   |   |-- bootstrap.py
|   |   |   |   `-- health.py
|   |   |   `-- schemas
|   |   |       |-- bootstrap.py
|   |   |       `-- health.py
|   |   `-- tests
|   |       |-- test_bootstrap.py
|   |       `-- test_health.py
|   `-- web
|       |-- app
|       |   |-- globals.css
|       |   |-- layout.tsx
|       |   `-- page.tsx
|       |-- src/lib
|       |   |-- platforms.ts
|       |   `-- site.ts
|       `-- tests
|           `-- site.test.ts
|-- docs
|   |-- adr/0001-monorepo-foundation.md
|   |-- architecture.md
|   |-- contracts
|   |   `-- README.md
|   |-- development.md
|   `-- testing.md
|-- openapi
|   `-- openapi.yaml
|-- packages
|   |-- schemas
|   |   |-- package.json
|   |   |-- README.md
|   |   `-- src/index.ts
|   |-- sdk
|   |   |-- package.json
|   |   |-- README.md
|   |   `-- src/index.ts
|   `-- ui
|       |-- package.json
|       |-- README.md
|       `-- src
|           |-- index.ts
|           |-- section-card.tsx
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

- Keep contracts in `openapi/` and companion notes in `docs/contracts/`.
- Route new domain features through the three-role workflow documented in `.cursor/rules/work_flow.md`.
- Use `packages/ui` and `packages/schemas` as the only shared frontend-facing layers; apps stay isolated.
- Reserve `packages/sdk` for generated API clients.

## What Is Implemented In This Initialization

- A branded web landing page that mirrors the product direction.
- A FastAPI service with `health` and bootstrap-summary endpoints.
- Contract scaffolding, testing guidance, CI workflow, and agent-facing project rules.
- A versioned context update in `.cursor/context/main.md` so later sessions can pick up the same architecture baseline.
