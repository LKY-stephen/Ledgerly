# GnuCash Capabilities Not Yet Supported By Ledgerly Storage

- Request ID: `20260424-103732-formalize-sdk-interface`
- Captured on: `2026-04-24` (JST)
- Intended repo publication: `Ledgerly/docs/gnucash-storage-capability-gaps.md`

## Purpose

This document isolates the capabilities GnuCash supports while the current Ledgerly storage/runtime does not yet support.

It is intentionally narrower than the full SDK gap analysis:

- it does not cover SDK formalization gaps for storage features that Ledgerly already has
- it focuses on capabilities where Ledgerly storage is still `No`
- it keeps the current Ledgerly phase explicit so missing storage features are not confused with immediate roadmap commitments

## Source Of Truth

### Ledgerly storage truth

- `Ledgerly/packages/storage/src/contracts.ts`
- `Ledgerly/packages/storage/src/database.ts`
- `Ledgerly/packages/storage/src/record-entry.ts`
- `Ledgerly/packages/storage/src/reporting-queries.ts`
- `Ledgerly/packages/storage/src/tax-helper.ts`
- `Ledgerly/packages/storage/src/tax-queries.ts`
- `Ledgerly/packages/storage/src/schedule-c.ts`
- `Ledgerly/packages/storage/src/schedule-se.ts`
- `Ledgerly/docs/contracts/local-storage.md`

### Official GnuCash GitHub sources

- [GnuCash repository root](https://github.com/Gnucash/gnucash) - captured `2026-04-24`
- [GnuCash engine directory](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) - captured `2026-04-24`
- [GnuCash CSV import directory](https://github.com/Gnucash/gnucash/tree/stable/gnucash/import-export/csv-imp) - captured `2026-04-24`
- [GnuCash gnome-utils directory](https://github.com/Gnucash/gnucash/tree/stable/gnucash/gnome-utils) - captured `2026-04-24`
- [GnuCash releases](https://github.com/Gnucash/gnucash/releases) - captured `2026-04-24`

Inference note:
Several GnuCash capability labels below are inferred from official GitHub repository structure, engine object names, import/export module paths, and release-note evidence from the sources above.

## Active Ledgerly Baseline

The current Ledgerly runtime is:

- mobile-first
- local-first
- no standalone backend
- centered on canonical `records`, evidence workflow, and tax-helper previews

The active contract also explicitly excludes:

- `accounts`
- `platform_accounts`
- `tax_line_definitions`
- `tax_line_inputs`
- dedicated posting-line SQL views
- accounting reporting SQL views
- registry-driven tax rollup views

That baseline matters because some GnuCash features are absent by deliberate scope, not by oversight.

## Missing Storage Capabilities

The table below covers capabilities where GnuCash has a credible analogue and Ledgerly storage still does not.

| Capability | GnuCash Evidence | Ledgerly Storage Today | Phase Fit | Why It Is Not There Yet |
| --- | --- | --- | --- | --- |
| Chart of accounts | Account-oriented engine objects inferred from [engine dir](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) | No | out_of_phase_current_baseline | The active contract explicitly excludes an `accounts` table and remains record-centric. |
| Split posting / double-entry journal lines | Transaction/split engine model inferred from [engine dir](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) | No | out_of_phase_current_baseline | Ledgerly persists canonical `records`, not account-linked debit/credit split lines. |
| Scheduled / recurring transactions | Scheduled-transaction support referenced in [releases](https://github.com/Gnucash/gnucash/releases) | No | future_phase | The active Ledgerly runtime has no recurring transaction scheduler or persistence model for it. |
| Customer / vendor / employee / AP-AR business objects | Business-object maintenance referenced in [releases](https://github.com/Gnucash/gnucash/releases) and inferred from [engine dir](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) | No | future_phase | Ledgerly currently uses lightweight counterparties, not a business sub-ledger with receivables/payables entities. |
| OFX / QIF / bank-feed import parity | Import/export breadth referenced in [repo root](https://github.com/Gnucash/gnucash) and [releases](https://github.com/Gnucash/gnucash/releases) | No | out_of_phase_current_baseline | The current Ledgerly phase explicitly avoids bank-connection assumptions and import breadth of that kind. |
| Report catalog / saved report configurations | Broad report surface referenced in [releases](https://github.com/Gnucash/gnucash/releases) | No | future_phase | Ledgerly storage supports several specific summaries, but not a general report-definition system. |
| Budgeting | Budget-oriented engine concepts inferred from [engine dir](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) and [releases](https://github.com/Gnucash/gnucash/releases) | No | future_phase | No budget tables, budget rows, or budget rollup model exist in the active contract. |
| Tax registry / tax-line-definition management | Desktop tax/accounting breadth inferred from [repo root](https://github.com/Gnucash/gnucash) | No | out_of_phase_current_baseline | The active Ledgerly contract explicitly excludes `tax_line_definitions` and `tax_line_inputs`. |
| Commodity prices / price database / FX-aware valuation | Price and commodity handling referenced in [releases](https://github.com/Gnucash/gnucash/releases) and inferred from [engine dir](https://github.com/Gnucash/gnucash/tree/stable/libgnucash/engine) | No | future_phase | Ledgerly stores a transaction currency but has no price database or valuation layer. |

## Adjacent Partial Areas

These are not “missing entirely,” but they are still materially behind GnuCash:

| Capability | Ledgerly Storage Today | Why It Is Only Partial |
| --- | --- | --- |
| CSV accounting import parity | Partial | Ledgerly has package/evidence import flows, but not a full accounting-grade CSV import surface like GnuCash’s dedicated importer. |
| Reconciliation workflow | Partial | Ledgerly has a `reconciled` record status, but not a dedicated reconciliation workflow model. |
| Invoice-export and tax-support artifact access | Partial | Vault collections exist, but there is no full invoice/bill storage model behind them. |
| Counterparty CRUD and merge operations | Partial | Counterparty storage exists with merge/create review semantics, but not a broader business-object layer. |

## Interpretation

The biggest storage differences between GnuCash and Ledgerly fall into two groups:

1. Desktop-accounting foundations Ledgerly intentionally does not model yet
   - chart of accounts
   - split posting
   - tax registries
   - bank-feed style imports
2. Future-phase workflow and planning areas Ledgerly may eventually need
   - scheduled transactions
   - budgeting
   - business/AP-AR objects
   - commodity and price support
   - broader report-system infrastructure

## Practical Takeaway

If the next Ledgerly work is meant to strengthen the current product phase, the priority should stay on formalizing already-supported storage capabilities into the SDK first.

If the product later wants deeper parity with GnuCash, the first truly storage-level expansion candidates are:

1. scheduled transactions
2. budgeting
3. richer business-party and invoice/bill persistence
4. reconciliation workflow modeling
5. commodity/price support

Chart-of-accounts and split-posting support would be a larger architectural shift and should be treated as a major product/storage redesign rather than a small incremental enhancement.
