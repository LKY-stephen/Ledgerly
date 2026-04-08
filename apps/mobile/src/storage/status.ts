export interface BootstrapStatus {
  databaseName: string;
  fileVaultRoot: string;
  fileCollectionCount: number;
  platformCount: number;
  structuredTableCount: number;
  status: "idle" | "ready" | "error";
  summary: string;
}

export class StorageSetupRequiredError extends Error {
  constructor(message = "No active database package is available yet.") {
    super(message);
    this.name = "StorageSetupRequiredError";
  }
}
