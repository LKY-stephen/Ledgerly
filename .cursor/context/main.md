# Context Snapshot

## Version

- version: 0.5.0
- updated_at: 2026-04-07
- scope: see `0.5.0_context.md` for the planner-mediated upload workflow covering PDF parsing, workflow persistence, and approval-gated writes

## Active Decisions

- Monorepo remains the baseline.
- Frontend is now Expo + React Native + Expo Router.
- There is no backend in the current phase.
- Structured records live in SQLite; documents live in the local file vault.
- Theme, locale, and local session summary live in AsyncStorage under the storage contract.
- Source of truth is `packages/storage`, `packages/schemas`, `docs/contracts`, and root agent rules.
- iOS OCR is implemented as a local Expo Module backed by Apple Vision in development builds.
- Android and Web stay on fallback parsing for upload review.
- Upload review now persists explicit workflow state through upload batches, extraction runs, planner runs, candidate records, read tasks, and write proposals.
- Parser output is now a validated DTO snapshot; planner output is a validated DTO plus local enrichment, not an implicit records mapping.

## Implemented Structure

- `apps/mobile`: Expo Router app with login gate, animated svg tab icons, planner-mediated local upload review flows, SQLite-backed Home metrics, and stronger light-theme CTA/tab contrast.
- `packages/storage`: storage contract v5, path helpers, and contract tests.
- `packages/ui`: React Native presentation primitives.
- `packages/schemas`: creator product modules, platforms, workflow principles, strict parser DTOs, strict planner DTOs, and workflow enums.
- `modules/ios-ocr`: Apple Vision OCR bridge for iOS development builds.
- `docs/tax-parsing-logic.md`: tax parsing blueprint for 2025 `Form 1040`, `Schedule C`, `Schedule SE`, and `1099-NEC` handoff flows.
- `docs/upload-planner-workflow.md`: parser -> planner -> local validation -> approval-gated persistence workflow spec.

## Verification Snapshot

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm contract:check`
- `pnpm build`
- `pnpm smoke`

## Pending Follow-Ups

- Validate the iOS development build upload/OCR path on device and collect product evidence.
- Decide whether Apple sign-in should later sync to a backend account once a future PRD introduces one.
- Only reintroduce backend or sync infrastructure through a new PRD.
- Decide whether Android should later gain native OCR and whether Web should move beyond fallback runtime behavior.

## Maintenance

- This file is the **current** snapshot. When a feat closes, follow `.cursor/prd/agent-dev-guide-summary.md`: **create** `.cursor/context/{semver}_context.md` for that release; do not delete or rewrite existing `*_context.md` files.
- Update the **Version** block (and body as needed) to match the latest delivery, or note “see `{semver}_context.md`” for detail.
