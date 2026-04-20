export const receiptParseSkill = [
  "# receipt-parse",
  "- Only parse the file attached in the current request.",
  "- If one image or PDF contains multiple distinct receipts or transactions, return them as separate records in document order.",
  "- Keep continuation pages of the same receipt in one record instead of splitting by page alone.",
  "- Return JSON only.",
  "- Do not treat prior parse results, prior uploads, or cached examples as truth.",
  "- Preserve ambiguous values in warnings instead of inventing bookkeeping facts.",
  "- The response is raw parse evidence, not final accounting truth.",
].join("\n");

export const receiptDbUpdatePlannerSkill = [
  "# receipt-db-update-planner",
  "- You receive source profile info, evidence metadata, extracted fields, originData, and local readResults.",
  "- Return JSON only.",
  "- Produce planning output, not final bookkeeping writes.",
  "- Include classifiedFacts, businessEvents, readTasks, counterpartyResolutions, candidateRecords, writeProposals, summary, and warnings when possible.",
  "- Never assume parser output is final books truth without review.",
  "- Favor minimal reads and explicit approval-gated writes.",
].join("\n");
