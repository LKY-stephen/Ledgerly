import { openWebSqliteDatabase, getActiveWebDatabase } from "./web-sqlite";
import { saveDatabaseToIndexedDB } from "./web-persistence";
import { initializeLocalDatabase } from "./database";

export interface DatabaseImportResult {
  checkedPathCount: number;
  importedDatabaseName: string;
  sourcePackageRoot: string;
}

export async function pickAndImportDatabasePackageAsync(): Promise<DatabaseImportResult | null> {
  return new Promise<DatabaseImportResult | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".db,.sqlite,.sqlite3,application/x-sqlite3,application/vnd.sqlite3,application/octet-stream";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);

        // Close the current database if open
        const activeDb = getActiveWebDatabase();

        if (activeDb) {
          activeDb.close();
        }

        // Save the imported database bytes to IndexedDB
        await saveDatabaseToIndexedDB(data);

        // Reopen the database from the imported data
        const db = await openWebSqliteDatabase();
        await initializeLocalDatabase(db);

        resolve({
          checkedPathCount: 1,
          importedDatabaseName: file.name,
          sourcePackageRoot: "browser-upload",
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to import database file."),
        );
      }
    });

    input.addEventListener("cancel", () => {
      resolve(null);
    });

    input.click();
  });
}

export function exportDatabaseToFile(): void {
  const db = getActiveWebDatabase();

  if (!db) {
    throw new Error("No active database to export.");
  }

  const data = db.exportDatabase();
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "creator-cfo-local.db";
  anchor.click();
  URL.revokeObjectURL(url);
}
