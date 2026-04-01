# Local Storage Contract

This document is the canonical local-storage contract for the current Expo, local-first runtime.

- Current implemented contract version: `1`
- Database file: `creator-cfo-local.db`
- Architecture phase: mobile-first, local-first, no standalone backend

## Runtime Baseline

The active runtime baseline is a hybrid `v1` contract:

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

## Contract Source Of Truth

The implementation source of truth for this contract is:

- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`

Any future contract change must update this document and automated coverage together.
