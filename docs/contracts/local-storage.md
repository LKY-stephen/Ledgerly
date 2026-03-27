# Local Storage Contract

## Structured Database

- Database name: `creator-cfo-local.db`
- Current contract version: `1`
- Tables:
  - `income_snapshots`
  - `invoice_records`
  - `expense_records`
  - `tax_forecasts`
  - `cash_flow_snapshots`

## File Vault

- Root directory: `creator-cfo-vault`
- Collections:
  - `receipts`
  - `invoice_exports`
  - `statements`
  - `tax_support`

## Invariants

- The mobile app must be able to bootstrap both the database and the vault without any backend dependency.
- Contract updates require a matching test update in `packages/storage/tests/`.
- Any migration that changes table shape or vault conventions must update this document in the same change.
