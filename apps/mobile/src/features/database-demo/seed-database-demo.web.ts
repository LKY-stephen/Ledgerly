import { getActiveWebDatabase, openWebSqliteDatabase } from "../../storage/web-sqlite";
import { createWritableStorageDatabase } from "@creator-cfo/storage";
import { replaceCreatorLedgerDemoRecords } from "./creator-ledger-demo-plan";
import { deleteDatabaseFromIndexedDB } from "../../storage/web-persistence";
import { initializeLocalDatabase } from "../../storage/database";

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

export async function startNewLedger(): Promise<void> {
  const existingDb = getActiveWebDatabase();

  if (existingDb) {
    existingDb.close();
  }

  await deleteDatabaseFromIndexedDB();
  const newDb = await openWebSqliteDatabase();
  await initializeLocalDatabase(newDb);
}
