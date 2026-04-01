# Contracts

This phase has no backend API contract. The source of truth for persistence is local-first:

- `packages/storage/src/contracts.ts` for SQLite tables, migration SQL, file-vault collections, and persisted device-state keys
- `docs/contracts/local-storage.md` as the single canonical local-storage contract document
- `packages/schemas/src/index.ts` for creator-domain constants surfaced in the app

When new product flows are added, document:

1. The observable local data shape or vault convention.
2. Any persisted device preference or local session summary.
3. State invariants or migration implications.
4. The matching test coverage that proves the behavior.
