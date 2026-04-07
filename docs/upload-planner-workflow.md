# Upload Planner Workflow

This document defines the current local-first upload workflow for receipts, PDFs, and images.

## Flow

1. Upload files into the local vault and persist `evidences`, `evidence_files`, and one `upload_batch` per evidence group.
2. Short-circuit exact duplicate files by marking the batch as `duplicate_file` unless the caller explicitly forces reprocessing.
3. Create an `extraction_run` and call the parser with the strict `ReceiptParsePayload` contract.
4. Fail the batch immediately if the parser response does not validate; persist the failure on `extraction_runs`, `upload_batches`, and `workflow_audit_events`.
5. Cache the validated parser DTO in `evidences.extracted_data.originData` and project a legacy `scheme` only for backward compatibility.
6. Create a `planner_run` and call the planner with the strict `ReceiptPlannerPayload` contract.
7. Fail the batch immediately if the planner response does not validate or omits required sections like `readTasks`, `candidateRecords`, or `writeProposals`.
8. Execute local read tasks, duplicate checks, and counterparty matching against SQLite.
9. Persist the locally validated workflow artifacts:
   - `planner_read_tasks`
   - `candidate_records`
   - `workflow_write_proposals`
   - `workflow_audit_events`
10. Review parser artifact, planner artifact, duplicate or ambiguity warnings, candidate records, and proposal dependencies in Ledger.
11. Approve or reject each write proposal individually.
12. Persist final `records` and `record_evidence_links` only after dependencies resolve and the final record proposal becomes writable.

## Current Scope

- Owner entity stays fixed to `entity-main`.
- `source` and `target` resolve only against local `counterparties`.
- `counterparties` may be created through approval-gated planner proposals.
- Home continues reading only final `records`, never candidate-layer rows.

## Approval Policy

- `evidences`, `evidence_files`, `extraction_runs`, `planner_runs`, and audit events are auto-persisted.
- `counterparties` and final `records` stay approval-gated.
- Candidate creation is planner-generated, but final persistence stays approval-gated.
- A rejected proposal does not roll back already executed approvals; only downstream blocked proposals are recomputed.

## OpenAI Responsibilities

- Parser call: returns only the strict parser DTO for the current file and never claims final bookkeeping truth.
- Planner call: returns only the strict planner DTO for reads, resolutions, candidate skeletons, and proposal intent.
- Local code remains the final authority for DTO validation, duplicate checks, counterparty lookup, dependency ordering, candidate state derivation, and record persistence.

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
