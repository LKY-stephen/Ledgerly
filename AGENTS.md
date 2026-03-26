# Source Of Truth

- `openapi/openapi.yaml`
- `docs/contracts/`
- `apps/api/src/creator_cfo_api/schemas/`
- `apps/api/migrations/` once database migrations are introduced
- `.cursor/context/main.md`

# Rules

- Keep the repository schema-first: update the OpenAPI contract before frontend integration changes.
- Do not import across app layers directly. `apps/*` may depend on `packages/*`, but apps must not import each other.
- Never hand-edit generated SDK files under `packages/sdk/generated/`.
- Every new domain flow must include one automated test and one smoke-path update.

# Required Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `python3 -m uv run --directory apps/api python scripts/export_openapi.py --check`
