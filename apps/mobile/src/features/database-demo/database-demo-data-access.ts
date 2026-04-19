import {
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  type ReadableStorageDatabase,
  type WritableStorageDatabase,
} from "@ledgerly/storage";

import {
  buildDatabaseDemoReportState,
  buildDatabaseDemoSummary,
  createDatabaseDemoFixture,
  createDatabaseDemoRecordLikePattern,
  createDatabaseDemoStandardReceiptDraft,
  databaseDemoSourceSystem,
  formatAmountLabel,
  formatDatabaseDemoClassificationLabel,
  getNextDatabaseDemoRecordSequence,
  type DatabaseDemoAccountingRow,
  type DatabaseDemoDoubleEntryPreview,
  type DatabaseDemoFieldUpdate,
  type DatabaseDemoReceiptClassification,
  type DatabaseDemoRecordPreview,
  type DatabaseDemoSnapshot,
} from "./demo-data";

interface DemoRecordIdRow {
  recordId: string;
}

interface DemoRecordRow {
  amountCents: number;
  currency: string;
  description: string;
  occurredOn: string;
  recordId: string;
  recordKind: string;
  recordStatus: string;
  userClassification: DatabaseDemoReceiptClassification | null;
}

export interface DemoEditableRecordRow {
  description: string;
  recordId: string;
  recordStatus: string;
  userClassification: DatabaseDemoReceiptClassification | null;
}

interface DemoDoubleEntryRow {
  accountName: string;
  accountRole: string;
  creditAmountCents: number;
  currency: string;
  debitAmountCents: number;
  lineNo: number;
}

export interface LoadDatabaseDemoSnapshotResult {
  selectedRecordId: string | null;
  snapshot: DatabaseDemoSnapshot;
}

export async function loadDatabaseDemoSnapshot(
  database: ReadableStorageDatabase,
  preferredSelectedRecordId: string | null,
): Promise<LoadDatabaseDemoSnapshotResult> {
  const recentRecords = await database.getAllAsync<DemoRecordRow>(
    `SELECT
      r.record_id AS recordId,
      r.record_kind AS recordKind,
      classification.user_classification AS userClassification,
      r.description,
      r.amount_cents AS amountCents,
      r.currency,
      r.record_status AS recordStatus,
      r.occurred_on AS occurredOn
    FROM records AS r
    LEFT JOIN record_entry_classifications AS classification
      ON classification.record_id = r.record_id
    WHERE r.source_system = ? AND r.record_id LIKE ?
    ORDER BY r.occurred_on DESC, r.created_at DESC, r.record_id DESC;`,
    databaseDemoSourceSystem,
    createDatabaseDemoRecordLikePattern(),
  );

  const resolvedSelectedRecordId = resolveSelectedRecordId(recentRecords, preferredSelectedRecordId);
  const doubleEntryRows = resolvedSelectedRecordId
    ? buildDatabaseDemoPostingRows(
        recentRecords.find((record) => record.recordId === resolvedSelectedRecordId) ?? null,
      )
    : [];
  const accountingRows = recentRecords.flatMap((record) => buildDatabaseDemoAccountingRows(record));
  const reportState = buildDatabaseDemoReportState(accountingRows);

  const snapshot: DatabaseDemoSnapshot = {
    balanceSheetSections: reportState.balanceSheetSections,
    counts: {
      journalEntryCount: reportState.journalEntries.length,
      ledgerAccountCount: reportState.ledgerAccounts.length,
      recordCount: recentRecords.length,
      selectedLineCount: doubleEntryRows.length,
    },
    journalEntries: reportState.journalEntries,
    ledgerAccounts: reportState.ledgerAccounts,
    ledgerHealth: reportState.ledgerHealth,
    profitAndLossSections: reportState.profitAndLossSections,
    recentRecords: buildRecentRecordPreview(recentRecords),
    selectedPostingLines: buildDoubleEntryPreview(doubleEntryRows),
    summary: "",
  };

  snapshot.summary = buildDatabaseDemoSummary(snapshot, resolvedSelectedRecordId);

  return {
    selectedRecordId: resolvedSelectedRecordId,
    snapshot,
  };
}

export async function listDatabaseDemoRecordIds(database: ReadableStorageDatabase): Promise<string[]> {
  const rows = await database.getAllAsync<DemoRecordIdRow>(
    `SELECT record_id AS recordId
    FROM records
    WHERE source_system = ? AND record_id LIKE ?;`,
    databaseDemoSourceSystem,
    createDatabaseDemoRecordLikePattern(),
  );

  return rows.map((row) => row.recordId);
}

export async function ensureDatabaseDemoFixture(database: WritableStorageDatabase): Promise<void> {
  const fixture = createDatabaseDemoFixture();

  await database.runAsync(
    `INSERT OR IGNORE INTO entities (
      entity_id,
      legal_name,
      entity_type,
      base_currency,
      default_timezone,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    fixture.entity.entityId,
    fixture.entity.legalName,
    fixture.entity.entityType,
    fixture.entity.baseCurrency,
    fixture.entity.defaultTimezone,
    fixture.entity.createdAt,
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO counterparties (
      counterparty_id,
      entity_id,
      counterparty_type,
      display_name,
      raw_reference,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    fixture.counterparty.counterpartyId,
    fixture.counterparty.entityId,
    fixture.counterparty.counterpartyType,
    fixture.counterparty.displayName,
    fixture.counterparty.legalName,
    fixture.counterparty.notes,
    fixture.counterparty.createdAt,
  );
}

export async function createDatabaseDemoRecord(
  database: WritableStorageDatabase,
  classification: DatabaseDemoReceiptClassification,
): Promise<string> {
  await ensureDatabaseDemoFixture(database);
  const existingRecordIds = await listDatabaseDemoRecordIds(database);
  const nextSequence = getNextDatabaseDemoRecordSequence(existingRecordIds);
  const draft = createDatabaseDemoStandardReceiptDraft(nextSequence, classification);
  const resolvedEntry = resolveStandardReceiptEntry(draft.input, draft.persistenceContext);

  await persistResolvedStandardReceiptEntry(database, resolvedEntry);

  return resolvedEntry.record.recordId;
}

export async function loadDatabaseDemoEditableRecord(
  database: ReadableStorageDatabase,
  recordId: string,
): Promise<DemoEditableRecordRow | null> {
  return database.getFirstAsync<DemoEditableRecordRow>(
    `SELECT
      r.record_id AS recordId,
      r.description,
      r.record_status AS recordStatus,
      classification.user_classification AS userClassification
    FROM records AS r
    LEFT JOIN record_entry_classifications AS classification
      ON classification.record_id = r.record_id
    WHERE r.record_id = ? AND r.source_system = ?
    LIMIT 1;`,
    recordId,
    databaseDemoSourceSystem,
  );
}

export async function updateDatabaseDemoRecordField(
  database: WritableStorageDatabase,
  recordId: string,
  update: DatabaseDemoFieldUpdate,
): Promise<void> {
  if (update.field === "description") {
    await database.runAsync(
      `UPDATE records
      SET
        description = ?,
        updated_at = ?
      WHERE record_id = ?;`,
      update.nextValue,
      update.updatedAt,
      recordId,
    );

    return;
  }

  await database.runAsync(
    `UPDATE records
    SET
      record_status = ?,
      updated_at = ?
    WHERE record_id = ?;`,
    update.nextValue,
    update.updatedAt,
    recordId,
  );
}

function resolveSelectedRecordId(
  records: readonly DemoRecordRow[],
  preferredSelectedRecordId: string | null,
): string | null {
  if (records.length === 0) {
    return null;
  }

  if (preferredSelectedRecordId && records.some((record) => record.recordId === preferredSelectedRecordId)) {
    return preferredSelectedRecordId;
  }

  return records[0]?.recordId ?? null;
}

function buildRecentRecordPreview(rows: DemoRecordRow[]): DatabaseDemoRecordPreview[] {
  return rows.map((row) => ({
    amountLabel: formatAmountLabel(row.amountCents, row.currency),
    cashMovementLabel: formatAmountLabel(row.amountCents, row.currency),
    classificationLabel: formatDatabaseDemoClassificationLabel(row.userClassification),
    description: row.description,
    occurredOn: row.occurredOn,
    recordId: row.recordId,
    recordKind: row.recordKind,
    status: row.recordStatus,
  }));
}

function buildDoubleEntryPreview(rows: DemoDoubleEntryRow[]): DatabaseDemoDoubleEntryPreview[] {
  return rows.map((row) => ({
    accountName: row.accountName,
    accountRole: row.accountRole,
    amountLabel: formatAmountLabel(
      row.debitAmountCents > 0 ? row.debitAmountCents : row.creditAmountCents,
      row.currency,
    ),
    direction: row.debitAmountCents > 0 ? "debit" : "credit",
    lineNo: row.lineNo,
  }));
}

function buildDatabaseDemoPostingRows(record: DemoRecordRow | null): DemoDoubleEntryRow[] {
  if (!record) {
    return [];
  }

  const amountCents = record.amountCents;
  const baseLine = {
    currency: record.currency,
  };

  if (record.recordKind === "income") {
    return [
      {
        ...baseLine,
        accountName: "Business Checking",
        accountRole: "cash",
        creditAmountCents: 0,
        debitAmountCents: amountCents,
        lineNo: 1,
      },
      {
        ...baseLine,
        accountName: "Platform Revenue",
        accountRole: "income",
        creditAmountCents: amountCents,
        debitAmountCents: 0,
        lineNo: 2,
      },
    ];
  }

  if (record.recordKind === "expense") {
    return [
      {
        ...baseLine,
        accountName: "Office Expense",
        accountRole: "expense",
        creditAmountCents: 0,
        debitAmountCents: amountCents,
        lineNo: 1,
      },
      {
        ...baseLine,
        accountName: "Business Checking",
        accountRole: "cash",
        creditAmountCents: amountCents,
        debitAmountCents: 0,
        lineNo: 2,
      },
    ];
  }

  return [
    {
      ...baseLine,
      accountName: "Owner Equity",
      accountRole: "equity",
      creditAmountCents: 0,
      debitAmountCents: amountCents,
      lineNo: 1,
    },
    {
      ...baseLine,
      accountName: "Business Checking",
      accountRole: "cash",
      creditAmountCents: amountCents,
      debitAmountCents: 0,
      lineNo: 2,
    },
  ];
}

function buildDatabaseDemoAccountingRows(record: DemoRecordRow): DatabaseDemoAccountingRow[] {
  const amountCents = record.amountCents;
  const baseRow = {
    currency: record.currency,
    description: record.description,
    postingOn: record.occurredOn,
    recordId: record.recordId,
  };

  if (record.recordKind === "income") {
    return [
      {
        ...baseRow,
        accountCode: "1010",
        accountName: "Business Checking",
        accountRole: "cash",
        accountType: "asset",
        creditAmountCents: 0,
        debitAmountCents: amountCents,
        lineNo: 1,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: amountCents,
        statementSection: "balance_sheet",
      },
      {
        ...baseRow,
        accountCode: "4010",
        accountName: "Platform Revenue",
        accountRole: "income",
        accountType: "income",
        creditAmountCents: amountCents,
        debitAmountCents: 0,
        lineNo: 2,
        normalBalance: "credit",
        normalizedBalanceDeltaCents: amountCents,
        statementSection: "profit_and_loss",
      },
    ];
  }

  if (record.recordKind === "expense") {
    return [
      {
        ...baseRow,
        accountCode: "6100",
        accountName: "Office Expense",
        accountRole: "expense",
        accountType: "expense",
        creditAmountCents: 0,
        debitAmountCents: amountCents,
        lineNo: 1,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: amountCents,
        statementSection: "profit_and_loss",
      },
      {
        ...baseRow,
        accountCode: "1010",
        accountName: "Business Checking",
        accountRole: "cash",
        accountType: "asset",
        creditAmountCents: amountCents,
        debitAmountCents: 0,
        lineNo: 2,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: -amountCents,
        statementSection: "balance_sheet",
      },
    ];
  }

  return [
    {
      ...baseRow,
      accountCode: "3010",
      accountName: "Owner Equity",
      accountRole: "equity",
      accountType: "equity",
      creditAmountCents: 0,
      debitAmountCents: amountCents,
      lineNo: 1,
      normalBalance: "credit",
      normalizedBalanceDeltaCents: -amountCents,
      statementSection: "balance_sheet",
    },
    {
      ...baseRow,
      accountCode: "1010",
      accountName: "Business Checking",
      accountRole: "cash",
      accountType: "asset",
      creditAmountCents: amountCents,
      debitAmountCents: 0,
      lineNo: 2,
      normalBalance: "debit",
      normalizedBalanceDeltaCents: -amountCents,
      statementSection: "balance_sheet",
    },
  ];
}
