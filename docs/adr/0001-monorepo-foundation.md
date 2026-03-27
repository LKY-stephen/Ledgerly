# ADR 0001: Monorepo Foundation

## Status

Accepted

## Context

The local AI engineering guide requires a monorepo that keeps product context, contract artifacts, tests, documentation, and agent rules in one workspace. The original default stack was web plus backend, but the updated PRD makes the current phase explicitly React Native and frontend-owned.

## Decision

Adopt a pnpm-based monorepo with:

- `apps/mobile` for the Expo / React Native application
- `packages/*` for reusable TypeScript packages
- `packages/storage` and `docs/contracts/` for local persistence contracts
- `.github/workflows/ci.yml` and `.pre-commit-config.yaml` for quality gates

## Consequences

- Shared abstractions live in `packages/`, not through direct app imports.
- Local contract checks become a first-class part of the change workflow.
- The repo can grow into sync, cloud backup, or backend services later without reorganizing the top-level structure.
