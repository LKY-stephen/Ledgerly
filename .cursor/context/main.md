# Context Snapshot

## Version

- version: 0.1.0
- updated_at: 2026-03-26
- scope: project initialization foundation

## Active Decisions

- Monorepo is the required baseline.
- Frontend stack is Next.js App Router with TypeScript.
- Backend stack is FastAPI with Pydantic settings and OpenAPI output.
- Shared repository truth lives in `openapi/`, `docs/`, `tests/`, and root agent rules.
- `packages/sdk` is reserved for generated clients and should not be edited by hand.

## Implemented Structure

- `apps/web`: starter landing page, shared workspace package consumption, Vitest starter test.
- `apps/api`: health endpoint, bootstrap summary endpoint, pytest starter tests, OpenAPI export script.
- `packages/ui`: presentation primitives for the web app.
- `packages/schemas`: shared domain constants for creator modules and platforms.
- `packages/sdk`: placeholder for generated API clients.

## Pending Follow-Ups

- Add migrations, auth, and generated SDK workflow when the first business slice is defined.
- Decide whether to keep using `python3 -m uv` or add the user-installed `uv` binary to `PATH`.

## Verification Snapshot

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `python3 -m compileall apps/api/src apps/api/scripts`
- `python3 -m uv sync --directory apps/api`
- `python3 -m uv run --directory apps/api ruff check .`
- `python3 -m uv run --directory apps/api pytest`
- `python3 -m uv run --directory apps/api python scripts/export_openapi.py --check`

## Collaboration Note

- Follow `.cursor/rules/work_flow.md` with separate planning, execution, and evaluation roles for multi-module work.
