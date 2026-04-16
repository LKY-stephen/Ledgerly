export async function seedCreatorFinanceDemoLedger(): Promise<{
  recordCount: number;
}> {
  throw new Error("Demo ledger seeding is only available on native builds.");
}

export async function startNewLedger(): Promise<void> {
  throw new Error("Start new ledger is only available on native or web builds.");
}
