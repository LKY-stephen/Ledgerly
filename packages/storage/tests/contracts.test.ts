import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  accountingPostableRecordStatuses,
  accountingReportAccountTypes,
  accountingStatementSectionsByAccountType,
  buildDeviceStateStorageKey,
  buildEvidenceDerivedPath,
  buildEvidenceManifestPath,
  buildEvidenceObjectPath,
  buildInvoiceExportPath,
  buildTaxSupportPath,
  buildVaultRelativePath,
  createLocalStorageBootstrapManifest,
  deviceStateContract,
  fileVaultContract,
  getLocalStorageBootstrapPlan,
  getLocalStorageOverview,
  getVaultCollectionSamplePath,
  sanitizeVaultFileName,
  structuredStoreContract,
} from "../src/index";

interface SqliteRowRecordIds {
  recordId: string;
}

interface SqliteRowBalanceCheck {
  creditTotal: number;
  debitTotal: number;
  recordId: string;
}

interface SqliteJournalRow {
  lineNo: number;
  postingOn: string;
  recordId: string;
}

interface SqliteLedgerBalanceRow {
  accountCode: string;
  balanceCents: number;
}

interface SqliteStatementBalanceRow {
  accountType: string;
  balanceCents: number;
}

type SqliteInputValue = Uint8Array | bigint | null | number | string;

function createContractDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  return database;
}

function seedAccountingFixture(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO entities (
        entity_id,
        legal_name,
        entity_type,
        base_currency,
        default_timezone,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
    )
    .run(
      "entity-main",
      "Creator CFO Demo Books",
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      "2026-03-01T08:00:00.000Z",
    );

  const insertAccount = database.prepare(
    `INSERT INTO accounts (
      account_id,
      entity_id,
      account_code,
      account_name,
      account_type,
      normal_balance,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
  );

  const accounts = [
    ["account-cash", "1010", "Business Checking", "asset", "debit"],
    ["account-savings", "1020", "Tax Savings", "asset", "debit"],
    ["account-withholding", "1200", "Withholding Tax Receivable", "asset", "debit"],
    ["account-equipment", "1500", "Camera Equipment", "asset", "debit"],
    ["account-payable", "2100", "Accounts Payable", "liability", "credit"],
    ["account-equity", "3010", "Owner Capital", "equity", "credit"],
    ["account-income", "4010", "Platform Revenue", "income", "credit"],
    ["account-fees", "6050", "Platform Fees", "expense", "debit"],
    ["account-expense", "6100", "Office Expense", "expense", "debit"],
  ] as const;

  for (const [accountId, accountCode, accountName, accountType, normalBalance] of accounts) {
    insertAccount.run(
      accountId,
      "entity-main",
      accountCode,
      accountName,
      accountType,
      normalBalance,
      "2026-03-01T08:00:00.000Z",
    );
  }

  const insertRecord = database.prepare(
    `INSERT INTO records (
      record_id,
      entity_id,
      record_kind,
      posting_pattern,
      record_status,
      source_system,
      description,
      evidence_status,
      recognition_on,
      currency,
      primary_amount_cents,
      gross_amount_cents,
      fee_amount_cents,
      withholding_amount_cents,
      net_cash_amount_cents,
      primary_account_id,
      cash_account_id,
      fee_account_id,
      withholding_account_id,
      offset_account_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );

  insertRecord.run(
    "record-income-posted",
    "entity-main",
    "platform_payout",
    "gross_to_net_income",
    "posted",
    "contract-test",
    "YouTube March payout",
    "attached",
    "2026-03-01",
    "USD",
    0,
    100000,
    10000,
    5000,
    85000,
    "account-income",
    "account-cash",
    "account-fees",
    "account-withholding",
    null,
    "2026-03-01T09:00:00.000Z",
    "2026-03-01T09:05:00.000Z",
  );

  insertRecord.run(
    "record-expense-posted",
    "entity-main",
    "expense",
    "simple_expense",
    "posted",
    "contract-test",
    "Studio rent accrual",
    "attached",
    "2026-03-02",
    "USD",
    20000,
    0,
    0,
    0,
    0,
    "account-expense",
    null,
    null,
    null,
    "account-payable",
    "2026-03-02T09:00:00.000Z",
    "2026-03-02T09:05:00.000Z",
  );

  insertRecord.run(
    "record-asset-posted",
    "entity-main",
    "asset_purchase",
    "asset_purchase",
    "posted",
    "contract-test",
    "Camera body purchase",
    "attached",
    "2026-03-03",
    "USD",
    30000,
    0,
    0,
    0,
    0,
    "account-equipment",
    "account-cash",
    null,
    null,
    null,
    "2026-03-03T09:00:00.000Z",
    "2026-03-03T09:05:00.000Z",
  );

  insertRecord.run(
    "record-transfer-posted",
    "entity-main",
    "transfer",
    "transfer",
    "posted",
    "contract-test",
    "Move cash to tax savings",
    "attached",
    "2026-03-04",
    "USD",
    15000,
    0,
    0,
    0,
    0,
    "account-savings",
    null,
    null,
    null,
    "account-cash",
    "2026-03-04T09:00:00.000Z",
    "2026-03-04T09:05:00.000Z",
  );

  insertRecord.run(
    "record-contribution-posted",
    "entity-main",
    "owner_contribution",
    "owner_contribution",
    "posted",
    "contract-test",
    "Owner funds business checking",
    "attached",
    "2026-03-05",
    "USD",
    40000,
    0,
    0,
    0,
    0,
    "account-equity",
    "account-cash",
    null,
    null,
    null,
    "2026-03-05T09:00:00.000Z",
    "2026-03-05T09:05:00.000Z",
  );

  insertRecord.run(
    "record-draw-reconciled",
    "entity-main",
    "owner_draw",
    "owner_draw",
    "reconciled",
    "contract-test",
    "Owner draw",
    "attached",
    "2026-03-06",
    "USD",
    5000,
    0,
    0,
    0,
    0,
    "account-equity",
    "account-cash",
    null,
    null,
    null,
    "2026-03-06T09:00:00.000Z",
    "2026-03-06T09:05:00.000Z",
  );

  insertRecord.run(
    "record-draft-income",
    "entity-main",
    "platform_payout",
    "gross_to_net_income",
    "draft",
    "contract-test",
    "Draft TikTok payout",
    "pending",
    "2026-03-07",
    "USD",
    0,
    1000,
    100,
    50,
    850,
    "account-income",
    "account-cash",
    "account-fees",
    "account-withholding",
    null,
    "2026-03-07T09:00:00.000Z",
    "2026-03-07T09:05:00.000Z",
  );
}

function selectAllRows<Row>(
  database: DatabaseSync,
  sql: string,
  ...params: SqliteInputValue[]
): Row[] {
  return database.prepare(sql).all({}, ...params) as unknown as Row[];
}

function selectOneRow<Row>(
  database: DatabaseSync,
  sql: string,
  ...params: SqliteInputValue[]
): Row {
  return database.prepare(sql).get({}, ...params) as unknown as Row;
}

describe("storage contracts", () => {
  it("implements the required version-2 finance tables and views", () => {
    expect(structuredStoreContract.version).toBe(2);
    expect(structuredStoreContract.tables.map((table) => table.name)).toEqual([
      "entities",
      "accounts",
      "counterparties",
      "platform_accounts",
      "records",
      "evidences",
      "evidence_files",
      "record_evidence_links",
    ]);
    expect(structuredStoreContract.views.map((view) => view.name)).toEqual([
      "record_double_entry_lines_v",
      "accounting_posting_lines_v",
      "income_snapshots_v",
      "invoice_records_v",
      "expense_records_v",
    ]);
    expect(structuredStoreContract.indexes.map((index) => index.name)).toEqual([
      "accounts_entity_code_idx",
      "records_entity_recognition_idx",
      "records_status_due_idx",
      "records_platform_idx",
      "evidence_files_sha_idx",
      "record_evidence_primary_idx",
    ]);
    expect(accountingPostableRecordStatuses).toEqual(["posted", "reconciled"]);
    expect(accountingReportAccountTypes).toEqual([
      "asset",
      "liability",
      "equity",
      "income",
      "expense",
    ]);
    expect(accountingStatementSectionsByAccountType.asset).toBe("balance_sheet");
    expect(accountingStatementSectionsByAccountType.income).toBe("profit_and_loss");
  });

  it("exposes a bootstrap plan that other components can consume directly", () => {
    const plan = getLocalStorageBootstrapPlan();
    const overview = getLocalStorageOverview();

    expect(plan.databaseName).toBe("creator-cfo-local.db");
    expect(plan.version).toBe(2);
    expect(plan.pragmas).toContain("PRAGMA foreign_keys = ON;");
    expect(plan.schemaStatements).toHaveLength(
      structuredStoreContract.tables.length +
        structuredStoreContract.views.length +
        structuredStoreContract.indexes.length,
    );
    expect(overview.tableCount).toBe(structuredStoreContract.tables.length);
    expect(overview.viewCount).toBe(structuredStoreContract.views.length);
    expect(overview.collectionCount).toBe(fileVaultContract.collections.length);
  });

  it("builds version-2 evidence and export paths", () => {
    expect(
      buildEvidenceObjectPath(
        "ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789",
        ".PDF",
      ),
    ).toBe(
      "evidence-objects/ab/cd/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789.pdf",
    );
    expect(buildEvidenceManifestPath("Evidence 001")).toBe(
      "evidence-manifests/evidence-001.json",
    );
    expect(buildEvidenceDerivedPath("Evidence 001", "Preview 1.JPG")).toBe(
      "evidence-derived/evidence-001/preview-1.jpg",
    );
    expect(buildInvoiceExportPath("Record 99", 2026)).toBe("invoice-exports/2026/record-99.pdf");
    expect(buildTaxSupportPath("2026/Q1", "Evidence Package.ZIP")).toBe(
      "tax-support/2026-q1/evidence-package.zip",
    );
    expect(buildVaultRelativePath("evidence-manifests", "Statement 01.PDF")).toBe(
      "evidence-manifests/statement-01.pdf",
    );
    expect(sanitizeVaultFileName("...")).toBe("file");
  });

  it("builds a bootstrap manifest for the version-2 vault layout", () => {
    const manifest = createLocalStorageBootstrapManifest();

    expect(manifest.version).toBe(2);
    expect(manifest.fileCollections.map((collection) => collection.slug)).toContain(
      "evidence-objects",
    );
    expect(manifest.schemaObjects.views).toContain("record_double_entry_lines_v");
    expect(getVaultCollectionSamplePath("tax-support")).toBe(
      "tax-support/2026-q1/evidence-package.zip",
    );
  });

  it("keeps the canonical contract doc aligned with the implemented version", () => {
    const contractDocPath = fileURLToPath(
      new URL("../../../docs/contracts/local-storage.md", import.meta.url),
    );
    const contractDoc = readFileSync(contractDocPath, "utf8");

    expect(contractDoc).toContain("Current implemented contract version: `2`");
    expect(contractDoc).toContain("Implemented tables:");
    expect(contractDoc).toContain("Implemented views:");
    expect(contractDoc).toContain("`accounting_posting_lines_v`");
    expect(contractDoc).toContain("Postable accounting statuses:");
    expect(contractDoc).toContain("Many-to-many record-to-evidence linkage is required.");
    expect(contractDoc).toContain("buildDeviceStateStorageKey()");
  });

  it("documents the persisted device state keys", () => {
    expect(deviceStateContract.records.map((record) => record.key)).toEqual([
      "theme_preference",
      "locale_preference",
      "auth_session",
    ]);
    expect(buildDeviceStateStorageKey("auth_session")).toBe(
      "@creator-cfo/mobile/auth_session",
    );
  });

  it("excludes draft records from the canonical accounting-reporting surface", () => {
    const database = createContractDatabase();
    seedAccountingFixture(database);

    const rawRecordIds = selectAllRows<SqliteRowRecordIds>(
      database,
      `SELECT DISTINCT record_id AS recordId
        FROM record_double_entry_lines_v
        ORDER BY record_id;`,
    );
    const canonicalRecordIds = selectAllRows<SqliteRowRecordIds>(
      database,
      `SELECT DISTINCT record_id AS recordId
        FROM accounting_posting_lines_v
        ORDER BY record_id;`,
    );

    expect(rawRecordIds.map((row) => row.recordId)).toContain("record-draft-income");
    expect(canonicalRecordIds.map((row) => row.recordId)).not.toContain("record-draft-income");
    expect(canonicalRecordIds.map((row) => row.recordId)).toEqual([
      "record-asset-posted",
      "record-contribution-posted",
      "record-draw-reconciled",
      "record-expense-posted",
      "record-income-posted",
      "record-transfer-posted",
    ]);
  });

  it("keeps each postable record balanced on the canonical accounting surface", () => {
    const database = createContractDatabase();
    seedAccountingFixture(database);

    const rows = selectAllRows<SqliteRowBalanceCheck>(
      database,
      `SELECT
          record_id AS recordId,
          SUM(debit_amount_cents) AS debitTotal,
          SUM(credit_amount_cents) AS creditTotal
        FROM accounting_posting_lines_v
        GROUP BY record_id
        ORDER BY record_id;`,
    );

    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.debitTotal === row.creditTotal)).toBe(true);
  });

  it("derives journal-book ordering and general-ledger balances from the same view", () => {
    const database = createContractDatabase();
    seedAccountingFixture(database);

    const journalRows = selectAllRows<SqliteJournalRow>(
      database,
      `SELECT
          posting_on AS postingOn,
          record_id AS recordId,
          line_no AS lineNo
        FROM accounting_posting_lines_v
        ORDER BY posting_on, record_id, line_no;`,
    );
    const ledgerRows = selectAllRows<SqliteLedgerBalanceRow>(
      database,
      `SELECT
          account_code AS accountCode,
          SUM(normalized_balance_delta_cents) AS balanceCents
        FROM accounting_posting_lines_v
        GROUP BY account_code
        ORDER BY account_code;`,
    );

    expect(journalRows.map((row) => `${row.postingOn}:${row.recordId}:${row.lineNo}`)).toEqual([
      "2026-03-01:record-income-posted:10",
      "2026-03-01:record-income-posted:20",
      "2026-03-01:record-income-posted:30",
      "2026-03-01:record-income-posted:90",
      "2026-03-02:record-expense-posted:10",
      "2026-03-02:record-expense-posted:90",
      "2026-03-03:record-asset-posted:10",
      "2026-03-03:record-asset-posted:90",
      "2026-03-04:record-transfer-posted:10",
      "2026-03-04:record-transfer-posted:90",
      "2026-03-05:record-contribution-posted:10",
      "2026-03-05:record-contribution-posted:90",
      "2026-03-06:record-draw-reconciled:10",
      "2026-03-06:record-draw-reconciled:90",
    ]);
    expect(ledgerRows).toEqual([
      { accountCode: "1010", balanceCents: 75000 },
      { accountCode: "1020", balanceCents: 15000 },
      { accountCode: "1200", balanceCents: 5000 },
      { accountCode: "1500", balanceCents: 30000 },
      { accountCode: "2100", balanceCents: 20000 },
      { accountCode: "3010", balanceCents: 35000 },
      { accountCode: "4010", balanceCents: 100000 },
      { accountCode: "6050", balanceCents: 10000 },
      { accountCode: "6100", balanceCents: 20000 },
    ]);
  });

  it("derives balance-sheet and profit/loss totals from the canonical accounting surface", () => {
    const database = createContractDatabase();
    seedAccountingFixture(database);

    const balanceSheetRows = selectAllRows<SqliteStatementBalanceRow>(
      database,
      `SELECT
          account_type AS accountType,
          SUM(normalized_balance_delta_cents) AS balanceCents
        FROM accounting_posting_lines_v
        WHERE statement_section = 'balance_sheet'
          AND posting_on <= ?
        GROUP BY account_type
        ORDER BY account_type;`,
      "2026-03-31",
    );
    const profitAndLossRows = selectAllRows<SqliteStatementBalanceRow>(
      database,
      `SELECT
          account_type AS accountType,
          SUM(normalized_balance_delta_cents) AS balanceCents
        FROM accounting_posting_lines_v
        WHERE statement_section = 'profit_and_loss'
          AND posting_on BETWEEN ? AND ?
        GROUP BY account_type
        ORDER BY account_type;`,
      "2026-03-01",
      "2026-03-31",
    );
    const currentEarningsRow = selectOneRow<{ balanceCents: number }>(
      database,
      `SELECT
          SUM(
            CASE
              WHEN account_type = 'income' THEN normalized_balance_delta_cents
              WHEN account_type = 'expense' THEN -normalized_balance_delta_cents
              ELSE 0
            END
          ) AS balanceCents
        FROM accounting_posting_lines_v
        WHERE posting_on <= ?;`,
      "2026-03-31",
    );

    expect(balanceSheetRows).toEqual([
      { accountType: "asset", balanceCents: 125000 },
      { accountType: "equity", balanceCents: 35000 },
      { accountType: "liability", balanceCents: 20000 },
    ]);
    expect(profitAndLossRows).toEqual([
      { accountType: "expense", balanceCents: 30000 },
      { accountType: "income", balanceCents: 100000 },
    ]);
    expect(currentEarningsRow.balanceCents).toBe(70000);

    const assetTotal =
      balanceSheetRows.find((row) => row.accountType === "asset")?.balanceCents ?? 0;
    const liabilityTotal =
      balanceSheetRows.find((row) => row.accountType === "liability")?.balanceCents ?? 0;
    const equityTotal =
      balanceSheetRows.find((row) => row.accountType === "equity")?.balanceCents ?? 0;
    const netIncome =
      (profitAndLossRows.find((row) => row.accountType === "income")?.balanceCents ?? 0) -
      (profitAndLossRows.find((row) => row.accountType === "expense")?.balanceCents ?? 0);

    expect(netIncome).toBe(70000);
    expect(assetTotal).toBe(liabilityTotal + equityTotal + currentEarningsRow.balanceCents);
  });
});
