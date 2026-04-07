# Local Storage Contract

This document is the canonical local-storage contract for the current Expo, local-first runtime.

- Current implemented contract version: `4`
- Database file: `creator-cfo-local.db`
- Architecture phase: mobile-first, local-first, no standalone backend

## Runtime Baseline

The active runtime baseline is a hybrid `v4` contract:

- intake is optimized for sparse evidence capture
- the canonical persisted transaction surface is `records`
- Schedule C and Schedule SE previews remain supported
- extra information that cannot be derived from evidence must be supplied manually by the caller or user flow

Direct evidence capture is intentionally limited to:

- `date`
- `amount`
- `source`
- `target`
- `description`

Everything else must come from one of:

- durable manual user input
- deterministic derivation from stored records and scoped settings
- hook-level requirements surfaced to the caller when an explicit selection or review step is still needed

## SQLite Tables

The current contract creates these structured tables:

- `entities`
- `counterparties`
- `records`
- `record_entry_classifications`
- `tax_year_profiles`
- `evidences`
- `evidence_files`
- `record_evidence_links`

The `records` table is the canonical local-first finance record. It stores:

- identity and ownership: `record_id`, `entity_id`
- lifecycle: `record_status`, `source_system`
- sparse captured facts: `occurred_on`, `amount_cents`, `currency`, `description`, `source_label`, `target_label`
- resolved links and user-owned classification: `source_counterparty_id`, `target_counterparty_id`, `record_kind`, `category_code`, `subcategory_code`, `tax_category_code`, `tax_line_code`, `business_use_bps`
- timestamps: `created_at`, `updated_at`

The `evidences` table now tracks upload and parse lifecycle state in addition to sparse captured fields. It stores:

- identity and ownership: `evidence_id`, `entity_id`, `evidence_kind`
- local file tracking: `file_path`
- parse lifecycle: `parse_status` (`pending`, `parsed`, `failed`)
- extracted payload cache: `extracted_data` JSON
- sparse captured fields: `captured_date`, `captured_amount_cents`, `captured_source`, `captured_target`, `captured_description`
- timestamps and source: `source_system`, `created_at`

## Runtime Scope

This runtime baseline intentionally does not expose the older ledger-first or tax-registry surfaces as part of the active contract:

- no `accounts` table
- no `platform_accounts` table
- no `tax_line_definitions` or `tax_line_inputs`
- no dedicated posting-line SQL views
- no accounting reporting SQL views
- no registry-driven tax rollup views

The supported tax-query path reads directly from `records` plus `tax_year_profiles`.

## Storage Package

The active runtime now treats the previous vault root as the package root for both the SQLite database and evidence collections. The structured collections remain defined in `packages/storage/src/contracts.ts`.

- package root: `creator-cfo-vault/`
- active database file: `creator-cfo-vault/creator-cfo-local.db`
- evidence uploads: `creator-cfo-vault/evidence-objects/{entity_id}/uploads/{yyyy}/{mm}/{entity_id}_{timestamp}_{hash}.{ext}`
- evidence manifests: `creator-cfo-vault/evidence-manifests/{evidence_id}.json`

Expected upload-state rules:

- upload always ensures the default local entity `entity-main` exists before persistence
- upload writes new evidence into the active package root beside the active database file
- repeated uploads of the same binary are allowed; hash and size are indexed for lookup only and no longer enforced as a global uniqueness constraint
- newly ingested evidence starts at `parse_status = pending`
- parser success keeps the evidence in `pending` until the user confirms and persists a `record`
- confirmed evidence becomes `parse_status = parsed`
- parser failures become `parse_status = failed` and must remain retryable
- runtime readers resolve `evidence_files.relative_path` and `evidences.file_path` from the active package root, not from a detached global storage location
- runtime open/import fails closed when a tracked evidence path is absolute, escapes the package root, or points to a missing required file

Expected `extracted_data` JSON fields:

- `parser`: `openai_gpt` or `rule_fallback`
- `model`: parsed model identifier when remote GPT parsing succeeds
- `sourceLabel`: human-readable parse source
- `rawText`: normalized GPT/OCR text or fallback source text
- `rawSummary`: short parse summary for review UI
- `rawLines`: line-by-line OCR text or fallback tokens
- `warnings`: ambiguity, inference, or parse-quality warnings returned by the parser
- `fields`: structured fields for `date`, `amountCents`, `description`, `source`, `target`, `category`, `taxCategory`, `notes`
- `candidates`: structured candidates for `date`, `amountCents`, `description`, `source`, `target`, `category`, `taxCategory`, `notes`
- `errorReason` / `failureReason`: optional parse diagnostics

## Device State

The device-state contract is now at version `2`. In addition to theme, locale, and session, the app persists:

- `openai_api_key`: the user-provided OpenAI API key used only for outbound parse requests
- `vercel_api_base_url`: the deployed Vercel API base URL used by the mobile and web clients

Both values remain local to the device runtime and are not written into the SQLite business tables.

## Contract Source Of Truth

The implementation source of truth for this contract is:

- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`

Any future contract change must update this document and automated coverage together.
