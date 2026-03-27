# Development Standards

## Coding Standards

- TypeScript uses strict mode, named exports, and workspace-level path aliases.
- React Native screens stay thin; persistence and domain rules belong in shared packages or storage services.
- Shared storage contracts are updated before feature integration work.
- Native storage calls should be isolated behind app-level services so contracts stay testable.

## Review Rules

- Architecture, state, and storage migration changes require explicit contract notes.
- Large tasks should be split into verifiable sub-steps with lint, test, build, and contract checks.
- No app-to-app imports. Shared logic belongs in `packages/`, not inside screen files.

## Tooling

- `pnpm` manages all JavaScript and TypeScript packages.
- Expo is the mobile framework baseline for this phase.
- `pre-commit` and GitHub Actions mirror the same quality gates.
