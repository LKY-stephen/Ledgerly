import type { SQLiteBindParams, SQLiteDatabase } from "expo-sqlite";
import {
  createReadableStorageDatabase as createReadableStorageDatabaseView,
  createWritableStorageDatabase as createWritableStorageDatabaseView,
  type ReadableStorageDatabase,
  type StorageSqlValue,
  type WritableStorageDatabase,
} from "@creator-cfo/storage";

export function createReadableStorageDatabase(
  database: SQLiteDatabase,
): ReadableStorageDatabase {
  return createReadableStorageDatabaseView({
    getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, params as SQLiteBindParams);
    },
    getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, params as SQLiteBindParams);
    },
  });
}

export function createWritableStorageDatabase(
  database: SQLiteDatabase,
): WritableStorageDatabase {
  return createWritableStorageDatabaseView({
    getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, params as SQLiteBindParams);
    },
    getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, params as SQLiteBindParams);
    },
    runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.runAsync(source, params as SQLiteBindParams);
    },
  });
}
