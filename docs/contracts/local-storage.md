# Local Storage Contract

This document is the canonical local-storage contract for the current Expo, local-first runtime.

- Current implemented contract version: `6`
- Database file: `ledgerly-local.db`
- Architecture phase: mobile-first, local-first, no standalone backend

## Runtime Baseline

The active runtime baseline is a hybrid `v6` contract:

- intake is optimized for sparse evidence capture
- the canonical persisted transaction surface is `records`
- Schedule C and Schedule SE previews remain supported
- extra information that cannot be derived from evidence must be supplied manually by the caller or user flow
- native startup no longer auto-creates a brand-new empty database when no active package exists; the user must explicitly import a package or initialize an empty one

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
- `upload_batches`
- `records`
- `record_entry_classifications`
- `tax_year_profiles`
- `evidences`
- `extraction_runs`
- `planner_runs`
- `planner_read_tasks`
- `evidence_files`
- `candidate_records`
- `workflow_write_proposals`
- `record_evidence_links`
- `workflow_audit_events`

The `records` table is the canonical local-first finance record. It stores:

- identity and ownership: `record_id`, `entity_id`
- lifecycle: `record_status`, `source_system`
- sparse captured facts: `occurred_on`, `amount_cents`, `currency`, `description`, `source_label`, `target_label`
- resolved links and user-owned classification: `source_counterparty_id`, `target_counterparty_id`, `record_kind`, `category_code`, `subcategory_code`, `tax_category_code`, `tax_line_code`, `business_use_bps`
- timestamps: `created_at`, `updated_at`

Current simplified receipt semantics:

- `record_kind = 'income'` remains the business-income path that feeds business views and current business tax projections.
- `record_kind = 'non_business_income'` represents personal-side income that stays out of the Biz tab while still counting toward personal income totals.
- `record_kind = 'personal_spending'` remains excluded from business tax totals and reduces the derived personal view.

The `evidences` table now tracks upload and parse lifecycle state in addition to sparse captured fields. It stores:

- identity and ownership: `evidence_id`, `entity_id`, `evidence_kind`
- local file tracking: `file_path`
- parse lifecycle: `parse_status` (`pending`, `parsed`, `failed`)
- extracted payload cache: `extracted_data` JSON review snapshot
- sparse captured fields: `captured_date`, `captured_amount_cents`, `captured_source`, `captured_target`, `captured_description`
- timestamps and source: `source_system`, `created_at`

The workflow layer is now persisted explicitly instead of only living in transient screen state:

- `upload_batches` summarizes one evidence-first upload workflow and exposes the operator-visible state machine
- `extraction_runs` stores historical raw parse payloads per evidence item
- `planner_runs` stores historical planner payloads plus locally validated summaries derived from extraction output
- `planner_read_tasks` stores prerequisite reads and their results before approval-gated writes
- `candidate_records` stores review-layer candidate rows before final books are mutated
- `workflow_write_proposals` stores approval-gated proposals for `counterparties`, duplicate-receipt decisions, and final `records` persistence
- `workflow_audit_events` stores durable approval notes, rejection notes, and workflow rationale

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

- package root: `ledgerly-vault/`
- active database file: `ledgerly-vault/ledgerly-local.db`
- evidence uploads: `ledgerly-vault/evidence-objects/{entity_id}/uploads/{yyyy}/{mm}/{entity_id}_{timestamp}_{hash}.{ext}`
- evidence manifests: `ledgerly-vault/evidence-manifests/{evidence_id}.json`

Expected upload-state rules:

- upload always ensures the default local entity `entity-main` exists before persistence
- upload writes new evidence into the active package root beside the active database file
- repeated uploads of the same binary are allowed; hash and size are indexed for lookup only and no longer enforced as a global uniqueness constraint
- newly ingested evidence starts at `parse_status = pending` and `upload_batches.state = uploaded`
- exact duplicate hashes mark the batch as `duplicate_file` by default and skip automatic reprocessing unless the caller forces a retry
- parser success keeps the evidence in `pending` until the approval workflow persists a final `record`
- confirmed evidence becomes `parse_status = parsed`
- parser failures become `parse_status = failed` and must remain retryable
- runtime readers resolve `evidence_files.relative_path` and `evidences.file_path` from the active package root, not from a detached global storage location
- runtime open/import fails closed when a tracked evidence path is absolute, escapes the package root, or points to a missing required file
- known legacy portable CFO packages that still match the older core 8-table baseline remain acceptable migration inputs; activation upgrades them to the current contract before normal runtime reads and writes proceed
- legacy local package names remain readable during migration and import so older local data is not stranded by the Ledgerly rename
- the authoritative workflow state now lives on `upload_batches.state` plus per-row `candidate_records.state`; `evidences.parse_status` remains a compatibility summary for queue screens

Expected write-policy rules:

- evidence, evidence-file, extraction-run, planner-run, and audit artifacts may persist automatically
- `counterparties`, final `records`, and `record_evidence_links` must remain approval-gated
- planner output must not be treated as final bookkeeping truth without local validation and operator approval
- rejected write proposals do not roll back already executed approvals; the workflow records a rejection note and may re-plan downstream proposals
- same-receipt duplicate review is stored as a durable `resolve_duplicate_receipt` proposal with overlap metadata in `workflow_write_proposals.payload_json`
- counterparty overlap review is stored as a durable `merge_counterparty` proposal, while the fallback `create_counterparty` stays blocked until the operator chooses `Keep New Counterparty`
- approving `Merge Receipt` suppresses duplicate final writes and links the new evidence onto the existing related records through `record_evidence_links`

Expected `extracted_data` JSON fields:

- `parser`: `openai_gpt`, `gemini`, or `rule_fallback`
- `model`: parsed model identifier when remote GPT parsing succeeds
- `sourceLabel`: human-readable parse source
- `originData`: validated parser DTO snapshot returned by the parser request and cached for testing plus review visibility
- `scheme`: legacy compatibility projection derived locally from the validated parser DTO; it no longer drives the active parser/planner workflow
- `rawText`: normalized GPT/OCR text or fallback source text
- `rawSummary`: short parse summary for review UI
- `rawLines`: line-by-line OCR text or fallback tokens
- `warnings`: ambiguity, inference, or parse-quality warnings returned by the parser
- `originData.records`: ordered parser-record collection for multi-receipt or multi-transaction uploads; legacy single-record payloads remain readable without this field
- `fields`: structured fields for `date`, `amountCents`, `description`, `source`, `target`, `category`, `taxCategory`, `notes`
- `candidates`: structured candidates for `date`, `amountCents`, `description`, `source`, `target`, `category`, `taxCategory`, `notes`
- `errorReason` / `failureReason`: optional parse diagnostics

Expected `extraction_runs.parse_payload` semantics:

- stores the raw validated parser DTO payload for that run
- parser DTO invalidation marks `extraction_runs.state = failed`, `upload_batches.state = failed`, persists `error_message`, and appends `workflow_audit_events`

Expected `planner_runs` semantics:

- `planner_payload_json`: the validated remote planner DTO returned by the planner call
- `summary_json`: the locally enriched planner summary after read-task execution, duplicate checks, duplicate overlap grouping, counterparty resolution, dependency ordering, and writeability validation
- candidate-scoped resolutions and write proposals may include `candidateIndex` metadata in planner payloads so one upload can route actions to multiple `candidate_records`
- planner DTO invalidation or missing required sections marks `planner_runs.state = failed`, `upload_batches.state = failed`, persists `error_message`, and appends `workflow_audit_events`

Compatibility notes:

- `/api/parse-origin-data` and `/api/parse-evidence` both expose the same validated parser DTO shape
- `/api/map-evidence-scheme` is deprecated compatibility glue that only projects legacy `scheme` output from the validated parser DTO
- new uploads no longer rely on arbitrary `originData -> fields` heuristics or a separate remote scheme-mapping prompt
- top-level parser `fields` and `candidates` remain as a first-record compatibility mirror even when `originData.records` contains multiple parsed records

## Device State

The device-state contract is now at version `7`. In addition to theme, locale, and session, the app persists:

- `profile_name`: profile name used as mapping source context
- `profile_email`: profile email used as mapping source context
- `profile_phone`: profile phone used as mapping source context

### Supported Current AI Configuration

The supported/current AI-provider contract is env-backed:

- OpenAI: `EXPO_PUBLIC_OPENAI_API_KEY`, optional `EXPO_PUBLIC_OPENAI_BASE_URL`, optional `EXPO_PUBLIC_OPENAI_MODEL`
- Infer: `EXPO_PUBLIC_INFER_API_KEY`, optional `EXPO_PUBLIC_INFER_BASE_URL`, optional `EXPO_PUBLIC_INFER_MODEL`
- Gemini: `EXPO_PUBLIC_GEMINI_API_KEY`, optional `EXPO_PUBLIC_GEMINI_BASE_URL`, optional `EXPO_PUBLIC_GEMINI_MODEL`

Current/public architecture docs describe `ai_provider` as middleware that reads env configuration and then serves different consumers such as assistant chat and parse/planner. Those consumers can apply different provider/model priority rules.

### Internal AI-Related Device State

The current codebase still persists several AI-related device-state fields for local settings, compatibility, and future work:

- `openai_api_key`: device-local compatibility copy of the OpenAI credential path
- `ai_provider`: compatibility label for settings UI and fallback display text, not the supported runtime selector
- `gemini_api_key`: device-local compatibility copy of the Gemini credential path
- `infer_api_key`: device-local compatibility copy of the Infer credential path
- `infer_base_url`: persisted Infer override that current implementations may still read, even though public/current docs describe env-backed configuration
- `infer_model`: persisted Infer model override for compatibility paths
- `gemini_auth_mode` and internal future auth token fields: hidden/internal state that stays outside the current supported public architecture story

These persisted fields should not be treated as the supported/current public runtime contract for AI-provider activation. Public/current docs mention environment-based configuration only, and future/hidden auth-oriented state is intentionally not part of the current published setup path.

Compatibility migration notes:

- Active package root has been renamed to `ledgerly-vault`
- Active database file has been renamed to `ledgerly-local.db`
- Active device-state namespace has been renamed to `@ledgerly/mobile`
- previous device-state namespace remains readable during migration
- Web IndexedDB persistence now prefers Ledgerly names but still reads legacy stores for migration

## Contract Source Of Truth

The implementation source of truth for this contract is:

- `docs/contracts/README.md`
- `packages/storage/src/contracts.ts`
- `packages/schemas/src/index.ts`

Any future contract change must update this document and automated coverage together.
