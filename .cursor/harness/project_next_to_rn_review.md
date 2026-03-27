# Project Next To RN Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Replace the previous `Next.js + FastAPI` starter with an `Expo / React Native` starter.
2. Keep the monorepo structure and quality gates required by the local AI engineering guide.
3. Move persistence to the frontend side:
   - one structured local database
   - one file-based local vault
4. Rework README, contracts, CI, coding standards, tests, and context docs around the RN baseline.

### Scope Out

1. Any backend service, API contract, or remote sync layer.
2. Real business data entry flows beyond storage bootstrap and architecture demonstration.
3. Cloud storage, auth, or deployment pipelines beyond the Expo/web export starter.

### Acceptance Table

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| Architecture initialization | Passed | `apps/mobile`, `packages/storage`, root configs | Old web/api baseline removed |
| Guide alignment | Passed with intentional override | README, ADR, AGENTS | Monorepo and contract-driven workflow kept; stack overridden by PRD |
| Coding standards and tests | Passed | ESLint, tests, CI, contract docs | Local storage contract covered |
| README clarity | Passed | `README.md` | Directory tree and startup commands updated |

## Testor Phase: Acceptance Conditions

### Requirement Understanding

- Test the new RN-first baseline, not the removed web/API baseline.
- Confirm the mobile app exposes the intended product direction and local storage architecture.
- Confirm structured storage and file-vault contracts are explicit, testable, and documented.

### Executable Acceptance Conditions

1. The repo exposes `apps/mobile` as the only app entry point.
2. `packages/storage` defines the structured database and file-vault contracts.
3. The mobile app can typecheck, test, and build with Expo Router.
4. Root tooling, CI, and README align to the RN/local-first architecture.

### Scenario Matrix

| Scenario | Expected result |
|---|---|
| Inspect repo tree | `apps/mobile`, `packages/storage`, docs, tests, and root rules exist |
| Read README | Startup, structure, and local persistence model are documented |
| Read storage contracts | SQLite tables and file-vault collections are explicit |
| Run tests | Mobile and contract tests pass |
| Run build | Expo web export succeeds |

### Smoke Path

1. Run `pnpm --filter @creator-cfo/mobile start`.
2. Open the app and confirm the dashboard renders modules, platforms, and local persistence cards.
3. Confirm the bootstrap status reports readiness.
4. Run `pnpm contract:check` to verify the storage contract package still passes.

## Testor Phase: Execution Report

### Coverage

- Static verification completed for repo shape, contracts, docs, CI, and rules.
- Runtime-oriented verification completed for lint, typecheck, unit tests, contract checks, and Expo web export.

### Result Summary

| Check | Result | Evidence |
|---|---|---|
| RN app entry exists | Passed | `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx` |
| Local storage contract exists | Passed | `packages/storage/src/contracts.ts`, `docs/contracts/local-storage.md` |
| Shared UI and schema packages align | Passed | `packages/ui`, `packages/schemas` |
| Root quality gates align | Passed | root `package.json`, `.pre-commit-config.yaml`, `.github/workflows/ci.yml` |
| Validation commands pass | Passed | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm contract:check`, `pnpm build` |

### Defects

- None blocking.
- Residual note: the Expo web export uses a contract-only storage preview while native devices perform the real SQLite and file-vault bootstrap.

## Harness Final Review

### Conclusion

Passed

### Blocker

- None.

### Major

- None.

### Minor

- Web preview does not execute native SQLite bootstrapping; it mirrors contract metadata for build-safe preview behavior.

### Verification Advice

1. Use Expo Go, iOS Simulator, or Android Emulator to observe the real native storage bootstrap.
2. Keep `packages/storage` and `docs/contracts/local-storage.md` updated together.
3. Reopen backend discussion only through a new PRD.

### Progress Table

| Item | Status | Evidence | Blockers | Notes |
|---|---|---|---|---|
| Architecture initialization | Passed | `apps/mobile`, `packages/storage`, root configs | None | Repo baseline is now RN-first |
| Guide alignment | Passed with PRD override | README, ADR, AGENTS | None | Monorepo and contract-driven method preserved |
| Coding standards and tests | Passed | lint, typecheck, tests, build, CI | None | Local-first checks are active |
| README clarity | Passed | `README.md` | None | Startup and directory layout updated |
