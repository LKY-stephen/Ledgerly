# Context Snapshot

## Version

- version: 0.7.0
- updated_at: 2026-04-23
- scope: see `0.7.0_context.md` for the AI-provider middleware documentation-alignment slice covering env-backed provider docs, separate assistant vs parse/planner consumers, and hidden Google OAuth in the current public architecture story

## Active Decisions

- Monorepo remains the baseline.
- Frontend is now Expo + React Native + Expo Router.
- There is no backend in the current phase.
- Structured records live in SQLite; documents live in the local file vault.
- Theme, locale, and local session summary live in AsyncStorage under the storage contract.
- Source of truth is `packages/storage`, `packages/schemas`, `docs/contracts`, and root agent rules.
- Current/public AI-provider docs treat `ai_provider` as an env-backed middleware concept rather than a persisted runtime selector.
- Assistant chat and parse/planner are documented as separate consumers of that middleware.
- Google OAuth remains hidden from the current/public AI-provider architecture path.
- Upload review now persists explicit workflow state through upload batches, extraction runs, planner runs, candidate records, read tasks, and write proposals.
- Parser output is now a validated DTO snapshot; planner output is a validated DTO plus local enrichment, not an implicit records mapping.
- Home now includes a local-first AI assistant entry point that can answer against the local ledger and create records through shared package tools.

## Implemented Structure

- `apps/mobile`: Expo Router app with login gate, animated svg tab icons, planner-mediated local upload review flows, SQLite-backed Home metrics, stronger light-theme CTA/tab contrast, and a configurable home assistant panel.
- `packages/storage`: storage contract v6, path helpers, and contract tests.
- `packages/ui`: React Native presentation primitives.
- `packages/schemas`: creator product modules, platforms, workflow principles, strict parser DTOs, strict planner DTOs, and workflow enums.
- `packages/sdk`: shared CRUD and context helpers for local ledger access from product UI and the assistant.
- `packages/agent`: tool-call based assistant session logic for local bookkeeping chat flows.
- `docs/tax-parsing-logic.md`: tax parsing blueprint for 2025 `Form 1040`, `Schedule C`, `Schedule SE`, and `1099-NEC` handoff flows.
- `docs/upload-planner-workflow.md`: parser -> planner -> local validation -> approval-gated persistence workflow spec.
- `docs/architecture.md`: current/public AI-provider docs now describe env-backed middleware plus separate assistant vs parse/planner consumers.
- `docs/testing.md` and `tests/smoke/README.md`: env-based verification path for assistant and upload middleware consumers.

## Verification Snapshot

- `0.6.0_context.md` remains the last runtime slice with full build/test verification evidence.
- `0.7.0_context.md` is a docs/context alignment slice verified by targeted source review plus `pnpm contract:check`.

## Pending Follow-Ups

- Validate the iOS development build upload/OCR path on device and collect product evidence.
- Decide whether Apple sign-in should later sync to a backend account once a future PRD introduces one.
- Only reintroduce backend or sync infrastructure through a new PRD.
- Decide whether Android should later gain native OCR and whether Web should move beyond fallback runtime behavior.
- Decide whether runtime code should later be refactored so the implementation fully matches the published env-backed `ai_provider` middleware story.
- Decide whether Google OAuth should later become part of the public AI-provider contract instead of staying hidden.

## Maintenance

- This file is the **current** snapshot. When a feat closes, follow `.cursor/prd/agent-dev-guide-summary.md`: **create** `.cursor/context/{semver}_context.md` for that release; do not delete or rewrite existing `*_context.md` files.
- Update the **Version** block (and body as needed) to match the latest delivery, or note “see `{semver}_context.md`” for detail.
