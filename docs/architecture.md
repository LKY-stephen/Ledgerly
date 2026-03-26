# Architecture Overview

## Product Direction

The repository is prepared for a creator finance platform that will unify income aggregation, invoicing, cost tracking, tax estimation, cash-flow visibility, and stablecoin settlement workflows.

## Top-Level Design

- `apps/web`: Next.js App Router entry point for the operator console.
- `apps/api`: FastAPI service that owns HTTP contracts and domain orchestration.
- `packages/ui`: Shared presentation primitives for the web surface.
- `packages/schemas`: Shared frontend-safe domain constants and lightweight TS types.
- `packages/sdk`: Generated API client target.
- `openapi`: API contract snapshot used by frontend and CI checks.
- `tests`: Cross-app smoke guidance and future end-to-end suites.
- `docs`: ADRs, contracts, engineering rules, and test strategy.

## Boundary Rules

- Contracts flow from `apps/api` schemas into `openapi/openapi.yaml`.
- `apps/web` consumes shared packages and generated clients only.
- Shared packages cannot depend on app-specific implementation code.
- Cross-cutting quality rules live at the repo root so agents and CI evaluate the same truth.

## Expansion Plan

1. Add database models and migrations inside `apps/api` when finance entities are defined.
2. Generate `packages/sdk` from the OpenAPI contract after the first user-facing API lands.
3. Introduce smoke or end-to-end automation under `tests/` as soon as authenticated flows are available.

