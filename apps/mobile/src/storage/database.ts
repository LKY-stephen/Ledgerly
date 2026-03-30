import type { SQLiteDatabase } from "expo-sqlite";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

export async function initializeLocalDatabase(database: SQLiteDatabase): Promise<void> {
  const storagePlan = getLocalStorageBootstrapPlan();

  for (const pragma of storagePlan.pragmas) {
    await database.execAsync(pragma);
  }

  for (const statement of storagePlan.schemaStatements) {
    await database.execAsync(statement);
  }

  await database.execAsync(`PRAGMA user_version = ${storagePlan.version};`);
}

export async function countStructuredTables(database: SQLiteDatabase): Promise<number> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  );

  return tables.filter((table) =>
    storagePlan.structuredTables.some((contract) => contract.name === table.name),
  ).length;
}
