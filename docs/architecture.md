# Architecture Overview

## Product Direction

The repository is prepared for a creator finance platform that will unify income aggregation, invoicing, cost tracking, tax estimation, cash-flow visibility, and stablecoin settlement workflows.

## Top-Level Design

- `apps/mobile`: Expo Router entry point for the React Native application.
- `packages/ui`: Shared presentation primitives for React Native screens.
- `packages/schemas`: Shared creator-finance domain constants and lightweight TS types.
- `packages/storage`: Local database and document-vault contracts used by the mobile app.
- `tests`: Cross-app smoke guidance and future end-to-end suites.
- `docs`: ADRs, contracts, engineering rules, and test strategy.

## Boundary Rules

- There is no backend in this phase. Core product data lives in on-device SQLite tables plus document-vault directories.
- `apps/mobile` consumes shared packages only.
- Shared packages cannot depend on app-specific implementation code.
- Cross-cutting quality rules live at the repo root so agents and CI evaluate the same truth.

## Expansion Plan

1. Add richer finance entities and local migration steps in `packages/storage`.
2. Introduce sync adapters only after the product needs remote collaboration or backup.
3. Expand smoke or end-to-end automation under `tests/` as soon as authenticated flows are available.
