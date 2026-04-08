import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import {
  createReadableStorageDatabase,
  type StorageSqlValue,
} from "@creator-cfo/storage";

import {
  validateDatabasePackageOrThrow,
  type DatabasePackageValidationResult,
} from "./storage-package-integrity";

export async function validateDatabasePackageDirectoryOrThrow(input: {
  databaseDirectory: string;
  databaseName: string;
  tableCompatibility?: "current_only" | "current_or_legacy";
}): Promise<DatabasePackageValidationResult> {
  const database = await openDatabaseAsync(input.databaseName, { useNewConnection: true }, input.databaseDirectory);

  try {
    return await validateDatabasePackageOrThrow({
      database: createReadableDatabaseView(database),
      packageRoot: input.databaseDirectory,
      pathExists: async (absolutePath: string) => {
        const info = await FileSystem.getInfoAsync(absolutePath);
        return info.exists;
      },
      tableCompatibility: input.tableCompatibility,
    });
  } finally {
    await database.closeAsync().catch(() => undefined);
  }
}

function createReadableDatabaseView(database: Awaited<ReturnType<typeof openDatabaseAsync>>) {
  return createReadableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, ...(params as []));
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, ...(params as []));
    },
  });
}
