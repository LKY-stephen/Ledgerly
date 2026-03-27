export interface BootstrapStatus {
  databaseName: string;
  fileVaultRoot: string;
  fileCollectionCount: number;
  platformCount: number;
  structuredTableCount: number;
  status: "idle" | "ready" | "error";
  summary: string;
}

