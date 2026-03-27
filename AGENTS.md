# Source Of Truth

- `docs/contracts/`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`
- `.cursor/context/main.md`（当前快照）
- `.cursor/context/{semver}_context.md`（按版本归档；每版需求闭环 **新建**，勿删、勿改写既有文件）

# Rules

- This phase is mobile-first and local-first: there is no backend until a later PRD explicitly adds one.
- Keep the storage schema-first: update the local data and file-vault contracts before feature integration changes.
- Do not import across app layers directly. `apps/*` may depend on `packages/*`, but apps must not import each other.
- Every storage contract change must update `docs/contracts/` and at least one automated test.
- Every new domain flow must include one automated test and one smoke-path update.

# Required Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contract:check`
- `pnpm smoke` (Turbo smoke after build; see `tests/smoke/README.md` for manual device steps)
