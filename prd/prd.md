# PRD

- Request ID: 20260326-211432-prj-kickoff
- Title: Initiate Product Requirements
- Status: awaiting confirmation

## Problem

US content creators often run a real business on top of a personal life, with:

- irregular income (multiple platforms, sponsors, affiliates)
- fast, frequent spending (props, software, travel, equipment, contractor/editor)
- weak “ops hygiene” (lost receipts, uncategorized spending, missed invoices, cash surprises)
- ongoing compliance pressure (tax set-asides, documentation, year-end package readiness)

The existing repository artifact (`us-creator-tax-checklist`) helps with annual/quarterly tax workflow.
What’s missing is day-to-day financial management that fits a realistic creator lifestyle and reduces
the operational friction that causes mistakes and stress.

This PRD defines a **Software MVP spec** for day-to-day creator financial management, intentionally
mobile-first. The goal is to specify workflows, evidence handling, and UX constraints clearly enough to hand
off into technical design and implementation after user confirmation.

## Goals

- Define an MVP that helps a US solo creator keep finances clean daily/weekly so month-end and year-end are straightforward.
- Reduce “money chaos” by making income/expense capture fast, consistent, and auditable.
- Make receipt and bill evidence capture a first-class workflow (camera and upload).
- Automatically classify entries by time and category, with easy correction.
- Enable “ask my data” analyses and tax-package assistance via an LLM API (without turning the app into tax advice).
- Provide a reliable weekly snapshot (cash position, upcoming obligations, outstanding invoices, tax set-aside).
- Provide export-quality outputs: a nicely formatted ledger for any period plus a zipped evidence package.
- Keep the MVP simple and useful without bank integrations; evidence + manual entry must still work.
- Preserve the workflow sequence: PRD confirmation first, then design/implementation.

## Non-Goals

- Building a full accounting system (QuickBooks replacement).
- Providing personalized tax/legal advice or computing a creator’s actual tax liability.
- Filing/submitting taxes on the user’s behalf (e-file) in MVP.
- State-by-state tax rules, sales tax complexity, or international tax flows.
- Payroll and employee management (contractor tracking may be included; full payroll is out of scope).
- Solving OS-specific implementation choices in PRD (e.g., iOS vs Android details); those are deferred to technical design.

## Users And Use Cases

Primary user:

A US-based solo content creator (US citizen/US taxpayer), operating as an individual (typically Schedule C mindset).

Representative “real life” use cases (day-to-day):

- A platform payout hits the bank: record gross/fees/net, match to deposit, and update the weekly snapshot.
- A sponsor deal needs invoicing: track invoice sent, due date, and payment status; follow up if late.
- Buy something on the go: take a photo of the receipt, confirm amount/category, and store the evidence.
- Receive a bill by email/PDF: upload the file, classify it, and store the original document as evidence.
- Pay a contractor/editor: track vendor, amount, method, and “W-9 collected” status.
- Ask an assistant: “How much did I spend on groceries last month?” “What’s my business expenses total for Q1?”
- Ask for tax packaging help: generate a draft category summary and a checklist of what’s missing for Schedule C readiness.
- End-of-week “money check”: see cash runway, upcoming bills, unpaid invoices, and tax set-aside balance.
- End-of-month close: reconcile, fix uncategorized items, and export a clean ledger + evidence zip for the period.

## Requirements

This PRD is mobile-first and workflow-driven. Requirements are expressed as user outcomes and exports; implementation specifics are deferred to technical design.

Functional requirements (MVP):

- Receipt and bill capture (evidence-first ingestion)
  - Allow users to take a photo using the device camera, or upload an existing image/PDF as evidence.
  - Store the original evidence file and associate it with exactly one financial record (with support for multiple evidence files per record if needed).
  - Support creating a record without evidence (e.g., cash tip, no receipt) but flag it as “no evidence”.

- Classification
  - Automatically classify new records by time and category using available metadata and content signals.
  - Provide user-correctable classification with a fast UI (the user can override type/category/subcategory).
  - Support a category model that includes:
    - type: income or expense
    - category/subcategory: includes daily-purpose “spending” categories (food, groceries, transport, etc.) and creator-business categories as needed for reporting
  - Preserve auditability of category changes (exact mechanism to be designed).

- Income capture
  - Record income events for mixed streams: platform payouts, sponsorship payments, affiliate deposits, tips, merch/course sales (as income types).
  - Track gross vs fees vs net and store reference IDs (payout/transaction IDs).
  - Support accounts receivable (AR) for sponsor invoices: invoice date, due date, amount, status, paid date.

- Expense capture
  - Record expenses with vendor, category, description, amount, payment method, and date.
  - Support mixed-use allocation via business-use % (for items like phone/internet/gear).
  - Support refunds/chargebacks as reversing entries linked to the original transaction.
  - Track reimbursable expenses and reimbursement status.

- Evidence storage location (local or cloud)
  - Allow the user to configure where evidence files are stored: local (on-device) or cloud-backed storage.
  - Store evidence in a user-specified folder structure, keeping file names stable and linkable to ledger records.
  - The record retains a durable pointer to the stored evidence plus metadata (capture date, original filename/type).
  - Handle missing/moved evidence gracefully (record remains, evidence is flagged as unavailable).

- Cashflow and tax set-asides
  - Maintain a “do not spend” tax set-aside balance with transfers in/out and a target rule (rule is user-configurable; no tax calculation).
  - Provide a weekly snapshot: cash balances, tax set-aside balance, upcoming obligations, outstanding invoices, and a simple runway estimate.

- Contractors and vendors (optional, but supported)
  - Track vendor/contractor payments, payment status, and year-end readiness notes (e.g., W-9 collected).
  - Full payroll is explicitly out of scope.

- Subscriptions and recurring bills
  - Track recurring items with amount, cadence, renewal date, and a monthly “still needed?” review flag.

- Month-end close and export
  - Define a reconciliation workflow that can mark items as matched/unmatched against a statement or import batch (manual).
  - Export a ledger for any selected time range (at minimum: CSV; add a nicely formatted human-readable report as required by acceptance criteria).
  - Export a zipped evidence package for the same time range, containing:
    - all evidence files referenced by the ledger
    - a manifest that maps ledger record IDs to evidence filenames and metadata
    - a predictable folder layout to support tax reporting reference

LLM/API requirements:

- In-app assistant and API integration
  - Provide an in-app “assistant” experience backed by an LLM API.
  - The assistant can access statistics and summaries from the local database (spend totals, category breakdowns, time-series).
  - The assistant can generate analyses (trends, anomalies, missing evidence checks) and draft “tax package” outputs.
  - The assistant must include clear disclaimers that outputs are informational and require user review.

- Tax form assistance (drafting, not filing)
  - Provide a workflow to generate draft summaries intended to help the user fill US tax forms (e.g., totals by category for Schedule C readiness).
  - Outputs must be exportable and traceable back to underlying ledger entries and evidence where available.

UX/workflow requirements:

- Fast capture: capturing a receipt/bill and creating a record should be quick; enrichment can happen later.
- Supports both daily capture and weekly batching/review.
- Auditability: edits are traceable and avoid “silent overwrite” behavior (exact mechanism to be designed).
- Low-friction taxonomy: a stable, creator-friendly category set that can be customized.

Quality requirements:

- Simple enough for a non-accountant to maintain week-to-week.
- Clear defaults; avoid settings sprawl in MVP.
- Privacy-conscious posture by default (data sharing to LLM should be explicit and minimal by default; details deferred to design).

## Acceptance Criteria

PRD deliverable “done” conditions for this request:

- The PRD describes a realistic US solo creator day-to-day finance workflow and pain points.
- Requirements are concrete and grouped by creator workflows (income, expenses, receipts, cashflow, invoices, subscriptions, close/export).
- The MVP scope is clear: mobile-first receipt/bill capture, classification, evidence storage, assistant analyses/tax packaging, and exports.
- Open questions are minimal and non-blocking for workflow definition.
- After user confirmation, the next agent can write technical design without re-deriving requirements.

## Risks

- MVP friction risk: capture is too slow, users stop using it.
- Trust risk: creators may avoid entering finances into a tool without clear privacy posture.
- Misclassification risk: automated classification (OCR/LLM/rules) produces wrong categories unless review UX is strong.
- Evidence loss risk: user-configured storage can lead to moved/deleted files; export and manifest must be resilient.
- LLM risk: hallucinations or incorrect tax-form guidance; outputs must be framed as drafts and traceable to data.
- Category drift: inconsistent categorization reduces reporting value.
- Mixed-use allocations are error-prone; MVP must make allocations easy to update without becoming tax advice.
- Income source variety can cause edge cases (refunds, partial payouts, chargebacks, retained fees).

## Open Questions

1. Evidence extraction: is OCR/auto-extract of amount/vendor required for MVP, or is classification + manual entry sufficient?
2. Storage targets: which cloud storage options must be supported (generic “Files picker”, iCloud Drive, Google Drive, Dropbox, etc.)?
3. Tax targets: which tax forms/outputs should the “tax help” optimize for first (e.g., Schedule C category totals, 1099 reconciliation checklist)?
4. Export format: what is the required “nicely created ledger” format for MVP (PDF, CSV, both), and what structure should the evidence zip use?
