# Development Standards

## Coding Standards

- TypeScript uses strict mode, named exports, and workspace-level path aliases.
- Python uses typed FastAPI route handlers plus Pydantic request and response models.
- Shared contracts are updated before feature integration work.
- Generated artifacts stay generated; source edits happen in schemas, routes, and docs.

## Review Rules

- Architecture, state, API, and migration changes require explicit contract notes.
- Large tasks should be split into verifiable sub-steps with lint, test, build, and contract checks.
- No app-to-app imports. Shared logic belongs in `packages/` or backend services, not in the opposite app.

## Tooling

- `pnpm` manages all JavaScript and TypeScript packages.
- `uv` is the expected Python package manager for `apps/api`.
- `pre-commit` and GitHub Actions mirror the same quality gates.

