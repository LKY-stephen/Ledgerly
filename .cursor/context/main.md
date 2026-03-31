# Context Snapshot

## Version

- version: 0.3.5
- updated_at: 2026-03-31
- scope: see `0.3.5_context.md` for the documentation-only 2025 tax parsing blueprint covering Form 1040, Schedule C, and Schedule SE

## Active Decisions

- Monorepo remains the baseline.
- Frontend is now Expo + React Native + Expo Router.
- There is no backend in the current phase.
- Structured records live in SQLite; documents live in the local file vault.
- Theme, locale, and local session summary live in AsyncStorage under the storage contract.
- Source of truth is `packages/storage`, `packages/schemas`, `docs/contracts`, and root agent rules.

## Implemented Structure

- `apps/mobile`: Expo Router app with login gate, animated svg tab icons, theme and locale switching, icon-led home metrics, a local-first Discover news feed, and stronger light-theme CTA/tab contrast.
- `packages/storage`: storage contracts, path helpers, and contract tests.
- `packages/ui`: React Native presentation primitives.
- `packages/schemas`: creator product modules, platforms, and workflow principles.
- `docs/tax-parsing-logic.md`: tax parsing blueprint for 2025 `Form 1040`, `Schedule C`, `Schedule SE`, and `1099-NEC` handoff flows.

## Verification Snapshot

- Latest automated code verification remains the `0.3.4` snapshot because `0.3.5` only adds documentation.
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm contract:check`
- `pnpm build`
- `pnpm smoke`

## Pending Follow-Ups

- Add deeper feature slices on top of the local SQLite and file-vault contracts inside Ledger beyond the current Discover news feed.
- Decide whether Apple sign-in should later sync to a backend account once a future PRD introduces one.
- Only reintroduce backend or sync infrastructure through a new PRD.
- Implement the next tax parsing slice by adding versioned template assets and validation rules for `Form 1040`, `Schedule 1`, `Schedule 2`, and `Schedule SE`.

## Maintenance

- This file is the **current** snapshot. When a feat closes, follow `.cursor/prd/agent-dev-guide-summary.md`: **create** `.cursor/context/{semver}_context.md` (for example `0.4.0_context.md`) for that release; do not delete or rewrite existing `*_context.md` files.
- Update the **Version** block (and body as needed) to match the latest delivery, or note “see `{semver}_context.md`” for detail.
