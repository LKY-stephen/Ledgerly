# Local Storage Contract

- Canonical status: implemented source of truth for monorepo local storage
- Current implemented contract version: `2`

This is the single canonical local-storage document for `creator_cfo_monorepo`.

Runtime code lives in:

- `packages/storage/src/contracts.ts`
- `apps/mobile/src/storage/bootstrap.native.ts`
- `apps/mobile/src/storage/bootstrap.web.ts`

## Contract Invariants

- The product remains mobile-first and local-first.
- There is no backend in this phase.
- The mobile app must bootstrap both SQLite and the file vault without any backend dependency.
- Storage-contract changes must update this document and at least one automated test.
- Shared helper APIs for storage setup should live in `@creator-cfo/storage`, not be rebuilt inside app screens.

## Structured Database

- Database name: `creator-cfo-local.db`
- Runtime contract version: `2`
- Bootstrap pragmas:
  - `PRAGMA journal_mode = WAL;`
  - `PRAGMA foreign_keys = ON;`

SQLite conventions:

- identifiers are `TEXT`
- money is stored as `INTEGER` minor units
- dates and timestamps are ISO-8601 `TEXT`
- booleans are `INTEGER` with `0` or `1`

Implemented tables:

- `entities`
- `accounts`
- `counterparties`
- `platform_accounts`
- `records`
- `evidences`
- `evidence_files`
- `record_evidence_links`

Implemented views:

- `record_double_entry_lines_v`
- `accounting_posting_lines_v`
- `income_snapshots_v`
- `invoice_records_v`
- `expense_records_v`

Implemented indexes:

- `accounts_entity_code_idx`
- `records_entity_recognition_idx`
- `records_status_due_idx`
- `records_platform_idx`
- `evidence_files_sha_idx`
- `record_evidence_primary_idx`

## Core Data Model

### `entities`

Legal owners or reporting units for local books.

### `accounts`

Chart-of-accounts rows used by derived accounting views and future reporting.

Reporting semantics:

- `account_type` is expected to use the reporting-safe set:
  - `asset`
  - `liability`
  - `equity`
  - `income`
  - `expense`
- `normal_balance` is expected to use:
  - `debit`
  - `credit`
- These semantics are what let the contract derive balance-sheet and profit/loss outputs from one posting surface without parsing account names.

### `counterparties`

Platforms, clients, vendors, banks, owners, and tax agencies tied to records.

### `platform_accounts`

Creator platform identities used for revenue and payout grouping.

### `records`

`records` is the operational source of truth.

It replaces the version-1 split across feature tables and stores:

- classification such as `record_kind`, `posting_pattern`, and `record_status`
- dimensions such as `counterparty_id` and `platform_account_id`
- dates such as `recognition_on`, `cash_on`, and `due_on`
- amount components such as gross, fees, withholding, adjustments, and net cash
- posting-account references for the derived double-entry view
- invoice and reversal linkage through `related_record_id` and `related_record_role`

Postable accounting statuses:

- `posted`
- `reconciled`

Records with other statuses can still exist operationally, but they are not part of the canonical accounting-reporting surface until they reach a postable status.

### `evidences`

Logical evidence documents such as receipts, bank statements, invoices, payout statements, or note bundles.

### `evidence_files`

Physical file metadata for canonical evidence objects stored in the local vault.

### `record_evidence_links`

Many-to-many record-to-evidence linkage is required.

Requirement:

- one evidence item may support many records
- one record may link to many evidence items

This supersedes the older monorepo assumption that one evidence belongs to exactly one record.

## Derived Views And Compatibility Projections

### `record_double_entry_lines_v`

This is the raw per-record posting expansion layer. It stays records-first and derives debit and credit lines from each record.

Supported posting patterns:

- `gross_to_net_income`
- `simple_expense`
- `asset_purchase`
- `transfer`
- `owner_contribution`
- `owner_draw`

Output columns include:

- `record_id`
- `line_no`
- `posting_on`
- `account_id`
- `account_role`
- `debit_amount_cents`
- `credit_amount_cents`
- `currency`
- `description`

### `accounting_posting_lines_v`

This is the canonical accounting-reporting surface for journal book, general ledger, balance sheet, and profit/loss derivation.

It extends `record_double_entry_lines_v` by:

- joining each posting line back to `records`
- joining account metadata from `accounts`
- filtering to postable accounting statuses:
  - `posted`
  - `reconciled`
- exposing deterministic reporting fields such as:
  - `entity_id`
  - `record_id`
  - `record_kind`
  - `posting_pattern`
  - `record_status`
  - `posting_on`
  - `line_no`
  - `account_id`
  - `account_code`
  - `account_name`
  - `account_type`
  - `normal_balance`
  - `statement_section`
  - `debit_amount_cents`
  - `credit_amount_cents`
  - `normalized_balance_delta_cents`

Derivation rules:

- Journal book:
  - filter `accounting_posting_lines_v` by period
  - order by `posting_on`, `record_id`, `line_no`
  - group lines by `record_id`
- General ledger:
  - filter the same view by account and period
  - order by `posting_on`, `record_id`, `line_no`
  - sum `normalized_balance_delta_cents` for account balances
- Balance sheet:
  - sum `normalized_balance_delta_cents` for `statement_section = 'balance_sheet'` as of the selected date
  - if books are unclosed, add current earnings derived from income and expense accounts into equity
- Profit and loss:
  - sum `normalized_balance_delta_cents` for `statement_section = 'profit_and_loss'` over the selected date range

### Compatibility views

The old version-1 feature tables are replaced by compatibility views rather than staying primary storage:

- `income_snapshots_v`
- `invoice_records_v`
- `expense_records_v`

## File Vault

- Root directory: `creator-cfo-vault`

## Device State Store

- Storage engine: `AsyncStorage`
- Namespace: `@creator-cfo/mobile`
- Current contract version: `1`
- Records:
  - `theme_preference`: `"system" | "light" | "dark"`
  - `locale_preference`: `"system" | "en" | "zh-CN"`
  - `auth_session`: `{ kind: "guest" | "apple"; appleUserId?: string; email?: string | null; displayName?: string | null }`

## Invariants

- The mobile app must be able to bootstrap both the database and the vault without any backend dependency.
- Theme, locale, and login session state remain device-local and must be represented in the storage contract before UI flows persist them.
- Contract updates require a matching test update in `packages/storage/tests/`.
- Any migration that changes table shape or vault conventions must update this document in the same change.
Implemented collections:

- `evidence-objects`
- `evidence-manifests`
- `evidence-derived`
- `invoice-exports`
- `tax-support`

Canonical layout:

```text
creator-cfo-vault/
  evidence-objects/
    ab/
      cd/
        <sha256>.<ext>
  evidence-manifests/
    <evidence-id>.json
  evidence-derived/
    <evidence-id>/
      preview-1.jpg
  invoice-exports/
    2026/
      <record-id>.pdf
  tax-support/
    2026-q1/
      evidence-package.zip
```

Why the vault changed:

- canonical evidence binaries should be stored once by content hash
- document kind belongs in SQLite metadata, not folder naming
- shared evidence should not be duplicated across record folders
- generated exports should remain separate from canonical evidence objects

## Helper APIs

`@creator-cfo/storage` exports helper functions for components and services to consume directly.

Primary helpers:

- `getLocalStorageBootstrapPlan()`
  - exposes database name, version, pragmas, schema statements, table/view metadata, and vault metadata
- `getLocalStorageOverview()`
  - exposes counts for tables, views, indexes, and vault collections
- `createLocalStorageBootstrapManifest()`
  - generates a JSON-friendly manifest of schema objects and collection sample paths
- `accountingPostableRecordStatuses`
- `accountingReportAccountTypes`
- `accountingStatementSectionsByAccountType`
- `LocalStorageBootstrapPlan`
- `LocalStorageBootstrapManifest`
- `buildEvidenceObjectPath()`
- `buildEvidenceManifestPath()`
- `buildEvidenceDerivedPath()`
- `buildInvoiceExportPath()`
- `buildTaxSupportPath()`

Supporting helpers:

- `buildVaultRelativePath()`
- `sanitizeVaultFileName()`
- `sanitizeVaultPathSegment()`
- `buildDeviceStateStorageKey()`

These helpers are the preferred way for app code to consume storage setup metadata.

## Migration Notes From Version 1

Version `1` previously used:

- `income_snapshots`
- `invoice_records`
- `expense_records`
- `tax_forecasts`
- `cash_flow_snapshots`
- `receipts`
- `statements`

Version `2` replaces those primary shapes with:

- one canonical `records` table
- shared evidence metadata and file linkage
- derived compatibility views and exports
- evidence-centric vault storage

The runtime contract is now version `2`. Future data-migration work can decide whether any legacy version-1 tables need explicit cleanup for upgraded local databases.

This reporting-contract hardening keeps version `2` because it adds an accounting-reporting view and explicit semantics on top of the existing records-first schema without changing table or vault shapes.
