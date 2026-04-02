export interface StructuredTableContract {
  name: string;
  summary: string;
  createStatement: string;
}

export interface StructuredViewContract {
  name: string;
  summary: string;
  createStatement: string;
}

export interface StructuredIndexContract {
  name: string;
  summary: string;
  createStatement: string;
}

export interface FileVaultCollectionContract {
  slug: string;
  title: string;
  summary: string;
  defaultExtension: string;
}

export interface KeyValueRecordContract {
  key: string;
  summary: string;
  valueShape: string;
}

export interface LocalStorageOverview {
  collectionCount: number;
  indexCount: number;
  tableCount: number;
  viewCount: number;
}

export interface LocalStorageBootstrapManifestFileCollection extends FileVaultCollectionContract {
  samplePath: string;
}

export interface LocalStorageBootstrapManifest {
  databaseName: string;
  fileCollections: LocalStorageBootstrapManifestFileCollection[];
  schemaObjects: {
    indexes: string[];
    tables: string[];
    views: string[];
  };
  version: number;
}

export interface LocalStorageBootstrapPlan {
  databaseName: string;
  fileCollections: readonly FileVaultCollectionContract[];
  fileVaultRoot: string;
  maintenanceStatements: readonly string[];
  overview: LocalStorageOverview;
  pragmas: readonly string[];
  schemaStatements: readonly string[];
  structuredIndexes: readonly StructuredIndexContract[];
  structuredTables: readonly StructuredTableContract[];
  structuredViews: readonly StructuredViewContract[];
  version: number;
}

const structuredStorePragmas = ["PRAGMA journal_mode = WAL;", "PRAGMA foreign_keys = ON;"] as const;

export const accountingPostableRecordStatuses = ["posted", "reconciled"] as const;
export type AccountingPostableRecordStatus = (typeof accountingPostableRecordStatuses)[number];

const structuredTables = [
  {
    name: "entities",
    summary: "Legal owners or reporting units for the books stored on-device.",
    createStatement: `CREATE TABLE IF NOT EXISTS entities (
      entity_id TEXT PRIMARY KEY NOT NULL,
      legal_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      base_currency TEXT NOT NULL,
      default_timezone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
  },
  {
    name: "counterparties",
    summary: "Normalized source and target parties linked to sparse evidence-backed records.",
    createStatement: `CREATE TABLE IF NOT EXISTS counterparties (
      counterparty_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      counterparty_type TEXT NOT NULL,
      display_name TEXT NOT NULL,
      raw_reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "records",
    summary: "Canonical local-first finance records created first from sparse evidence and then completed manually.",
    createStatement: `CREATE TABLE IF NOT EXISTS records (
      record_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      record_status TEXT NOT NULL,
      source_system TEXT NOT NULL,
      description TEXT NOT NULL,
      memo TEXT,
      occurred_on TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      source_label TEXT NOT NULL,
      target_label TEXT NOT NULL,
      source_counterparty_id TEXT,
      target_counterparty_id TEXT,
      record_kind TEXT NOT NULL,
      category_code TEXT,
      subcategory_code TEXT,
      tax_category_code TEXT,
      tax_line_code TEXT,
      business_use_bps INTEGER NOT NULL DEFAULT 10000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id),
      FOREIGN KEY (source_counterparty_id) REFERENCES counterparties(counterparty_id),
      FOREIGN KEY (target_counterparty_id) REFERENCES counterparties(counterparty_id)
    );`,
  },
  {
    name: "record_entry_classifications",
    summary:
      "User-facing simplified-entry classifications resolved beside the canonical records table.",
    createStatement: `CREATE TABLE IF NOT EXISTS record_entry_classifications (
      record_id TEXT PRIMARY KEY NOT NULL,
      entry_mode TEXT NOT NULL,
      user_classification TEXT NOT NULL,
      classification_status TEXT NOT NULL,
      resolver_code TEXT,
      resolver_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(record_id) ON DELETE CASCADE
    );`,
  },
  {
    name: "tax_year_profiles",
    summary: "Entity and tax-year settings that scope local Schedule C and Schedule SE reads.",
    createStatement: `CREATE TABLE IF NOT EXISTS tax_year_profiles (
      entity_id TEXT NOT NULL,
      tax_year INTEGER NOT NULL,
      accounting_method TEXT NOT NULL DEFAULT 'cash',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (entity_id, tax_year),
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "evidences",
    summary: "Sparse evidence objects that preserve the captured intake fields before manual enrichment.",
    createStatement: `CREATE TABLE IF NOT EXISTS evidences (
      evidence_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      evidence_kind TEXT NOT NULL,
      file_path TEXT NOT NULL DEFAULT '',
      parse_status TEXT NOT NULL DEFAULT 'pending',
      extracted_data TEXT,
      captured_date TEXT NOT NULL,
      captured_amount_cents INTEGER NOT NULL,
      captured_source TEXT NOT NULL,
      captured_target TEXT NOT NULL,
      captured_description TEXT NOT NULL,
      source_system TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "evidence_files",
    summary: "Physical file metadata for evidence objects stored in the local vault.",
    createStatement: `CREATE TABLE IF NOT EXISTS evidence_files (
      evidence_file_id TEXT PRIMARY KEY NOT NULL,
      evidence_id TEXT NOT NULL,
      vault_collection TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      original_file_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      sha256_hex TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (evidence_id) REFERENCES evidences(evidence_id)
    );`,
  },
  {
    name: "record_evidence_links",
    summary: "Many-to-many linkage between records and evidence with primary-link tracking.",
    createStatement: `CREATE TABLE IF NOT EXISTS record_evidence_links (
      record_id TEXT NOT NULL,
      evidence_id TEXT NOT NULL,
      link_role TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (record_id, evidence_id, link_role),
      FOREIGN KEY (record_id) REFERENCES records(record_id),
      FOREIGN KEY (evidence_id) REFERENCES evidences(evidence_id)
    );`,
  },
] as const satisfies readonly StructuredTableContract[];

const structuredViews: readonly StructuredViewContract[] = [];

const structuredIndexes = [
  {
    name: "counterparties_entity_name_idx",
    summary: "Speeds local counterparty normalization by entity and display name.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS counterparties_entity_name_idx ON counterparties(entity_id, display_name);",
  },
  {
    name: "records_entity_occurred_status_idx",
    summary: "Speeds record timelines and tax-year reads by entity, date, and status.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS records_entity_occurred_status_idx ON records(entity_id, occurred_on, record_status);",
  },
  {
    name: "records_entity_tax_line_occurred_status_idx",
    summary: "Speeds Schedule C and Schedule SE candidate reads by entity, line mapping, date, and status.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS records_entity_tax_line_occurred_status_idx ON records(entity_id, tax_line_code, occurred_on, record_status);",
  },
  {
    name: "evidences_entity_parse_status_created_idx",
    summary: "Speeds parse-queue reads by entity, status, and creation time.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS evidences_entity_parse_status_created_idx ON evidences(entity_id, parse_status, created_at);",
  },
  {
    name: "evidence_files_sha_idx",
    summary: "Speeds evidence lookups by file hash and size without blocking re-uploads.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS evidence_files_sha_idx ON evidence_files(sha256_hex, size_bytes);",
  },
  {
    name: "record_evidence_primary_idx",
    summary: "Speeds primary evidence lookup per record.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS record_evidence_primary_idx ON record_evidence_links(record_id, is_primary);",
  },
] as const satisfies readonly StructuredIndexContract[];

const structuredMaintenanceStatements = [
  "DROP INDEX IF EXISTS evidence_files_sha_idx;",
  "CREATE INDEX IF NOT EXISTS evidence_files_sha_idx ON evidence_files(sha256_hex, size_bytes);",
  `INSERT OR IGNORE INTO record_entry_classifications (
    record_id,
    entry_mode,
    user_classification,
    classification_status,
    resolver_code,
    resolver_note,
    created_at,
    updated_at
  )
  SELECT
    record_id,
    'legacy',
    CASE
      WHEN record_kind = 'income' THEN 'income'
      WHEN record_kind = 'expense' THEN 'expense'
      WHEN record_kind = 'personal_spending' THEN 'personal_spending'
      ELSE 'other'
    END AS user_classification,
    'legacy',
    'legacy_backfill_v1',
    'Derived from existing record_kind during the v1 simplified-entry bootstrap.',
    created_at,
    updated_at
  FROM records;`,
  `UPDATE records
   SET tax_line_code = 'line27a',
       updated_at = COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   WHERE LOWER(TRIM(COALESCE(tax_line_code, ''))) = 'line27b'
     AND LOWER(TRIM(COALESCE(tax_category_code, ''))) = 'schedule-c-other-expense';`,
] as const;

const structuredSchemaStatements = [
  ...structuredTables.map((table) => table.createStatement),
  ...structuredViews.map((view) => view.createStatement),
  ...structuredIndexes.map((index) => index.createStatement),
] as const;

export const structuredStoreContract = {
  databaseName: "creator-cfo-local.db",
  maintenanceStatements: structuredMaintenanceStatements,
  version: 3,
  pragmas: structuredStorePragmas,
  tables: structuredTables,
  views: structuredViews,
  indexes: structuredIndexes,
  schemaStatements: structuredSchemaStatements,
} as const satisfies {
  databaseName: string;
  indexes: readonly StructuredIndexContract[];
  maintenanceStatements: readonly string[];
  pragmas: readonly string[];
  schemaStatements: readonly string[];
  tables: readonly StructuredTableContract[];
  version: number;
  views: readonly StructuredViewContract[];
};

export const fileVaultContract = {
  rootDirectory: "creator-cfo-vault",
  collections: [
    {
      slug: "evidence-objects",
      title: "Evidence Objects",
      summary: "Canonical evidence binaries stored once by content hash.",
      defaultExtension: "bin",
    },
    {
      slug: "evidence-manifests",
      title: "Evidence Manifests",
      summary: "Per-evidence manifest files that describe linked documents and metadata.",
      defaultExtension: "json",
    },
    {
      slug: "evidence-derived",
      title: "Evidence Derived",
      summary: "Generated previews or future sidecar files derived from canonical evidence.",
      defaultExtension: "jpg",
    },
    {
      slug: "invoice-exports",
      title: "Invoice Exports",
      summary: "Generated invoice PDFs or shareable drafts for clients.",
      defaultExtension: "pdf",
    },
    {
      slug: "tax-support",
      title: "Tax Support",
      summary: "Exports reserved for period-close, tax packaging, and audit support.",
      defaultExtension: "zip",
    },
  ],
} as const satisfies {
  collections: readonly FileVaultCollectionContract[];
  rootDirectory: string;
};

export const deviceStateContract = {
  storageEngine: "AsyncStorage",
  namespace: "@creator-cfo/mobile",
  version: 1,
  records: [
    {
      key: "theme_preference",
      summary: "Persist the user's chosen light, dark, or system theme mode.",
      valueShape: '"system" | "light" | "dark"',
    },
    {
      key: "locale_preference",
      summary: "Persist the user's preferred display language for the mobile shell.",
      valueShape: '"system" | "en" | "zh-CN"',
    },
    {
      key: "auth_session",
      summary:
        "Persist the locally trusted session summary for guest mode or on-device Apple sign-in.",
      valueShape:
        '{ kind: "guest" | "apple"; appleUserId?: string; email?: string | null; displayName?: string | null }',
    },
  ],
} as const satisfies {
  storageEngine: string;
  namespace: string;
  version: number;
  records: KeyValueRecordContract[];
};

export type FileVaultCollectionSlug = (typeof fileVaultContract.collections)[number]["slug"];
export type DeviceStateRecordKey = (typeof deviceStateContract.records)[number]["key"];

function normalizeSha256Hex(sha256Hex: string): string {
  const normalized = sha256Hex.trim().toLowerCase().replace(/[^a-f0-9]+/g, "");
  return normalized.length > 0 ? normalized : "0000";
}

function normalizeFileExtension(extension: string): string {
  const normalized = extension.trim().toLowerCase().replace(/^\.+/, "").replace(/[^a-z0-9]+/g, "");
  return normalized.length > 0 ? normalized : "bin";
}

export function sanitizeVaultFileName(fileName: string): string {
  const normalized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length === 0 || normalized.replace(/\./g, "").length === 0) {
    return "file";
  }

  return normalized;
}

export function sanitizeVaultPathSegment(segment: string): string {
  const normalized = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "item";
}

export function buildVaultRelativePath(
  collection: FileVaultCollectionSlug,
  fileName: string,
): string {
  return `${collection}/${sanitizeVaultFileName(fileName)}`;
}

export function buildDeviceStateStorageKey(key: DeviceStateRecordKey): string {
  return `${deviceStateContract.namespace}/${key}`;
}

export function buildEvidenceObjectPath(sha256Hex: string, extension: string): string {
  const normalizedSha = normalizeSha256Hex(sha256Hex);
  const normalizedExtension = normalizeFileExtension(extension);
  const levelOne = normalizedSha.slice(0, 2).padEnd(2, "0");
  const levelTwo = normalizedSha.slice(2, 4).padEnd(2, "0");

  return `evidence-objects/${levelOne}/${levelTwo}/${normalizedSha}.${normalizedExtension}`;
}

export function buildEvidenceUploadPath(
  entityId: string,
  capturedAt: string | Date,
  fileName: string,
): string {
  const timestamp = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  const year = Number.isNaN(timestamp.getTime()) ? "unknown-year" : String(timestamp.getUTCFullYear());
  const month = Number.isNaN(timestamp.getTime())
    ? "unknown-month"
    : String(timestamp.getUTCMonth() + 1).padStart(2, "0");

  return `evidence-objects/${sanitizeVaultPathSegment(entityId)}/uploads/${year}/${month}/${sanitizeVaultFileName(fileName)}`;
}

export function buildEvidenceManifestPath(evidenceId: string): string {
  return `evidence-manifests/${sanitizeVaultPathSegment(evidenceId)}.json`;
}

export function buildEvidenceDerivedPath(evidenceId: string, fileName: string): string {
  return `evidence-derived/${sanitizeVaultPathSegment(evidenceId)}/${sanitizeVaultFileName(fileName)}`;
}

export function buildInvoiceExportPath(
  recordId: string,
  year: number | string,
  extension = "pdf",
): string {
  return `invoice-exports/${sanitizeVaultPathSegment(String(year))}/${sanitizeVaultPathSegment(recordId)}.${normalizeFileExtension(extension)}`;
}

export function buildTaxSupportPath(periodKey: string, fileName: string): string {
  return `tax-support/${sanitizeVaultPathSegment(periodKey)}/${sanitizeVaultFileName(fileName)}`;
}

export function getVaultCollectionSamplePath(collection: FileVaultCollectionSlug): string {
  switch (collection) {
    case "evidence-objects":
      return buildEvidenceUploadPath("entity-main", "2026-04-01T00:00:00.000Z", "sample-receipt.pdf");
    case "evidence-manifests":
      return buildEvidenceManifestPath("sample-evidence");
    case "evidence-derived":
      return buildEvidenceDerivedPath("sample-evidence", "preview-1.jpg");
    case "invoice-exports":
      return buildInvoiceExportPath("sample-record", "2026");
    case "tax-support":
      return buildTaxSupportPath("2026-q1", "evidence-package.zip");
  }

  const exhaustiveCollection: never = collection;
  return exhaustiveCollection;
}

export function getLocalStorageOverview(): LocalStorageOverview {
  return {
    collectionCount: fileVaultContract.collections.length,
    indexCount: structuredStoreContract.indexes.length,
    tableCount: structuredStoreContract.tables.length,
    viewCount: structuredStoreContract.views.length,
  };
}

export function createLocalStorageBootstrapManifest(): LocalStorageBootstrapManifest {
  return {
    databaseName: structuredStoreContract.databaseName,
    fileCollections: fileVaultContract.collections.map((collection) => ({
      ...collection,
      samplePath: getVaultCollectionSamplePath(collection.slug),
    })),
    schemaObjects: {
      indexes: structuredStoreContract.indexes.map((index) => index.name),
      tables: structuredStoreContract.tables.map((table) => table.name),
      views: structuredStoreContract.views.map((view) => view.name),
    },
    version: structuredStoreContract.version,
  };
}

export function getLocalStorageBootstrapPlan(): LocalStorageBootstrapPlan {
  return {
    databaseName: structuredStoreContract.databaseName,
    fileCollections: fileVaultContract.collections,
    fileVaultRoot: fileVaultContract.rootDirectory,
    maintenanceStatements: structuredStoreContract.maintenanceStatements,
    overview: getLocalStorageOverview(),
    pragmas: structuredStoreContract.pragmas,
    schemaStatements: structuredStoreContract.schemaStatements,
    structuredIndexes: structuredStoreContract.indexes,
    structuredTables: structuredStoreContract.tables,
    structuredViews: structuredStoreContract.views,
    version: structuredStoreContract.version,
  };
}
