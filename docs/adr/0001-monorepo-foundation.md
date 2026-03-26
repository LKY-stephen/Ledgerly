# ADR 0001: Monorepo Foundation

## Status

Accepted

## Context

The local AI engineering guide requires a monorepo that keeps frontend, backend, contract, test, documentation, and agent rules in one workspace. The goal is to prevent context drift and make AI-assisted delivery verifiable.

## Decision

Adopt a pnpm-based monorepo with:

- `apps/web` for the Next.js App Router application
- `apps/api` for the FastAPI service
- `packages/*` for reusable TypeScript packages
- `openapi/` for the shared contract snapshot
- `.github/workflows/ci.yml` and `.pre-commit-config.yaml` for quality gates

## Consequences

- Shared abstractions live in `packages/`, not through direct app imports.
- Contract checks become a first-class part of the change workflow.
- The repo can grow into database migrations, generated SDKs, and smoke suites without reorganizing the top-level structure.

