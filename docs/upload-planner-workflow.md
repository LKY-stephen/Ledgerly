# Upload Planner Workflow

This document defines the current local-first upload workflow for receipts, PDFs, and images.

## Flow

1. Upload files into the local vault and persist `evidences`, `evidence_files`, and one `upload_batch` per evidence group.
2. Short-circuit exact duplicate files by marking the batch as `duplicate_file` unless the caller explicitly forces reprocessing.
3. Create an `extraction_run` and call the parser with the strict `ReceiptParsePayload` contract.
4. Fail the batch immediately if the parser response does not validate; persist the failure on `extraction_runs`, `upload_batches`, and `workflow_audit_events`.
5. Cache the validated parser DTO in `evidences.extracted_data.originData` and project a legacy `scheme` only for backward compatibility.
   - parser payloads may include `records[]` when one image or PDF contains multiple distinct receipts or transactions
   - top-level `fields` and `candidates` remain as a compatibility mirror of the first parsed record
6. Create a `planner_run` and call the planner with the strict `ReceiptPlannerPayload` contract.
7. Fail the batch immediately if the planner response does not validate or omits required sections like `readTasks`, `candidateRecords`, or `writeProposals`.
8. Execute local read tasks, duplicate checks, and counterparty matching against SQLite.
9. Persist the locally validated workflow artifacts:
   - `planner_read_tasks`
   - `candidate_records`
   - `workflow_write_proposals`
   - `workflow_audit_events`
10. Materialize local decision proposals before final persistence:
   - exact local counterparty matches auto-resolve without creating new counterparty proposals
   - likely existing counterparty overlaps create a `merge_counterparty` decision plus a blocked fallback `create_counterparty`
   - same-receipt overlaps create a `resolve_duplicate_receipt` decision with overlap count and conflict references
11. Review parser artifact, planner artifact, duplicate or ambiguity warnings, candidate records, and proposal dependencies in Ledger.
12. Approve or reject each write proposal individually:
   - `Merge Counterparty` keeps the existing local counterparty and suppresses the fallback create proposal
   - `Keep New Counterparty` rejects the merge decision and unblocks the fallback create proposal
   - `Merge Receipt` suppresses duplicate final writes, links the new evidence onto the existing related records, and closes the batch
   - `Keep Separate` records the duplicate decision and unblocks downstream persistence
   - candidate-scoped proposals carry explicit routing metadata so one candidate can be approved or rejected without mutating sibling candidates from the same upload
13. Persist final `records` and `record_evidence_links` only after dependencies resolve and the final record proposal becomes writable.

## Current Scope

- Owner entity stays fixed to `entity-main`.
- `source` and `target` resolve only against local `counterparties`.
- `counterparties` may be created through approval-gated planner proposals.
- likely duplicate counterparties surface an explicit merge-vs-new decision before a duplicate local counterparty can be created.
- likely same-receipt overlaps surface an explicit merge-vs-separate decision before duplicate final writes can be approved.
- one evidence item may now yield multiple candidate records from parser `records[]` while still sharing one evidence row and one upload batch.
- Home continues reading only final `records`, never candidate-layer rows.

## Approval Policy

- `evidences`, `evidence_files`, `extraction_runs`, `planner_runs`, and audit events are auto-persisted.
- `counterparties` and final `records` stay approval-gated.
- Candidate creation is planner-generated, but final persistence stays approval-gated.
- duplicate receipt merges stay approval-gated; approval links the new evidence onto existing records instead of creating duplicate final writes.
- A rejected proposal does not roll back already executed approvals; only downstream blocked proposals are recomputed.
- when only some candidates from one upload are resolved, the batch remains `partially_approved` until the remaining candidate-scoped proposals are resolved.

## Supported AI Middleware Path

Parse/planner is a separate consumer of the env-backed `ai_provider` middleware. The current/public contract documents environment-based configuration only and does not use persisted `ai_provider` or hidden/future auth-based setup as the supported story.

| Provider | Parse/Planner Completeness Rule | Transport | Priority |
|---|---|---|---|
| OpenAI | `EXPO_PUBLIC_OPENAI_API_KEY` present | `/responses` | 1st |
| Infer | both `EXPO_PUBLIC_INFER_API_KEY` and `EXPO_PUBLIC_INFER_BASE_URL` present | `/responses` | 2nd |
| Gemini | `EXPO_PUBLIC_GEMINI_API_KEY` present | `:generateContent` | 3rd |

This precedence differs from the assistant contract because parse/planner requires a complete Infer base URL before Infer is treated as active.

## Remote Provider Responsibilities

- Parser call: returns only the strict parser DTO for the current file and never claims final bookkeeping truth.
- If the file contains multiple distinct receipts or transactions, the parser returns them in ordered `records[]` entries instead of collapsing them into one blended field set.
- Planner call: returns only the strict planner DTO for reads, resolutions, candidate skeletons, and proposal intent.
- Local code remains the final authority for DTO validation, duplicate checks, duplicate overlap grouping, counterparty lookup, dependency ordering, candidate state derivation, and record persistence.

Current/public architecture docs describe this remote path as an env-backed AI-provider middleware consumer. Assistant chat and parse/planner may resolve providers/models differently, but parse/planner still remains provider-aware rather than OpenAI-only in the published contract.

## Merge Rules

- Remote parser output is accepted only when it validates as `ReceiptParsePayload`.
- Remote planner output is accepted only when it validates as `ReceiptPlannerPayload`.
- Local runtime may enrich remote planner results with read-task results, duplicate facts, counterparty matches, dependency states, and candidate validation.
- Local runtime must not fabricate a full plan when the remote planner payload is missing required sections.

## Failure Handling

- `parser DTO invalid`: extraction run fails, batch fails, review UI shows the parser failure, and the operator can retry parse.
- `planner DTO invalid`: planner run fails, batch fails, review UI shows the planner failure, and the operator can re-run planner without discarding parser artifacts.
- `local validation failed`: planner summary is persisted with blocking warnings and proposals remain blocked or review-required.
- `duplicate short-circuit`: batch remains visible for review and can be force-reprocessed later.
- `partial candidate resolution`: the batch stays visible with `partially_approved` state until all remaining candidates from the same upload are either approved, rejected, or otherwise resolved.
