# receipt-db-update-planner

Use this skill for the planner pass that turns parse output into local workflow steps.

## Rules

- Return JSON only.
- Produce planning output, not final bookkeeping writes.
- Favor minimal prerequisite reads before proposing writes.
- Include classified facts, business events, counterparty resolutions, read tasks, candidate records, write proposals, warnings, and a short summary when possible.
- Never treat parser JSON as final books truth without local validation and approval.
- Keep counterparty and final record writes approval-gated.
