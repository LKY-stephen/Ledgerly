# Local Storage Contract

This document is the canonical local-storage contract for the current Expo, local-first runtime.

- Current implemented contract version: `3`
- Database file: `creator-cfo-local.db`
- Architecture phase: mobile-first, local-first, no standalone backend

## Runtime Baseline

The active runtime baseline is a hybrid `v3` contract:

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

## File Vault

The contract still uses the local file vault for evidence and exports. The structured collections remain defined in `packages/storage/src/contracts.ts`.

Uploaded evidence binaries are normalized into the local vault root:

- root: `creator-cfo-vault/`
- evidence uploads: `creator-cfo-vault/evidence-objects/{entity_id}/uploads/{yyyy}/{mm}/{entity_id}_{timestamp}_{hash}.{ext}`
- evidence manifests: `creator-cfo-vault/evidence-manifests/{evidence_id}.json`

Expected upload-state rules:

- upload always ensures the default local entity `entity-main` exists before persistence
- repeated uploads of the same binary are allowed; hash and size are indexed for lookup only and no longer enforced as a global uniqueness constraint
- newly ingested evidence starts at `parse_status = pending`
- parser success keeps the evidence in `pending` until the user confirms and persists a `record`
- confirmed evidence becomes `parse_status = parsed`
- parser failures become `parse_status = failed` and must remain retryable

Expected `extracted_data` JSON fields:

- `parser`: `ios_vision_ocr` or `rule_fallback`
- `sourceLabel`: human-readable parse source
- `rawText`: normalized OCR text or fallback source text
- `rawLines`: line-by-line OCR text or fallback tokens
- `candidates`: structured candidates for `date`, `amountCents`, `description`, `source`, `target`, `category`, `taxCategory`, `notes`
- `errorReason` / `failureReason`: optional parse diagnostics

## Contract Source Of Truth

The implementation source of truth for this contract is:

- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`

Any future contract change must update this document and automated coverage together.
