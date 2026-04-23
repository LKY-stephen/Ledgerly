import { getActiveWebDatabase, openWebSqliteDatabase } from "../../storage/web-sqlite";
import { createWritableStorageDatabase } from "@ledgerly/storage";
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
  // Let the user pick a folder first — abort if they cancel.
  const dirHandle = await pickDirectory();

  if (dirHandle === "cancelled") {
    return;
  }

  // Reset database
  const existingDb = getActiveWebDatabase();

  if (existingDb) {
    existingDb.close({ persist: false });
  }

  await deleteDatabaseFromIndexedDB();
  const newDb = await openWebSqliteDatabase();
  await initializeLocalDatabase(newDb);

  // Export the new empty database into the selected folder
  if (dirHandle) {
    const data = newDb.exportDatabase();
    const fileHandle = await dirHandle.getFileHandle("ledgerly-local.db", {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();
  }
}

async function pickDirectory(): Promise<FileSystemDirectoryHandle | null | "cancelled"> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    // Browser doesn't support directory picker — proceed without export
    return null;
  }

  try {
    return await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
  } catch {
    // User cancelled the picker
    return "cancelled";
  }
}
