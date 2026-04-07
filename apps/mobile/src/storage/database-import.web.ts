export interface DatabaseImportResult {
  checkedPathCount: number;
  importedDatabaseName: string;
  sourcePackageRoot: string;
}

export async function pickAndImportDatabasePackageAsync(): Promise<DatabaseImportResult | null> {
  throw new Error("Database package import is only supported on native mobile builds.");
}
