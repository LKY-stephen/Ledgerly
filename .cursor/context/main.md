# Context Snapshot

## Version

- version: 0.3.2
- updated_at: 2026-03-27
- scope: mobile shell now adds svg tab icons, subtle tab motion, and icon-led home metrics on top of the current login flow

## Active Decisions

- Monorepo remains the baseline.
- Frontend is now Expo + React Native + Expo Router.
- There is no backend in the current phase.
- Structured records live in SQLite; documents live in the local file vault.
- Theme, locale, and local session summary live in AsyncStorage under the storage contract.
- Source of truth is `packages/storage`, `packages/schemas`, `docs/contracts`, and root agent rules.

## Implemented Structure

- `apps/mobile`: Expo Router app with login gate, animated svg tab icons, theme and locale switching, and icon-led home metrics backed by local bootstrap status.
- `packages/storage`: storage contracts, path helpers, and contract tests.
- `packages/ui`: React Native presentation primitives.
- `packages/schemas`: creator product modules, platforms, and workflow principles.

## Verification Snapshot

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm contract:check`
- `pnpm build`
- `pnpm smoke`

## Pending Follow-Ups

- Add real feature slices on top of the local SQLite and file-vault contracts inside Ledger and Discover.
- Decide whether Apple sign-in should later sync to a backend account once a future PRD introduces one.
- Only reintroduce backend or sync infrastructure through a new PRD.

## Maintenance

- This file is the **current** snapshot. When a feat closes, follow `.cursor/prd/agent-dev-guide-summary.md`: **create** `.cursor/context/{semver}_context.md` (for example `0.4.0_context.md`) for that release; do not delete or rewrite existing `*_context.md` files.
- Update the **Version** block (and body as needed) to match the latest delivery, or note “see `{semver}_context.md`” for detail.
