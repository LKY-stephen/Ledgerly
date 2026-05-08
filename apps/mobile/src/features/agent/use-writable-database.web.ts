import { useMemo } from "react";
import {
  createWritableStorageDatabase,
  type WritableStorageDatabase,
} from "@ledgerly/storage";
import { getActiveWebDatabase, openWebSqliteDatabase } from "../../storage/web-sqlite";
import { initializeLocalDatabase } from "../../storage/database";

export function useWritableDatabase(): WritableStorageDatabase | null {
  return useMemo(() => {
    const db = getActiveWebDatabase();
    if (!db) return null;

    return createWritableStorageDatabase({
      getAllAsync: <Row>(source: string, ...params: unknown[]) =>
        db.getAllAsync<Row>(source, ...(params as [])),
      getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
        db.getFirstAsync<Row>(source, ...(params as [])),
      runAsync: (source: string, ...params: unknown[]) =>
        db.runAsync(source, ...(params as [])),
    });
  }, []);
}

export async function getWritableDatabaseAsync(): Promise<WritableStorageDatabase> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  return createWritableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getFirstAsync<Row>(source, ...(params as [])),
    runAsync: (source: string, ...params: unknown[]) =>
      db.runAsync(source, ...(params as [])),
  });
}
