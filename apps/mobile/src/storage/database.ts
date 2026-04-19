import { getLocalStorageBootstrapPlan } from "@ledgerly/storage";

export interface StorageSqlExecDatabase {
  execAsync(source: string): Promise<void>;
}

export interface StorageSqlTableReader {
  getAllAsync<Row>(source: string): Promise<Row[]>;
}

export async function initializeLocalDatabase(database: StorageSqlExecDatabase): Promise<void> {
  const storagePlan = getLocalStorageBootstrapPlan();

  for (const pragma of storagePlan.pragmas) {
    try {
      await database.execAsync(pragma);
    } catch {
      // WAL mode or other pragmas may fail on certain platforms; continue with defaults.
    }
  }

  for (const statement of storagePlan.schemaStatements) {
    await database.execAsync(statement);
  }

  for (const statement of storagePlan.maintenanceStatements) {
    await database.execAsync(statement);
  }

  await database.execAsync(`PRAGMA user_version = ${storagePlan.version};`);
}

export async function countStructuredTables(database: StorageSqlTableReader): Promise<number> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  );

  return tables.filter((table) =>
    storagePlan.structuredTables.some((contract) => contract.name === table.name),
  ).length;
}
