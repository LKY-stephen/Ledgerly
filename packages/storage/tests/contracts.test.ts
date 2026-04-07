import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  accountingPostableRecordStatuses,
  buildDeviceStateStorageKey,
  buildEvidenceDerivedPath,
  buildEvidenceManifestPath,
  buildEvidenceObjectPath,
  buildEvidenceUploadPath,
  buildInvoiceExportPath,
  buildTaxSupportPath,
  buildVaultRelativePath,
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
  getLocalStorageOverview,
  sanitizeVaultFileName,
  structuredStoreContract,
} from "../src/index";

function createContractDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  for (const statement of structuredStoreContract.maintenanceStatements) {
    database.exec(statement);
  }

  return database;
}

describe("storage contract v4", () => {
  it("boots the simplified hybrid v4 contract and exposes the expected schema inventory", () => {
    const database = createContractDatabase();
    const tableRows = database
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC;`)
      .all() as Array<{ name: string }>;
    const indexRows = database
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name ASC;`)
      .all() as Array<{ name: string }>;
    const evidenceColumns = database
      .prepare(`PRAGMA table_info(evidences);`)
      .all() as Array<{ name: string }>;

    expect(structuredStoreContract.version).toBe(4);
    expect(accountingPostableRecordStatuses).toEqual(["posted", "reconciled"]);
    expect(tableRows.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "counterparties",
        "entities",
        "evidence_files",
        "evidences",
        "record_entry_classifications",
        "record_evidence_links",
        "records",
        "tax_year_profiles",
      ]),
    );
    expect(structuredStoreContract.views).toEqual([]);
    expect(indexRows.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "counterparties_entity_name_idx",
        "evidences_entity_parse_status_created_idx",
        "evidence_files_sha_idx",
        "record_evidence_primary_idx",
        "records_entity_occurred_status_idx",
        "records_entity_tax_line_occurred_status_idx",
      ]),
    );
    expect(evidenceColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(["file_path", "parse_status", "extracted_data"]),
    );
  });

  it("creates manifests and overview objects that match the simplified contract", () => {
    const manifest = createLocalStorageBootstrapManifest();
    const overview = getLocalStorageOverview();
    const plan = getLocalStorageBootstrapPlan();

    expect(manifest.version).toBe(4);
    expect(manifest.schemaObjects.tables).toEqual(
      structuredStoreContract.tables.map((table) => table.name),
    );
    expect(manifest.schemaObjects.views).toEqual([]);
    expect(overview.tableCount).toBe(structuredStoreContract.tables.length);
    expect(overview.viewCount).toBe(0);
    expect(plan.version).toBe(4);
    expect(plan.schemaStatements.length).toBeGreaterThan(0);
  });

  it("keeps vault and device-state helpers stable", () => {
    expect(sanitizeVaultFileName("  Q1 Receipt .PDF ")).toBe("q1-receipt-.pdf");
    expect(buildVaultRelativePath("evidence-derived", "Preview 1.JPG")).toBe(
      "evidence-derived/preview-1.jpg",
    );
    expect(buildDeviceStateStorageKey("theme_preference")).toBe(
      "@creator-cfo/mobile/theme_preference",
    );
    expect(buildEvidenceObjectPath("ABCD1234", "pdf")).toBe(
      "evidence-objects/ab/cd/abcd1234.pdf",
    );
    expect(
      buildEvidenceUploadPath("entity-main", "2026-04-01T09:10:11.000Z", "entity-main_foo.pdf"),
    ).toBe("evidence-objects/entity-main/uploads/2026/04/entity-main-foo.pdf");
    expect(buildEvidenceManifestPath("sample-evidence")).toBe(
      "evidence-manifests/sample-evidence.json",
    );
    expect(buildEvidenceDerivedPath("sample-evidence", "Preview 1.JPG")).toBe(
      "evidence-derived/sample-evidence/preview-1.jpg",
    );
    expect(buildInvoiceExportPath("record-1", 2026)).toBe("invoice-exports/2026/record-1.pdf");
    expect(buildTaxSupportPath("2026-q1", "support.zip")).toBe(
      "tax-support/2026-q1/support.zip",
    );
  });

  it("documents v4 as the active runtime baseline", () => {
    const contractDocPath = fileURLToPath(
      new URL("../../../docs/contracts/local-storage.md", import.meta.url),
    );
    const contractDoc = readFileSync(contractDocPath, "utf8");

    expect(contractDoc).toContain("Current implemented contract version: `4`");
    expect(contractDoc).toContain("`records`");
    expect(contractDoc).toContain("`parse_status`");
    expect(contractDoc).toContain("`entity-main`");
    expect(contractDoc).toContain("active database file: `creator-cfo-vault/creator-cfo-local.db`");
    expect(contractDoc).toContain("runtime open/import fails closed");
    expect(contractDoc).toContain("repeated uploads of the same binary are allowed");
    expect(contractDoc).toContain("`openai_api_key`");
    expect(contractDoc).toContain("`vercel_api_base_url`");
  });
});
