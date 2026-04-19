# Database Schema Summary

This folder is the version-managed entrypoint for database schema design summaries in `Ledgerly/prd/`.

It is a derived planning artifact, not the runtime source of truth.

Runtime truth still lives in:

- `docs/contracts/local-storage.md`
- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`

Governing workflow and authoring guidance still live in:

- `.cursor/rules/work_flow.md`
- `.cursor/prd/agent-dev-guide-summary.md`
- `.cursor/prd/Ai Agent 友好型 开发指南.pdf`

Relevant project-local skills live in:

- `.cursor/skills/project/expo/SKILL.md` as the default mobile skill
- `.cursor/skills/project/create-expo-stack/SKILL.md` and `.cursor/skills/project/ignite/SKILL.md` only when a PRD explicitly needs them

## Current Version

- Current intended baseline: `v1`
- Current summary file: `v1.md`
- Runtime contract reference: the repository currently implements the hybrid sparse-input runtime baseline documented as version `1`

## Version Policy

- Add a new version file instead of overwriting old versions.
- Keep this `README.md` updated so future readers can find the current version immediately.
- Treat each version file as a design snapshot for a specific product baseline.
- If the runtime contract evolves independently, record that difference explicitly instead of silently rewriting older design baselines.

## Update Checklist

Before publishing a new version, re-check:

- `docs/contracts/local-storage.md`
- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`
- `.cursor/prd/agent-dev-guide-summary.md`
- `.cursor/rules/work_flow.md`
- the canonical PDF path `.cursor/prd/Ai Agent 友好型 开发指南.pdf`
- the relevant project-local skills under `.cursor/skills/`

## Version History

- `v1.md`: intended first-version baseline optimized for sparse evidence capture and manual-plus-derived completion
