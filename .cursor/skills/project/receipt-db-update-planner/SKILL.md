---
name: receipt-db-update-planner
description: >-
  Plan database updates from OpenAI receipt-parsing JSON with uncertain or incomplete
  fields. Use when a model must decide what to read first, propose ordered database
  writes, minimize reads and writes, and require explicit user approval before each
  write affecting evidence, candidate records, records, links, or workflow state.
---

# Receipt DB Update Planner

Use this skill when receipt parsing returns structured JSON, but some fields are underdetermined and the model must turn that parse into safe database-update work.

## Core Rules

1. Treat OpenAI parse output as evidence-derived suggestions, not as trusted final rows.
2. Read the minimum context needed to remove ambiguity before proposing writes.
3. Separate `facts`, `inferences`, `unknowns`, `required reads`, and `proposed writes`.
4. Never perform a database write until the user explicitly approves that specific write.
5. Ask for approval one write at a time unless the user explicitly authorizes grouped writes.
6. After each approved write, re-evaluate whether later planned writes are still valid.

## Default Workflow

1. Inspect the parse JSON and classify each field:
   - `certain`
   - `uncertain`
   - `missing`
   - `conflicting`
2. Summarize the economic events implied by the parse:
   - zero, one, or many candidate records
   - evidence metadata
   - possible links to existing records
3. Decide what must be read before any write:
   - schema or contract definitions
   - existing evidence by hash or document number
   - existing records by date, amount, vendor, or external reference
   - existing entities matching parsed source or target identities
   - existing counterparties matching parsed source or target identities
   - required account, counterparty, or platform mappings
4. Produce an ordered task plan:
   - read tasks first
   - then proposed writes in dependency order
5. Present each proposed write with:
   - target table or object
   - purpose
   - minimum required input fields
   - dependencies
   - risk if skipped or executed incorrectly
6. Ask the user to approve or reject each write before execution.

## Output Format

Use this structure unless the user asks for something else:

### Parse Summary

- what the receipt likely represents
- how many candidate records it may produce

### Confirmed Facts

- fields directly supported by the parse or evidence file

### Uncertain Fields

- values that require lookup, mapping, or human choice

### Master Data Resolution

- parsed `source` and `target` identities
- matching existing entities
- matching existing counterparties
- whether a new entity or counterparty must be proposed

### Read Plan

- exact reads needed before writes
- why each read is necessary

### Proposed Writes

For each write, include:

- `write_id`
- target object or table
- operation type such as create, update, upsert, supersede, or link
- prerequisite reads
- user-facing explanation

### Approval Gate

- ask for approval for the next write only
- if approval is denied, stop and re-plan

## Write Safety Rules

- Do not invent missing database identifiers.
- Do not silently overwrite existing final records.
- Do not invent or auto-create `entity` or `counterparty` rows without user approval.
- Route conflicts, duplicate matches, and uncertain mappings to review instead of auto-write.
- Prefer draft or candidate-layer writes before final `records` writes.
- When in doubt, propose a read or a user question instead of a write.

## Receipt-Specific Heuristics

- If the parse implies multiple economic events, propose separate candidate records.
- If totals do not reconcile, stop before final writes and mark the affected record as needing review.
- If the parse matches an existing evidence file hash, treat it as duplicate evidence unless the user requests reprocessing.
- If a parsed line could either update an existing draft or create a new record, read the draft first and present both options.
- If parsed `source` or `target` names do not match an existing entity or counterparty confidently, stop and propose a `create_entity` or `create_counterparty` write with the parsed payload for user approval.
- If multiple existing entities or counterparties are plausible matches, present the candidates and stop for user choice before proposing downstream record writes.

## Approval Prompt Pattern

Use short, explicit approval prompts:

- `Approve write W1: create evidence row for uploaded receipt?`
- `Approve write W2: create candidate record for vendor expense amount 48.20 USD on 2026-04-03?`
- `Approve write W3: link candidate record C2 to evidence E14?`
- `Approve write W4: create new counterparty from parsed target 'Acme Supplies Tokyo' using the current parsed payload?`

If the user approves, execute only that write and then continue to the next approval gate.
