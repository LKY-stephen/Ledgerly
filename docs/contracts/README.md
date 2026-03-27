# Contracts

This phase has no backend API contract. The source of truth for persistence is local-first:

- `packages/storage/src/contracts.ts` for SQLite tables, migration SQL, and file-vault collections
- `packages/schemas/src/index.ts` for creator-domain constants surfaced in the app

When new product flows are added, document:

1. The observable local data shape or vault convention.
2. State invariants or migration implications.
3. The matching test coverage that proves the behavior.
