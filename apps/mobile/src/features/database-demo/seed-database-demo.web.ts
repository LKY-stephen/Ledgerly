import { getActiveWebDatabase } from "../../storage/web-sqlite";
import { createWritableStorageDatabase } from "@creator-cfo/storage";
import { replaceCreatorLedgerDemoRecords } from "./creator-ledger-demo-plan";

export async function seedCreatorFinanceDemoLedger(): Promise<{
  recordCount: number;
}> {
  const db = getActiveWebDatabase();

  if (!db) {
    throw new Error("Web database is not initialized.");
  }

  const writableDatabase = createWritableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getFirstAsync<Row>(source, ...(params as [])),
    runAsync: (source: string, ...params: unknown[]) =>
      db.runAsync(source, ...(params as [])),
  });

  return replaceCreatorLedgerDemoRecords(writableDatabase);
}
