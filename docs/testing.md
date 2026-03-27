# Testing Strategy

## Automated Checks

- Mobile and shared-package unit tests: `pnpm test`
- Mobile lint and type checks: `pnpm lint`, `pnpm typecheck`
- Contract consistency: `pnpm contract:check`
- Build validation: `pnpm build`

## Smoke Path

1. Start the Expo app and confirm the dashboard renders product modules, supported platforms, and local storage architecture cards.
2. Verify the local bootstrap reports SQLite and file-vault readiness without a backend.
3. Confirm the storage contract package matches the sections shown by the mobile app.

## Coverage Expectations

- Every storage contract change should have at least one success-path test and one invariant assertion.
- Shared package changes should be covered by lightweight unit tests before UI integration grows.
- Contract updates must land together with the mobile implementation or an explicit follow-up note in the PRD review.
