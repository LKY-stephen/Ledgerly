# Testing Strategy

## Automated Checks

- Frontend unit tests: `pnpm --filter @creator-cfo/web test`
- Frontend lint and type checks: `pnpm lint`, `pnpm typecheck`
- Backend unit tests: `python3 -m uv run --directory apps/api pytest`
- Contract consistency: `python3 -m uv run --directory apps/api python scripts/export_openapi.py --check`

## Smoke Path

1. Start the API and verify `GET /api/v1/health` returns `{"status":"ok"}`.
2. Open the web app and confirm the landing page lists the supported creator platforms and operating modules.
3. Confirm the API bootstrap summary matches the domains shown by the web app and `packages/schemas`.

## Coverage Expectations

- Every new API route should have at least one success-path test and one failure-path or boundary assertion.
- Shared package changes should be covered by lightweight unit tests before UI integration grows.
- Contract updates must land together with the route implementation or an explicit follow-up note in the PRD review.
