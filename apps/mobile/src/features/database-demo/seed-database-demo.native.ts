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
