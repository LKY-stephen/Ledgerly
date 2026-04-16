import { withWritableLocalDatabase } from "../../storage/runtime";
import { replaceCreatorLedgerDemoRecords } from "./creator-ledger-demo-plan";

export async function seedCreatorFinanceDemoLedger(): Promise<{
  recordCount: number;
}> {
  return withWritableLocalDatabase(async ({ database, writableDatabase }) => {
    let result: { recordCount: number } | null = null;

    await database.withTransactionAsync(async () => {
      result = await replaceCreatorLedgerDemoRecords(writableDatabase);
    });

    return result ?? { recordCount: 0 };
  });
}

export async function startNewLedger(): Promise<void> {
  return withWritableLocalDatabase(async ({ database }) => {
    await database.execAsync("DELETE FROM records;");
    await database.execAsync("DELETE FROM upload_batches;");
    await database.execAsync("DELETE FROM evidence;");
    await database.execAsync("DELETE FROM planner_runs;");
  });
}
