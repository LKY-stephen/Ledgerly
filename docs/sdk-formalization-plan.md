# Ledgerly Storage-To-SDK Formalization Plan

- Request ID: `20260424-103732-formalize-sdk-interface`
- Derived from: `sdk_interface_gap_analysis.md`
- Captured on: `2026-04-24` (JST)
- Scope: plan the next SDK surface only for capabilities already supported at least partially in Ledgerly storage/runtime

## Status After 2026-04-24 Implementation

Completed from this plan:

- Phase 1: foundational read APIs
- Phase 3: evidence and workflow inspection reads
- Phase 4: tax surface expansion

Partially completed from this plan:

- Phase 2: record-classification helpers and counterparty proposal reads

Still deferred from this plan:

- package activation/import actions beyond metadata and helper reads
- `getCounterpartyReviewState(...)`
- approval-safe counterparty actions
- workflow approval/rejection mutation APIs
- Phase 5 reporting refinements

## Goal

Turn storage-backed capabilities that already exist in the active local-first Ledgerly runtime into a clearer, deliberate, public `@ledgerly/sdk` surface.

This plan does not propose SDK work for capabilities that Ledgerly storage does not yet implement at all.

## Planning Rules

1. Only formalize what storage/runtime already supports at least partially.
2. Keep the SDK aligned with the active baseline:
   - mobile-first
   - local-first
   - no standalone backend
3. Prefer thin, typed SDK wrappers over storage helpers before inventing new behavior.
4. Add public types first when a storage concept is not already represented in `packages/sdk/src/types.ts`.
5. Keep workflow and approval semantics explicit; do not hide approval-gated state changes behind misleading convenience APIs.
6. Do not surface account-, split-, or bank-feed concepts until the storage contract actually supports them.

## Source Of Truth

- `Ledgerly/packages/sdk/src/ledgerly-sdk.ts`
- `Ledgerly/packages/sdk/src/types.ts`
- `Ledgerly/packages/storage/src/contracts.ts`
- `Ledgerly/packages/storage/src/database.ts`
- `Ledgerly/packages/storage/src/record-entry.ts`
- `Ledgerly/packages/storage/src/reporting-queries.ts`
- `Ledgerly/packages/storage/src/tax-helper.ts`
- `Ledgerly/packages/storage/src/tax-queries.ts`
- `Ledgerly/packages/storage/src/schedule-c.ts`
- `Ledgerly/packages/storage/src/schedule-se.ts`
- `Ledgerly/docs/contracts/local-storage.md`
- `workflow/requests/20260424-103732-formalize-sdk-interface/sdk_interface_gap_analysis.md`

## Recommended Rollout Order

### Phase 1: Foundational Read APIs

Priority: highest
Status: completed

Target outcome:
Give SDK consumers first-class read access to storage concepts that already exist and are broadly useful across screens, automations, and tooling.

Proposed SDK additions:

- package lifecycle reads
  - `getStorageOverview()`
  - `getStorageBootstrapManifest()`
  - `getStorageBootstrapPlan()`
- package and vault path helpers
  - `getVaultCollectionSamplePath(collection)`
  - `buildEvidenceObjectPath(...)`
  - `buildEvidenceManifestPath(...)`
- generic record-query helpers
  - `searchRecordsByDateRange(...)`
  - `searchFirstRecordByDateRange(...)`

Why first:

- these are stable storage-backed capabilities
- they unblock later workflow and tax surfaces
- they reduce duplicated consumer-side query logic

Dependencies:

- introduce public SDK types for date-range search inputs/results where needed
- decide whether path-building helpers belong directly on `LedgerlySDK` or a nested namespace such as `sdk.storage`

### Phase 2: Classification And Counterparty Review

Priority: high
Status: partially completed

Target outcome:
Expose the storage-backed review layer around record classification and counterparty resolution without pretending that all decisions are automatic.

Proposed SDK additions:

- record-classification helpers
  - `resolveRecordClassification(...)`
  - `persistResolvedRecordClassification(...)`
- counterparty review reads
  - `listCounterpartyMergeProposals(...)`
  - `listCounterpartyCreateProposals(...)`
  - `getCounterpartyReviewState(...)`
- approval-safe counterparty actions
  - `approveCounterpartyMerge(...)`
  - `approveCounterpartyCreate(...)`
  - `rejectCounterpartyProposal(...)`

Why this phase:

- the storage contract already documents merge/create review semantics
- this is one of the clearest current SDK formalization gaps
- classification and counterparty review are central to the evidence-first workflow

Dependencies:

- define stable public SDK types for review proposals and approval actions
- keep approval-gated writes visibly separate from read-only inspection APIs

### Phase 3: Evidence And Workflow Inspection

Priority: high
Status: completed for reads, deferred for approval-state mutation APIs

Target outcome:
Expose the current workflow tables and evidence-file surfaces so consumers can inspect upload, parse, planning, and approval state through the SDK instead of reaching into storage directly.

Proposed SDK additions:

- evidence reads
  - `listEvidences(...)`
  - `getEvidence(...)`
  - `listEvidenceFiles(...)`
- workflow reads
  - `listUploadBatches(...)`
  - `getUploadBatch(...)`
  - `listExtractionRuns(...)`
  - `listPlannerRuns(...)`
  - `listPlannerReadTasks(...)`
  - `listCandidateRecords(...)`
  - `listWorkflowWriteProposals(...)`
  - `listWorkflowAuditEvents(...)`
- workflow approval actions
  - `approveWriteProposal(...)`
  - `rejectWriteProposal(...)`
  - `linkEvidenceToRecord(...)` only if that remains storage-backed and approval-safe

Why this phase:

- these concepts already exist in the active contract
- the current public SDK hides most of the actual operator workflow
- this is the highest-value surface for assistant and review tooling

Dependencies:

- settle public naming around “batch”, “proposal”, “candidate record”, and “audit event”
- decide pagination/filter shapes for potentially large tables

### Phase 4: Tax Surface Expansion

Priority: high
Status: completed

Target outcome:
Expose the lower-level tax helpers that storage already implements instead of only the collapsed `getTaxSummary()` surface.

Proposed SDK additions:

- `getScheduleCCandidateRecords(...)`
- `getScheduleCAggregation(...)`
- `getScheduleSEPreview(...)`
- `getTaxHelperEvidenceFileLinks(...)`
- `getTaxYearDateRange(...)`

Why this phase:

- these helpers already exist in storage
- current SDK consumers cannot access the lower-level outputs directly
- the tax helper is one of the clearest examples of storage sophistication hidden behind a single summary

Dependencies:

- add public SDK result types mirroring the storage tax helper outputs
- preserve the current cash-basis limitations explicitly in the SDK docs and type names

### Phase 5: Reporting API Refinement

Priority: medium
Status: not started

Target outcome:
Keep the current high-level reporting APIs, but add more explicit typed filters and lower-level query helpers where storage already supports them.

Proposed SDK additions:

- shared reporting date-range types exported from the SDK
- optional grouped reporting helpers if storage continues to expose stable reporting queries
- reusable `recordStatuses` and `recordKinds` filter types where they map directly onto storage queries

Why later:

- the current SDK already exposes profit and loss, balance sheet, and general ledger
- the bigger gaps are in workflow, tax, and query primitives

## Suggested Type Additions

Before adding many new methods, add stable public types for:

- storage bootstrap manifest and plan
- date-range query inputs
- evidence rows and evidence-file rows
- upload batch, extraction run, planner run, planner read task
- candidate record and write proposal
- workflow audit event
- Schedule C aggregation outputs
- Schedule SE preview outputs
- tax-helper evidence-file link rows

## Suggested Delivery Sequence

1. Add read-only foundational APIs first.
2. Add explicit workflow/evidence read surfaces.
3. Add tax-helper low-level reads.
4. Add approval-safe mutation APIs only after the read types are stable.
5. Revisit current report APIs last, unless a consumer urgently needs lower-level query control.

## What This Plan Explicitly Excludes

Do not use this plan to add SDK APIs for capabilities Ledgerly storage does not yet implement, including:

- chart of accounts
- split posting / double-entry journal lines
- scheduled transactions
- budgeting
- business/AP-AR modules
- OFX/QIF/bank-feed import
- commodity prices / price database

Those belong in storage/product expansion work first, not SDK formalization.

## Immediate Next Actions

1. Decide whether the expanded SDK should remain on `LedgerlySDK` directly or be reorganized into subdomains such as `sdk.storage`, `sdk.workflow`, and `sdk.tax`.
2. If workflow approval mutations are next, move the relevant semantics out of app-layer workflow code and into a stable storage/package contract first.
3. If counterparty review actions are next, formalize the missing review-state/action boundary below the app layer before expanding the SDK further.
4. Refresh the gap-analysis document whenever a formerly missing SDK formalization row becomes implemented.
