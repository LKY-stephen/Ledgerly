import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  buildDatabaseDemoFieldUpdate,
  buildDatabaseDemoReportState,
  buildDatabaseDemoSummary,
  createDatabaseDemoFixture,
  createDatabaseDemoRecordDraft,
  createDatabaseDemoRecordLikePattern,
  createEmptyDatabaseDemoSnapshot,
  databaseDemoEditableFields,
  databaseDemoSourceSystem,
  formatAmountLabel,
  getNextDatabaseDemoRecordSequence,
} from "./demo-data";
import type {
  DatabaseDemoAccountingRow,
  DatabaseDemoDoubleEntryPreview,
  DatabaseDemoEditableField,
  DatabaseDemoEditableFieldOption,
  DatabaseDemoRecordDraft,
  DatabaseDemoRecordPreview,
  DatabaseDemoSnapshot,
} from "./demo-data";

type DemoDatabase = ReturnType<typeof useSQLiteContext>;

interface DemoRecordIdRow {
  recordId: string;
}

interface DemoRecordRow {
  currency: string;
  description: string;
  grossAmountCents: number;
  netCashAmountCents: number;
  recognitionOn: string;
  recordId: string;
  recordKind: string;
  recordStatus: string;
}

interface DemoEditableRecordRow {
  description: string;
  recordId: string;
  recordStatus: string;
}

interface DemoDoubleEntryRow {
  accountName: string | null;
  accountRole: string;
  creditAmountCents: number;
  currency: string;
  debitAmountCents: number;
  lineNo: number;
}

interface LoadSnapshotResult {
  selectedRecordId: string | null;
  snapshot: DatabaseDemoSnapshot;
}

export interface UseDatabaseDemoResult {
  createRecord: () => Promise<void>;
  deleteRecord: () => Promise<void>;
  editableFields: readonly DatabaseDemoEditableFieldOption[];
  error: string | null;
  isBusy: boolean;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  selectField: (field: DatabaseDemoEditableField) => void;
  selectRecord: (recordId: string) => Promise<void>;
  selectedField: DatabaseDemoEditableField;
  selectedRecordId: string | null;
  snapshot: DatabaseDemoSnapshot;
  updateSelectedRecord: () => Promise<void>;
}

export function useDatabaseDemo(): UseDatabaseDemoResult {
  const database = useSQLiteContext();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedField, setSelectedField] = useState<DatabaseDemoEditableField>(
    databaseDemoEditableFields[0]?.value ?? "description",
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DatabaseDemoSnapshot>(createEmptyDatabaseDemoSnapshot);

  useEffect(() => {
    let isMounted = true;

    loadSnapshot(database, null)
      .then((result) => {
        if (isMounted) {
          setSnapshot(result.snapshot);
          setSelectedRecordId(result.selectedRecordId);
          setIsLoaded(true);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(nextError));
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database]);

  async function runAction(action: () => Promise<string | null>): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const preferredSelectedRecordId = await action();
      const result = await loadSnapshot(database, preferredSelectedRecordId);
      setSnapshot(result.snapshot);
      setSelectedRecordId(result.selectedRecordId);
    } catch (nextError: unknown) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsBusy(false);
      setIsLoaded(true);
    }
  }

  async function refresh(): Promise<void> {
    await runAction(async () => selectedRecordId);
  }

  async function createRecord(): Promise<void> {
    await runAction(async () => {
      let createdRecordId: string | null = null;

      await database.withTransactionAsync(async () => {
        await ensureFixture(database);
        const existingRecordIds = await getDatabaseDemoRecordIds(database);
        const nextSequence = getNextDatabaseDemoRecordSequence(existingRecordIds);
        const draft = createDatabaseDemoRecordDraft(nextSequence);

        await insertRecord(database, draft);
        createdRecordId = draft.recordId;
      });

      return createdRecordId;
    });
  }

  async function updateSelectedRecord(): Promise<void> {
    await runAction(async () => {
      if (!selectedRecordId) {
        return null;
      }

      await database.withTransactionAsync(async () => {
        const existingRecord = await database.getFirstAsync<DemoEditableRecordRow>(
          `SELECT
            record_id AS recordId,
            description,
            record_status AS recordStatus
          FROM records
          WHERE record_id = ? AND source_system = ?
          LIMIT 1;`,
          selectedRecordId,
          databaseDemoSourceSystem,
        );

        if (!existingRecord) {
          return;
        }

        const update = buildDatabaseDemoFieldUpdate(existingRecord, selectedField);
        await updateRecordField(database, existingRecord.recordId, update.field, update.nextValue, update.updatedAt);
      });

      return selectedRecordId;
    });
  }

  async function deleteRecord(): Promise<void> {
    await runAction(async () => {
      if (!selectedRecordId) {
        return null;
      }

      await database.runAsync("DELETE FROM records WHERE record_id = ?;", selectedRecordId);
      return null;
    });
  }

  async function selectRecord(recordId: string): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const result = await loadSnapshot(database, recordId);
      setSnapshot(result.snapshot);
      setSelectedRecordId(result.selectedRecordId);
    } catch (nextError: unknown) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsBusy(false);
      setIsLoaded(true);
    }
  }

  return {
    createRecord,
    deleteRecord,
    editableFields: databaseDemoEditableFields,
    error,
    isBusy,
    isLoaded,
    refresh,
    selectField: setSelectedField,
    selectRecord,
    selectedField,
    selectedRecordId,
    snapshot,
    updateSelectedRecord,
  };
}

async function loadSnapshot(
  database: DemoDatabase,
  preferredSelectedRecordId: string | null,
): Promise<LoadSnapshotResult> {
  const recentRecords = await database.getAllAsync<DemoRecordRow>(
    `SELECT
      record_id AS recordId,
      record_kind AS recordKind,
      description,
      gross_amount_cents AS grossAmountCents,
      net_cash_amount_cents AS netCashAmountCents,
      currency,
      record_status AS recordStatus,
      recognition_on AS recognitionOn
    FROM records
    WHERE source_system = ? AND record_id LIKE ?
    ORDER BY recognition_on DESC, created_at DESC, record_id DESC;`,
    databaseDemoSourceSystem,
    createDatabaseDemoRecordLikePattern(),
  );

  const resolvedSelectedRecordId = resolveSelectedRecordId(recentRecords, preferredSelectedRecordId);

  const doubleEntryRows = resolvedSelectedRecordId
    ? await database.getAllAsync<DemoDoubleEntryRow>(
        `SELECT
          lines.line_no AS lineNo,
          lines.account_role AS accountRole,
          accounts.account_name AS accountName,
          lines.debit_amount_cents AS debitAmountCents,
          lines.credit_amount_cents AS creditAmountCents,
          lines.currency AS currency
        FROM record_double_entry_lines_v AS lines
        LEFT JOIN accounts ON accounts.account_id = lines.account_id
        WHERE lines.record_id = ?
        ORDER BY lines.line_no ASC;`,
        resolvedSelectedRecordId,
      )
    : [];
  const accountingRows = await database.getAllAsync<DatabaseDemoAccountingRow>(
    `SELECT
      record_id AS recordId,
      description,
      posting_on AS postingOn,
      line_no AS lineNo,
      account_role AS accountRole,
      account_code AS accountCode,
      account_name AS accountName,
      account_type AS accountType,
      normal_balance AS normalBalance,
      statement_section AS statementSection,
      debit_amount_cents AS debitAmountCents,
      credit_amount_cents AS creditAmountCents,
      normalized_balance_delta_cents AS normalizedBalanceDeltaCents,
      currency
    FROM accounting_posting_lines_v
    WHERE source_system = ? AND record_id LIKE ?
    ORDER BY posting_on ASC, record_id ASC, line_no ASC;`,
    databaseDemoSourceSystem,
    createDatabaseDemoRecordLikePattern(),
  );
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
    description: row.description,
    grossAmountLabel: formatAmountLabel(row.grossAmountCents, row.currency),
    netAmountLabel: formatAmountLabel(row.netCashAmountCents, row.currency),
    recognizedOn: row.recognitionOn,
    recordId: row.recordId,
    recordKind: row.recordKind,
    status: row.recordStatus,
  }));
}

function buildDoubleEntryPreview(rows: DemoDoubleEntryRow[]): DatabaseDemoDoubleEntryPreview[] {
  return rows.map((row) => ({
    accountName: row.accountName ?? "Unassigned account",
    accountRole: row.accountRole,
    amountLabel: formatAmountLabel(
      row.debitAmountCents > 0 ? row.debitAmountCents : row.creditAmountCents,
      row.currency,
    ),
    direction: row.debitAmountCents > 0 ? "debit" : "credit",
    lineNo: row.lineNo,
  }));
}

async function getDatabaseDemoRecordIds(database: DemoDatabase): Promise<string[]> {
  const rows = await database.getAllAsync<DemoRecordIdRow>(
    `SELECT record_id AS recordId
    FROM records
    WHERE source_system = ? AND record_id LIKE ?;`,
    databaseDemoSourceSystem,
    createDatabaseDemoRecordLikePattern(),
  );

  return rows.map((row) => row.recordId);
}

async function ensureFixture(database: DemoDatabase): Promise<void> {
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

  for (const account of fixture.accounts) {
    await database.runAsync(
      `INSERT OR IGNORE INTO accounts (
        account_id,
        entity_id,
        account_code,
        account_name,
        account_type,
        normal_balance,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      account.accountId,
      account.entityId,
      account.accountCode,
      account.accountName,
      account.accountType,
      account.normalBalance,
      account.createdAt,
    );
  }

  await database.runAsync(
    `INSERT OR IGNORE INTO counterparties (
      counterparty_id,
      entity_id,
      counterparty_type,
      legal_name,
      display_name,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    fixture.counterparty.counterpartyId,
    fixture.counterparty.entityId,
    fixture.counterparty.counterpartyType,
    fixture.counterparty.legalName,
    fixture.counterparty.displayName,
    fixture.counterparty.notes,
    fixture.counterparty.createdAt,
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO platform_accounts (
      platform_account_id,
      entity_id,
      platform_code,
      account_label,
      external_account_ref,
      active_from,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    fixture.platformAccount.platformAccountId,
    fixture.platformAccount.entityId,
    fixture.platformAccount.platformCode,
    fixture.platformAccount.accountLabel,
    fixture.platformAccount.externalAccountRef,
    fixture.platformAccount.activeFrom,
    fixture.platformAccount.createdAt,
  );
}

async function insertRecord(database: DemoDatabase, record: DatabaseDemoRecordDraft): Promise<void> {
  await database.runAsync(
    `INSERT INTO records (
      record_id,
      entity_id,
      record_kind,
      posting_pattern,
      record_status,
      source_system,
      counterparty_id,
      platform_account_id,
      description,
      evidence_status,
      recognition_on,
      cash_on,
      currency,
      gross_amount_cents,
      fee_amount_cents,
      withholding_amount_cents,
      net_cash_amount_cents,
      primary_account_id,
      cash_account_id,
      fee_account_id,
      withholding_account_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    record.recordId,
    record.entityId,
    record.recordKind,
    record.postingPattern,
    record.recordStatus,
    record.sourceSystem,
    record.counterpartyId,
    record.platformAccountId,
    record.description,
    record.evidenceStatus,
    record.recognitionOn,
    record.cashOn,
    record.currency,
    record.grossAmountCents,
    record.feeAmountCents,
    record.withholdingAmountCents,
    record.netCashAmountCents,
    record.primaryAccountId,
    record.cashAccountId,
    record.feeAccountId,
    record.withholdingAccountId,
    record.createdAt,
    record.updatedAt,
  );
}

async function updateRecordField(
  database: DemoDatabase,
  recordId: string,
  field: DatabaseDemoEditableField,
  nextValue: string,
  updatedAt: string,
): Promise<void> {
  if (field === "description") {
    await database.runAsync(
      `UPDATE records
      SET
        description = ?,
        updated_at = ?
      WHERE record_id = ?;`,
      nextValue,
      updatedAt,
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
    nextValue,
    updatedAt,
    recordId,
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown database demo error.";
}
