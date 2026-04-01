import type { SQLiteBindParams, SQLiteDatabase } from "expo-sqlite";
import type {
  ReadableStorageDatabase,
  StorageSqlValue,
  WritableStorageDatabase,
} from "@creator-cfo/storage";

export function createReadableStorageDatabase(
  database: SQLiteDatabase,
): ReadableStorageDatabase {
  return {
    getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, params as SQLiteBindParams);
    },
    getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, params as SQLiteBindParams);
    },
  };
}

export function createWritableStorageDatabase(
  database: SQLiteDatabase,
): WritableStorageDatabase {
  return {
    ...createReadableStorageDatabase(database),
    runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.runAsync(source, params as SQLiteBindParams);
    },
  };
}
