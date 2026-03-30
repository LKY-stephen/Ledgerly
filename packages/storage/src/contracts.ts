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

export const accountingReportAccountTypes = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
] as const;
export type AccountingReportAccountType = (typeof accountingReportAccountTypes)[number];

export const accountingStatementSections = ["balance_sheet", "profit_and_loss"] as const;
export type AccountingStatementSection = (typeof accountingStatementSections)[number];

export const accountingStatementSectionsByAccountType = {
  asset: "balance_sheet",
  liability: "balance_sheet",
  equity: "balance_sheet",
  income: "profit_and_loss",
  expense: "profit_and_loss",
} as const satisfies Record<AccountingReportAccountType, AccountingStatementSection>;

const accountingPostableRecordStatusSqlList = accountingPostableRecordStatuses
  .map((status) => `'${status}'`)
  .join(", ");

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
    name: "accounts",
    summary: "Chart of accounts used by derived double-entry and finance reporting views.",
    createStatement: `CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      normal_balance TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "counterparties",
    summary: "Platforms, clients, vendors, banks, owners, and tax agencies tied to records.",
    createStatement: `CREATE TABLE IF NOT EXISTS counterparties (
      counterparty_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      counterparty_type TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      display_name TEXT,
      tax_id_masked TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "platform_accounts",
    summary: "Creator platform identities used for payout and revenue aggregation.",
    createStatement: `CREATE TABLE IF NOT EXISTS platform_accounts (
      platform_account_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      platform_code TEXT NOT NULL,
      account_label TEXT NOT NULL,
      external_account_ref TEXT,
      active_from TEXT,
      active_to TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
    );`,
  },
  {
    name: "records",
    summary: "Operational finance events used as the canonical local-first source of truth.",
    createStatement: `CREATE TABLE IF NOT EXISTS records (
      record_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      record_kind TEXT NOT NULL,
      posting_pattern TEXT NOT NULL,
      record_status TEXT NOT NULL,
      source_system TEXT NOT NULL,
      counterparty_id TEXT,
      platform_account_id TEXT,
      related_record_id TEXT,
      related_record_role TEXT,
      external_reference TEXT,
      invoice_number TEXT,
      description TEXT NOT NULL,
      memo TEXT,
      category_code TEXT,
      subcategory_code TEXT,
      payment_method_code TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'pending',
      recognition_on TEXT NOT NULL,
      cash_on TEXT,
      due_on TEXT,
      service_period_start_on TEXT,
      service_period_end_on TEXT,
      currency TEXT NOT NULL,
      primary_amount_cents INTEGER NOT NULL DEFAULT 0,
      gross_amount_cents INTEGER NOT NULL DEFAULT 0,
      fee_amount_cents INTEGER NOT NULL DEFAULT 0,
      withholding_amount_cents INTEGER NOT NULL DEFAULT 0,
      other_adjustment_amount_cents INTEGER NOT NULL DEFAULT 0,
      net_cash_amount_cents INTEGER NOT NULL DEFAULT 0,
      business_use_bps INTEGER NOT NULL DEFAULT 10000,
      tax_category_code TEXT,
      tax_line_code TEXT,
      is_capitalizable INTEGER NOT NULL DEFAULT 0,
      placed_in_service_on TEXT,
      primary_account_id TEXT,
      cash_account_id TEXT,
      fee_account_id TEXT,
      withholding_account_id TEXT,
      adjustment_account_id TEXT,
      offset_account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(entity_id),
      FOREIGN KEY (counterparty_id) REFERENCES counterparties(counterparty_id),
      FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(platform_account_id),
      FOREIGN KEY (related_record_id) REFERENCES records(record_id),
      FOREIGN KEY (primary_account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (cash_account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (fee_account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (withholding_account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (adjustment_account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (offset_account_id) REFERENCES accounts(account_id)
    );`,
  },
  {
    name: "evidences",
    summary: "Logical evidence documents that can support one or many records.",
    createStatement: `CREATE TABLE IF NOT EXISTS evidences (
      evidence_id TEXT PRIMARY KEY NOT NULL,
      entity_id TEXT NOT NULL,
      evidence_kind TEXT NOT NULL,
      title TEXT NOT NULL,
      source_system TEXT NOT NULL,
      issuer_name TEXT,
      document_number TEXT,
      issue_on TEXT,
      coverage_start_on TEXT,
      coverage_end_on TEXT,
      total_amount_cents INTEGER,
      currency TEXT,
      notes TEXT,
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
      archived_file_name TEXT NOT NULL,
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
    summary: "Many-to-many linkage between records and evidence with line or page coverage metadata.",
    createStatement: `CREATE TABLE IF NOT EXISTS record_evidence_links (
      record_id TEXT NOT NULL,
      evidence_id TEXT NOT NULL,
      link_role TEXT NOT NULL,
      page_from INTEGER,
      page_to INTEGER,
      line_ref TEXT,
      amount_supported_cents INTEGER,
      coverage_start_on TEXT,
      coverage_end_on TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (record_id, evidence_id, link_role),
      FOREIGN KEY (record_id) REFERENCES records(record_id),
      FOREIGN KEY (evidence_id) REFERENCES evidences(evidence_id)
    );`,
  },
] as const satisfies readonly StructuredTableContract[];

const structuredViews = [
  {
    name: "record_double_entry_lines_v",
    summary: "Derived debit and credit lines expanded from records by posting pattern.",
    createStatement: `CREATE VIEW IF NOT EXISTS record_double_entry_lines_v AS
      SELECT
        record_id,
        10 AS line_no,
        recognition_on AS posting_on,
        cash_account_id AS account_id,
        'cash' AS account_role,
        net_cash_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'gross_to_net_income'
        AND net_cash_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        20 AS line_no,
        recognition_on AS posting_on,
        fee_account_id AS account_id,
        'fee' AS account_role,
        fee_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'gross_to_net_income'
        AND fee_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        30 AS line_no,
        recognition_on AS posting_on,
        withholding_account_id AS account_id,
        'withholding' AS account_role,
        withholding_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'gross_to_net_income'
        AND withholding_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        CASE WHEN other_adjustment_amount_cents > 0 THEN 40 ELSE 41 END AS line_no,
        recognition_on AS posting_on,
        adjustment_account_id AS account_id,
        'adjustment' AS account_role,
        CASE WHEN other_adjustment_amount_cents > 0 THEN other_adjustment_amount_cents ELSE 0 END AS debit_amount_cents,
        CASE WHEN other_adjustment_amount_cents < 0 THEN ABS(other_adjustment_amount_cents) ELSE 0 END AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'gross_to_net_income'
        AND other_adjustment_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        90 AS line_no,
        recognition_on AS posting_on,
        primary_account_id AS account_id,
        'primary' AS account_role,
        0 AS debit_amount_cents,
        gross_amount_cents AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'gross_to_net_income'
        AND gross_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        10 AS line_no,
        recognition_on AS posting_on,
        primary_account_id AS account_id,
        'primary' AS account_role,
        primary_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern IN ('simple_expense', 'asset_purchase')
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        90 AS line_no,
        recognition_on AS posting_on,
        COALESCE(offset_account_id, cash_account_id) AS account_id,
        'offset' AS account_role,
        0 AS debit_amount_cents,
        primary_amount_cents AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern IN ('simple_expense', 'asset_purchase')
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        10 AS line_no,
        recognition_on AS posting_on,
        primary_account_id AS account_id,
        'destination' AS account_role,
        primary_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'transfer'
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        90 AS line_no,
        recognition_on AS posting_on,
        offset_account_id AS account_id,
        'source' AS account_role,
        0 AS debit_amount_cents,
        primary_amount_cents AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'transfer'
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        10 AS line_no,
        recognition_on AS posting_on,
        cash_account_id AS account_id,
        'cash' AS account_role,
        primary_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'owner_contribution'
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        90 AS line_no,
        recognition_on AS posting_on,
        primary_account_id AS account_id,
        'equity' AS account_role,
        0 AS debit_amount_cents,
        primary_amount_cents AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'owner_contribution'
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        10 AS line_no,
        recognition_on AS posting_on,
        primary_account_id AS account_id,
        'equity' AS account_role,
        primary_amount_cents AS debit_amount_cents,
        0 AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'owner_draw'
        AND primary_amount_cents <> 0
      UNION ALL
      SELECT
        record_id,
        90 AS line_no,
        recognition_on AS posting_on,
        cash_account_id AS account_id,
        'cash' AS account_role,
        0 AS debit_amount_cents,
        primary_amount_cents AS credit_amount_cents,
        currency,
        description
      FROM records
      WHERE posting_pattern = 'owner_draw'
        AND primary_amount_cents <> 0;`,
  },
  {
    name: "accounting_posting_lines_v",
    summary:
      "Canonical accounting-reporting surface for postable record lines with account semantics.",
    createStatement: `CREATE VIEW IF NOT EXISTS accounting_posting_lines_v AS
      SELECT
        records.entity_id,
        records.record_id,
        records.record_kind,
        records.posting_pattern,
        records.record_status,
        records.source_system,
        records.counterparty_id,
        records.platform_account_id,
        lines.posting_on,
        lines.line_no,
        lines.account_id,
        accounts.account_code,
        accounts.account_name,
        accounts.account_type,
        accounts.normal_balance,
        CASE
          WHEN accounts.account_type IN ('asset', 'liability', 'equity') THEN 'balance_sheet'
          WHEN accounts.account_type IN ('income', 'expense') THEN 'profit_and_loss'
          ELSE 'unclassified'
        END AS statement_section,
        lines.account_role,
        lines.debit_amount_cents,
        lines.credit_amount_cents,
        lines.debit_amount_cents - lines.credit_amount_cents AS net_amount_cents,
        CASE
          WHEN accounts.normal_balance = 'debit'
            THEN lines.debit_amount_cents - lines.credit_amount_cents
          ELSE lines.credit_amount_cents - lines.debit_amount_cents
        END AS normalized_balance_delta_cents,
        lines.currency,
        lines.description
      FROM record_double_entry_lines_v AS lines
      INNER JOIN records ON records.record_id = lines.record_id
      INNER JOIN accounts ON accounts.account_id = lines.account_id
      WHERE records.record_status IN (${accountingPostableRecordStatusSqlList});`,
  },
  {
    name: "income_snapshots_v",
    summary: "Compatibility view for grouped income snapshots derived from records.",
    createStatement: `CREATE VIEW IF NOT EXISTS income_snapshots_v AS
      SELECT
        entity_id,
        COALESCE(platform_account_id, 'unassigned') AS platform_account_id,
        currency AS payout_currency,
        SUBSTR(COALESCE(cash_on, recognition_on), 1, 7) AS payout_window,
        SUM(gross_amount_cents) AS gross_amount_cents,
        COUNT(*) AS record_count,
        MAX(updated_at) AS captured_at
      FROM records
      WHERE record_kind IN ('income', 'invoice_payment', 'platform_payout')
      GROUP BY
        entity_id,
        COALESCE(platform_account_id, 'unassigned'),
        currency,
        SUBSTR(COALESCE(cash_on, recognition_on), 1, 7);`,
  },
  {
    name: "invoice_records_v",
    summary: "Compatibility view for invoice-focused record projections.",
    createStatement: `CREATE VIEW IF NOT EXISTS invoice_records_v AS
      SELECT
        record_id AS id,
        entity_id,
        counterparty_id,
        invoice_number,
        description,
        primary_amount_cents AS amount_cents,
        currency,
        record_status AS status,
        due_on,
        cash_on AS paid_on
      FROM records
      WHERE record_kind IN ('invoice', 'receivable', 'invoice_payment');`,
  },
  {
    name: "expense_records_v",
    summary: "Compatibility view for expense-focused record projections.",
    createStatement: `CREATE VIEW IF NOT EXISTS expense_records_v AS
      SELECT
        record_id AS id,
        entity_id,
        counterparty_id,
        category_code AS category,
        subcategory_code AS subcategory,
        primary_amount_cents AS amount_cents,
        currency,
        COALESCE(cash_on, recognition_on) AS incurred_on,
        description AS note
      FROM records
      WHERE record_kind IN ('expense', 'asset_purchase', 'reimbursable_expense');`,
  },
] as const satisfies readonly StructuredViewContract[];

const structuredIndexes = [
  {
    name: "accounts_entity_code_idx",
    summary: "Enforces unique account codes per entity.",
    createStatement:
      "CREATE UNIQUE INDEX IF NOT EXISTS accounts_entity_code_idx ON accounts(entity_id, account_code);",
  },
  {
    name: "records_entity_recognition_idx",
    summary: "Speeds record timelines by entity and recognition date.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS records_entity_recognition_idx ON records(entity_id, recognition_on);",
  },
  {
    name: "records_status_due_idx",
    summary: "Speeds due-date and open-status record queries.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS records_status_due_idx ON records(entity_id, record_status, due_on);",
  },
  {
    name: "records_platform_idx",
    summary: "Speeds revenue and payout lookups by platform account.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS records_platform_idx ON records(platform_account_id, recognition_on);",
  },
  {
    name: "evidence_files_sha_idx",
    summary: "Supports de-duplication by file hash and size.",
    createStatement:
      "CREATE UNIQUE INDEX IF NOT EXISTS evidence_files_sha_idx ON evidence_files(sha256_hex, size_bytes);",
  },
  {
    name: "record_evidence_primary_idx",
    summary: "Speeds primary evidence lookup per record.",
    createStatement:
      "CREATE INDEX IF NOT EXISTS record_evidence_primary_idx ON record_evidence_links(record_id, is_primary);",
  },
] as const satisfies readonly StructuredIndexContract[];

const structuredSchemaStatements = [
  ...structuredTables.map((table) => table.createStatement),
  ...structuredViews.map((view) => view.createStatement),
  ...structuredIndexes.map((index) => index.createStatement),
] as const;
export const structuredStoreContract = {
  databaseName: "creator-cfo-local.db",
  version: 2,
  pragmas: structuredStorePragmas,
  tables: structuredTables,
  views: structuredViews,
  indexes: structuredIndexes,
  schemaStatements: structuredSchemaStatements,
} as const satisfies {
  databaseName: string;
  indexes: readonly StructuredIndexContract[];
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
      return buildEvidenceObjectPath(
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        "bin",
      );
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
    overview: getLocalStorageOverview(),
    pragmas: structuredStoreContract.pragmas,
    schemaStatements: structuredStoreContract.schemaStatements,
    structuredIndexes: structuredStoreContract.indexes,
    structuredTables: structuredStoreContract.tables,
    structuredViews: structuredStoreContract.views,
    version: structuredStoreContract.version,
  };
}
