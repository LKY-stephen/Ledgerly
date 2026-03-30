export const databaseDemoIds = {
  cashAccountId: "demo-account-cash",
  counterpartyId: "demo-counterparty-platform",
  entityId: "demo-entity",
  feeAccountId: "demo-account-platform-fees",
  incomeAccountId: "demo-account-platform-income",
  platformAccountId: "demo-platform-youtube",
  recordIdPrefix: "demo-record-platform-payout",
  withholdingAccountId: "demo-account-withholding-tax",
} as const;

export const databaseDemoSourceSystem = "demo-hooks" as const;

export type DatabaseDemoEditableField = "description" | "recordStatus";
export type DatabaseDemoReportTab =
  | "postings"
  | "journal"
  | "generalLedger"
  | "balanceSheet"
  | "profitAndLoss";

export interface DatabaseDemoEditableFieldOption {
  description: string;
  label: string;
  value: DatabaseDemoEditableField;
}

export interface DatabaseDemoReportTabOption {
  description: string;
  label: string;
  value: DatabaseDemoReportTab;
}

export const databaseDemoEditableFields: readonly DatabaseDemoEditableFieldOption[] = [
  {
    description: "Toggle the selected record description between base and reviewed text.",
    label: "Description",
    value: "description",
  },
  {
    description: "Toggle the selected record status between posted and reconciled.",
    label: "Status",
    value: "recordStatus",
  },
];

export const databaseDemoReportTabs: readonly DatabaseDemoReportTabOption[] = [
  {
    description: "Inspect the selected record's derived posting lines directly.",
    label: "Postings",
    value: "postings",
  },
  {
    description: "Group current demo rows into journal-style entries ordered by record and line.",
    label: "Journal",
    value: "journal",
  },
  {
    description: "Review account-by-account activity and balances from the current demo ledger.",
    label: "General ledger",
    value: "generalLedger",
  },
  {
    description: "See current balance-sheet sections for the demo database, including current earnings.",
    label: "Balance sheet",
    value: "balanceSheet",
  },
  {
    description: "See current revenue, expense, and net-result totals from the demo database.",
    label: "P&L",
    value: "profitAndLoss",
  },
] as const;

export interface DatabaseDemoCounts {
  journalEntryCount: number;
  ledgerAccountCount: number;
  recordCount: number;
  selectedLineCount: number;
}

export interface DatabaseDemoRecordPreview {
  description: string;
  grossAmountLabel: string;
  netAmountLabel: string;
  recognizedOn: string;
  recordId: string;
  recordKind: string;
  status: string;
}

export interface DatabaseDemoDoubleEntryPreview {
  accountName: string;
  accountRole: string;
  amountLabel: string;
  direction: "credit" | "debit";
  lineNo: number;
}

export interface DatabaseDemoJournalLinePreview {
  accountLabel: string;
  accountRole: string;
  amountLabel: string;
  direction: "credit" | "debit";
  lineNo: number;
}

export interface DatabaseDemoJournalEntryPreview {
  creditTotalLabel: string;
  debitTotalLabel: string;
  description: string;
  lines: DatabaseDemoJournalLinePreview[];
  postingOn: string;
  recordId: string;
}

export interface DatabaseDemoLedgerLinePreview {
  amountLabel: string;
  direction: "credit" | "debit";
  postingOn: string;
  recordId: string;
  summary: string;
}

export interface DatabaseDemoLedgerAccountPreview {
  accountCode: string;
  accountName: string;
  accountType: string;
  activityLines: DatabaseDemoLedgerLinePreview[];
  balanceDirection: "credit" | "debit";
  balanceLabel: string;
  creditTotalLabel: string;
  debitTotalLabel: string;
  normalBalance: string;
}

export interface DatabaseDemoStatementLinePreview {
  amountLabel: string;
  label: string;
}

export interface DatabaseDemoStatementSectionPreview {
  lines: DatabaseDemoStatementLinePreview[];
  title: string;
  totalLabel: string;
}

export interface DatabaseDemoLedgerHealth {
  creditTotalLabel: string;
  debitTotalLabel: string;
  imbalanceLabel: string | null;
  isBalanced: boolean;
  warningText: string | null;
}

export interface DatabaseDemoAccountingRow {
  accountCode: string;
  accountName: string | null;
  accountRole: string;
  accountType: string;
  creditAmountCents: number;
  currency: string;
  debitAmountCents: number;
  description: string;
  lineNo: number;
  normalBalance: string;
  normalizedBalanceDeltaCents: number;
  postingOn: string;
  recordId: string;
  statementSection: string;
}

export interface DatabaseDemoSnapshot {
  balanceSheetSections: DatabaseDemoStatementSectionPreview[];
  counts: DatabaseDemoCounts;
  journalEntries: DatabaseDemoJournalEntryPreview[];
  ledgerAccounts: DatabaseDemoLedgerAccountPreview[];
  ledgerHealth: DatabaseDemoLedgerHealth;
  profitAndLossSections: DatabaseDemoStatementSectionPreview[];
  recentRecords: DatabaseDemoRecordPreview[];
  selectedPostingLines: DatabaseDemoDoubleEntryPreview[];
  summary: string;
}

export interface DatabaseDemoMetric {
  label: string;
  value: string;
}

export interface DatabaseDemoReportState {
  balanceSheetSections: DatabaseDemoStatementSectionPreview[];
  journalEntries: DatabaseDemoJournalEntryPreview[];
  ledgerAccounts: DatabaseDemoLedgerAccountPreview[];
  ledgerHealth: DatabaseDemoLedgerHealth;
  profitAndLossSections: DatabaseDemoStatementSectionPreview[];
}

interface DatabaseDemoEntityFixture {
  baseCurrency: string;
  createdAt: string;
  defaultTimezone: string;
  entityId: string;
  entityType: string;
  legalName: string;
}

interface DatabaseDemoAccountFixture {
  accountCode: string;
  accountId: string;
  accountName: string;
  accountType: string;
  createdAt: string;
  entityId: string;
  normalBalance: string;
}

interface DatabaseDemoCounterpartyFixture {
  counterpartyId: string;
  counterpartyType: string;
  createdAt: string;
  displayName: string;
  entityId: string;
  legalName: string;
  notes: string;
}

interface DatabaseDemoPlatformAccountFixture {
  accountLabel: string;
  activeFrom: string;
  createdAt: string;
  entityId: string;
  externalAccountRef: string;
  platformAccountId: string;
  platformCode: string;
}

export interface DatabaseDemoRecordDraft {
  cashAccountId: string;
  cashOn: string;
  counterpartyId: string;
  createdAt: string;
  currency: string;
  description: string;
  entityId: string;
  evidenceStatus: string;
  feeAccountId: string;
  feeAmountCents: number;
  grossAmountCents: number;
  netCashAmountCents: number;
  platformAccountId: string;
  postingPattern: string;
  primaryAccountId: string;
  recognitionOn: string;
  recordId: string;
  recordKind: string;
  recordStatus: string;
  sourceSystem: string;
  updatedAt: string;
  withholdingAccountId: string;
  withholdingAmountCents: number;
}

export interface DatabaseDemoFixture {
  accounts: DatabaseDemoAccountFixture[];
  counterparty: DatabaseDemoCounterpartyFixture;
  entity: DatabaseDemoEntityFixture;
  platformAccount: DatabaseDemoPlatformAccountFixture;
}

export interface DatabaseDemoFieldUpdateInput {
  description: string;
  recordId: string;
  recordStatus: string;
}

export interface DatabaseDemoFieldUpdate {
  field: DatabaseDemoEditableField;
  nextValue: string;
  updatedAt: string;
}

export function createDatabaseDemoFixture(): DatabaseDemoFixture {
  const createdAt = "2026-03-27T09:00:00.000Z";

  return {
    entity: {
      baseCurrency: "USD",
      createdAt,
      defaultTimezone: "America/Los_Angeles",
      entityId: databaseDemoIds.entityId,
      entityType: "sole_proprietorship",
      legalName: "Demo Creator LLC",
    },
    accounts: [
      {
        accountCode: "1010",
        accountId: databaseDemoIds.cashAccountId,
        accountName: "Business Checking",
        accountType: "asset",
        createdAt,
        entityId: databaseDemoIds.entityId,
        normalBalance: "debit",
      },
      {
        accountCode: "4010",
        accountId: databaseDemoIds.incomeAccountId,
        accountName: "Platform Revenue",
        accountType: "income",
        createdAt,
        entityId: databaseDemoIds.entityId,
        normalBalance: "credit",
      },
      {
        accountCode: "6050",
        accountId: databaseDemoIds.feeAccountId,
        accountName: "Platform Fees",
        accountType: "expense",
        createdAt,
        entityId: databaseDemoIds.entityId,
        normalBalance: "debit",
      },
      {
        accountCode: "2150",
        accountId: databaseDemoIds.withholdingAccountId,
        accountName: "Withholding Tax Receivable",
        accountType: "asset",
        createdAt,
        entityId: databaseDemoIds.entityId,
        normalBalance: "debit",
      },
    ],
    counterparty: {
      counterpartyId: databaseDemoIds.counterpartyId,
      counterpartyType: "platform",
      createdAt,
      displayName: "YouTube",
      entityId: databaseDemoIds.entityId,
      legalName: "YouTube Partner Program",
      notes: "Fixture row for the database CRUD demo.",
    },
    platformAccount: {
      accountLabel: "Main channel",
      activeFrom: "2026-01-01",
      createdAt,
      entityId: databaseDemoIds.entityId,
      externalAccountRef: "channel-demo-001",
      platformAccountId: databaseDemoIds.platformAccountId,
      platformCode: "youtube",
    },
  };
}

export function createDatabaseDemoRecordDraft(sequence: number): DatabaseDemoRecordDraft {
  const normalizedSequence = Math.max(1, Math.trunc(sequence));
  const baseDate = createDemoBaseDate(normalizedSequence);
  const grossAmountCents = 12_500 + (normalizedSequence - 1) * 2_100;
  const feeAmountCents = 1_250 + (normalizedSequence - 1) * 150;
  const withholdingAmountCents = 450 + (normalizedSequence - 1) * 50;

  return {
    cashAccountId: databaseDemoIds.cashAccountId,
    cashOn: formatDateOnly(baseDate),
    counterpartyId: databaseDemoIds.counterpartyId,
    createdAt: createIsoTimestamp(baseDate, 9, normalizedSequence),
    currency: "USD",
    description: `YouTube payout ${normalizedSequence}`,
    entityId: databaseDemoIds.entityId,
    evidenceStatus: "pending",
    feeAccountId: databaseDemoIds.feeAccountId,
    feeAmountCents,
    grossAmountCents,
    netCashAmountCents: grossAmountCents - feeAmountCents - withholdingAmountCents,
    platformAccountId: databaseDemoIds.platformAccountId,
    postingPattern: "gross_to_net_income",
    primaryAccountId: databaseDemoIds.incomeAccountId,
    recognitionOn: formatDateOnly(baseDate),
    recordId: createDatabaseDemoRecordId(normalizedSequence),
    recordKind: "platform_payout",
    recordStatus: "posted",
    sourceSystem: databaseDemoSourceSystem,
    updatedAt: createIsoTimestamp(baseDate, 10, normalizedSequence),
    withholdingAccountId: databaseDemoIds.withholdingAccountId,
    withholdingAmountCents,
  };
}

export function createDatabaseDemoRecordId(sequence: number): string {
  const normalizedSequence = Math.max(1, Math.trunc(sequence));

  if (normalizedSequence === 1) {
    return databaseDemoIds.recordIdPrefix;
  }

  return `${databaseDemoIds.recordIdPrefix}-${normalizedSequence}`;
}

export function createDatabaseDemoRecordLikePattern(): string {
  return `${databaseDemoIds.recordIdPrefix}%`;
}

export function isDatabaseDemoRecordId(recordId: string): boolean {
  return (
    recordId === databaseDemoIds.recordIdPrefix ||
    recordId.startsWith(`${databaseDemoIds.recordIdPrefix}-`)
  );
}

export function getDatabaseDemoRecordSequence(recordId: string): number | null {
  if (recordId === databaseDemoIds.recordIdPrefix) {
    return 1;
  }

  if (!recordId.startsWith(`${databaseDemoIds.recordIdPrefix}-`)) {
    return null;
  }

  const suffix = recordId.slice(databaseDemoIds.recordIdPrefix.length + 1);
  const sequence = Number.parseInt(suffix, 10);

  if (!Number.isInteger(sequence) || sequence < 2) {
    return null;
  }

  return sequence;
}

export function getNextDatabaseDemoRecordSequence(recordIds: readonly string[]): number {
  const sequences = recordIds
    .map((recordId) => getDatabaseDemoRecordSequence(recordId))
    .filter((sequence): sequence is number => sequence !== null);

  if (sequences.length === 0) {
    return 1;
  }

  return Math.max(...sequences) + 1;
}

export function buildDatabaseDemoFieldUpdate(
  record: DatabaseDemoFieldUpdateInput,
  field: DatabaseDemoEditableField,
): DatabaseDemoFieldUpdate {
  const sequence = getDatabaseDemoRecordSequence(record.recordId) ?? 1;
  const baseDraft = createDatabaseDemoRecordDraft(sequence);
  const updatedAt = createIsoTimestamp(createDemoBaseDate(sequence), field === "description" ? 12 : 13, sequence);

  if (field === "description") {
    const reviewedDescription = `${baseDraft.description} reviewed`;

    return {
      field,
      nextValue: record.description === reviewedDescription ? baseDraft.description : reviewedDescription,
      updatedAt,
    };
  }

  return {
    field,
    nextValue: record.recordStatus === "reconciled" ? "posted" : "reconciled",
    updatedAt,
  };
}

export function createEmptyDatabaseDemoSnapshot(): DatabaseDemoSnapshot {
  return {
    balanceSheetSections: [],
    counts: {
      journalEntryCount: 0,
      ledgerAccountCount: 0,
      recordCount: 0,
      selectedLineCount: 0,
    },
    journalEntries: [],
    ledgerAccounts: [],
    ledgerHealth: {
      creditTotalLabel: formatAmountLabel(0, "USD"),
      debitTotalLabel: formatAmountLabel(0, "USD"),
      imbalanceLabel: null,
      isBalanced: true,
      warningText: null,
    },
    profitAndLossSections: [],
    recentRecords: [],
    selectedPostingLines: [],
    summary:
      "No demo records exist yet. Use Create record to insert one or more deterministic rows, then inspect journal, general ledger, balance sheet, and profit/loss tabs.",
  };
}

export function buildDatabaseDemoMetrics(snapshot: DatabaseDemoSnapshot): DatabaseDemoMetric[] {
  return [
    {
      label: "Records",
      value: snapshot.counts.recordCount.toString(),
    },
    {
      label: "Selected lines",
      value: snapshot.counts.selectedLineCount.toString(),
    },
    {
      label: "Journal entries",
      value: snapshot.counts.journalEntryCount.toString(),
    },
    {
      label: "Ledger accounts",
      value: snapshot.counts.ledgerAccountCount.toString(),
    },
  ];
}

export function buildDatabaseDemoSummary(
  snapshot: DatabaseDemoSnapshot,
  selectedRecordId: string | null,
): string {
  if (snapshot.counts.recordCount === 0) {
    return "No demo records exist yet. Use Create record to insert one or more deterministic rows, then inspect journal, general ledger, balance sheet, and profit/loss tabs.";
  }

  const recordLabel = snapshot.counts.recordCount === 1 ? "record is" : "records are";
  const selectedLineLabel = snapshot.counts.selectedLineCount === 1 ? "line" : "lines";
  const healthSentence = snapshot.ledgerHealth.isBalanced
    ? "Ledger is balanced."
    : `Ledger warning: difference ${snapshot.ledgerHealth.imbalanceLabel}.`;

  if (!selectedRecordId) {
    return `${snapshot.counts.recordCount} demo ${recordLabel} present. Switch tabs to inspect journal, general ledger, balance sheet, and profit/loss from the current demo database. ${healthSentence}`;
  }

  return `${snapshot.counts.recordCount} demo ${recordLabel} present. Selected record ${selectedRecordId} exposes ${snapshot.counts.selectedLineCount} posting ${selectedLineLabel}. Switch tabs to inspect the current database reports. ${healthSentence}`;
}

export function formatAmountLabel(amountCents: number, currency: string): string {
  const absoluteAmount = Math.abs(amountCents);
  const wholeUnits = Math.floor(absoluteAmount / 100);
  const minorUnits = (absoluteAmount % 100).toString().padStart(2, "0");
  const sign = amountCents < 0 ? "-" : "";

  return `${sign}${currency} ${wholeUnits}.${minorUnits}`;
}

export function buildDatabaseDemoReportState(
  rows: readonly DatabaseDemoAccountingRow[],
): DatabaseDemoReportState {
  const currency = rows[0]?.currency ?? "USD";
  let totalCreditsCents = 0;
  let totalDebitsCents = 0;
  let totalExpenseCents = 0;
  let totalIncomeCents = 0;

  const journalEntries = new Map<
    string,
    {
      creditTotalCents: number;
      debitTotalCents: number;
      description: string;
      lines: DatabaseDemoJournalLinePreview[];
      postingOn: string;
      recordId: string;
    }
  >();
  const ledgerAccounts = new Map<
    string,
    {
      accountCode: string;
      accountName: string;
      accountType: string;
      activityLines: DatabaseDemoLedgerLinePreview[];
      balanceCents: number;
      creditTotalCents: number;
      debitTotalCents: number;
      normalBalance: string;
    }
  >();
  const balanceSheetAccounts = new Map<
    string,
    {
      accountName: string;
      accountType: string;
      balanceCents: number;
    }
  >();
  const profitAndLossAccounts = new Map<
    string,
    {
      accountName: string;
      accountType: string;
      balanceCents: number;
    }
  >();

  for (const row of rows) {
    totalDebitsCents += row.debitAmountCents;
    totalCreditsCents += row.creditAmountCents;

    const amountCents = row.debitAmountCents > 0 ? row.debitAmountCents : row.creditAmountCents;
    const direction = row.debitAmountCents > 0 ? "debit" : "credit";
    const accountLabel = buildDatabaseDemoAccountLabel(row.accountCode, row.accountName);

    const journalEntry =
      journalEntries.get(row.recordId) ??
      {
        creditTotalCents: 0,
        debitTotalCents: 0,
        description: row.description,
        lines: [],
        postingOn: row.postingOn,
        recordId: row.recordId,
      };
    journalEntry.debitTotalCents += row.debitAmountCents;
    journalEntry.creditTotalCents += row.creditAmountCents;
    journalEntry.lines.push({
      accountLabel,
      accountRole: row.accountRole,
      amountLabel: formatAmountLabel(amountCents, row.currency),
      direction,
      lineNo: row.lineNo,
    });
    journalEntries.set(row.recordId, journalEntry);

    const ledgerAccountKey = `${row.accountCode}:${row.accountName ?? "account"}`;
    const ledgerAccount =
      ledgerAccounts.get(ledgerAccountKey) ??
      {
        accountCode: row.accountCode,
        accountName: row.accountName ?? "Unassigned account",
        accountType: row.accountType,
        activityLines: [],
        balanceCents: 0,
        creditTotalCents: 0,
        debitTotalCents: 0,
        normalBalance: row.normalBalance,
      };
    ledgerAccount.debitTotalCents += row.debitAmountCents;
    ledgerAccount.creditTotalCents += row.creditAmountCents;
    ledgerAccount.balanceCents += row.normalizedBalanceDeltaCents;
    ledgerAccount.activityLines.push({
      amountLabel: formatAmountLabel(amountCents, row.currency),
      direction,
      postingOn: row.postingOn,
      recordId: row.recordId,
      summary: row.description,
    });
    ledgerAccounts.set(ledgerAccountKey, ledgerAccount);

    if (row.statementSection === "balance_sheet") {
      const balanceSheetAccount =
        balanceSheetAccounts.get(ledgerAccountKey) ??
        {
          accountName: accountLabel,
          accountType: row.accountType,
          balanceCents: 0,
        };
      balanceSheetAccount.balanceCents += row.normalizedBalanceDeltaCents;
      balanceSheetAccounts.set(ledgerAccountKey, balanceSheetAccount);
    }

    if (row.statementSection === "profit_and_loss") {
      const profitAndLossAccount =
        profitAndLossAccounts.get(ledgerAccountKey) ??
        {
          accountName: accountLabel,
          accountType: row.accountType,
          balanceCents: 0,
        };
      profitAndLossAccount.balanceCents += row.normalizedBalanceDeltaCents;
      profitAndLossAccounts.set(ledgerAccountKey, profitAndLossAccount);

      if (row.accountType === "income") {
        totalIncomeCents += row.normalizedBalanceDeltaCents;
      }

      if (row.accountType === "expense") {
        totalExpenseCents += row.normalizedBalanceDeltaCents;
      }
    }
  }

  const currentEarningsCents = totalIncomeCents - totalExpenseCents;
  const imbalanceCents = totalDebitsCents - totalCreditsCents;
  const balanceSheetSections = buildDatabaseDemoBalanceSheetSections(
    balanceSheetAccounts,
    currentEarningsCents,
    currency,
  );
  const profitAndLossSections = buildDatabaseDemoProfitAndLossSections(
    profitAndLossAccounts,
    totalIncomeCents,
    totalExpenseCents,
    currency,
  );

  return {
    balanceSheetSections,
    journalEntries: Array.from(journalEntries.values())
      .sort((left, right) => {
        if (left.postingOn === right.postingOn) {
          return left.recordId.localeCompare(right.recordId);
        }

        return left.postingOn.localeCompare(right.postingOn);
      })
      .map((entry) => ({
        creditTotalLabel: formatAmountLabel(entry.creditTotalCents, currency),
        debitTotalLabel: formatAmountLabel(entry.debitTotalCents, currency),
        description: entry.description,
        lines: entry.lines.sort((left, right) => left.lineNo - right.lineNo),
        postingOn: entry.postingOn,
        recordId: entry.recordId,
      })),
    ledgerAccounts: Array.from(ledgerAccounts.values())
      .sort((left, right) => left.accountCode.localeCompare(right.accountCode))
      .map((account) => ({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        activityLines: account.activityLines,
        balanceDirection: resolveDatabaseDemoBalanceDirection(
          account.balanceCents,
          account.normalBalance,
        ),
        balanceLabel: formatAmountLabel(Math.abs(account.balanceCents), currency),
        creditTotalLabel: formatAmountLabel(account.creditTotalCents, currency),
        debitTotalLabel: formatAmountLabel(account.debitTotalCents, currency),
        normalBalance: account.normalBalance,
      })),
    ledgerHealth: {
      creditTotalLabel: formatAmountLabel(totalCreditsCents, currency),
      debitTotalLabel: formatAmountLabel(totalDebitsCents, currency),
      imbalanceLabel:
        imbalanceCents === 0 ? null : formatAmountLabel(Math.abs(imbalanceCents), currency),
      isBalanced: imbalanceCents === 0,
      warningText:
        imbalanceCents === 0
          ? null
          : `Warning: the current demo ledger is unbalanced by ${formatAmountLabel(
              Math.abs(imbalanceCents),
              currency,
            )}.`,
    },
    profitAndLossSections,
  };
}

function createDemoBaseDate(sequence: number): Date {
  return new Date(Date.UTC(2026, 2, 26 + sequence, 0, 0, 0));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createIsoTimestamp(date: Date, hour: number, minuteOffset: number): string {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour,
      minuteOffset,
      0,
      0,
    ),
  ).toISOString();
}

function buildDatabaseDemoAccountLabel(accountCode: string, accountName: string | null): string {
  if (accountCode && accountName) {
    return `${accountCode} · ${accountName}`;
  }

  return accountName ?? accountCode ?? "Unassigned account";
}

function resolveDatabaseDemoBalanceDirection(
  balanceCents: number,
  normalBalance: string,
): "credit" | "debit" {
  if (balanceCents === 0) {
    return normalBalance === "credit" ? "credit" : "debit";
  }

  if (balanceCents > 0) {
    return normalBalance === "credit" ? "credit" : "debit";
  }

  return normalBalance === "credit" ? "debit" : "credit";
}

function buildDatabaseDemoBalanceSheetSections(
  accounts: Map<
    string,
    {
      accountName: string;
      accountType: string;
      balanceCents: number;
    }
  >,
  currentEarningsCents: number,
  currency: string,
): DatabaseDemoStatementSectionPreview[] {
  const sectionOrder = [
    { accountType: "asset", title: "Assets" },
    { accountType: "liability", title: "Liabilities" },
    { accountType: "equity", title: "Equity" },
  ] as const;
  const sections: DatabaseDemoStatementSectionPreview[] = [];

  for (const section of sectionOrder) {
    const lines = Array.from(accounts.values())
      .filter((account) => account.accountType === section.accountType)
      .sort((left, right) => left.accountName.localeCompare(right.accountName))
      .map((account) => ({
        amountLabel: formatAmountLabel(account.balanceCents, currency),
        balanceCents: account.balanceCents,
        label: account.accountName,
      }));

    if (section.accountType === "equity" && currentEarningsCents !== 0) {
      lines.push({
        amountLabel: formatAmountLabel(currentEarningsCents, currency),
        balanceCents: currentEarningsCents,
        label: "Current earnings",
      });
    }

    if (lines.length === 0) {
      continue;
    }

    const totalCents = lines.reduce((sum, line) => sum + line.balanceCents, 0);
    sections.push({
      lines: lines.map((line) => ({
        amountLabel: line.amountLabel,
        label: line.label,
      })),
      title: section.title,
      totalLabel: formatAmountLabel(totalCents, currency),
    });
  }

  return sections;
}

function buildDatabaseDemoProfitAndLossSections(
  accounts: Map<
    string,
    {
      accountName: string;
      accountType: string;
      balanceCents: number;
    }
  >,
  totalIncomeCents: number,
  totalExpenseCents: number,
  currency: string,
): DatabaseDemoStatementSectionPreview[] {
  const sectionOrder = [
    { accountType: "income", title: "Income" },
    { accountType: "expense", title: "Expenses" },
  ] as const;
  const sections: DatabaseDemoStatementSectionPreview[] = [];

  for (const section of sectionOrder) {
    const lines = Array.from(accounts.values())
      .filter((account) => account.accountType === section.accountType)
      .sort((left, right) => left.accountName.localeCompare(right.accountName))
      .map((account) => ({
        amountLabel: formatAmountLabel(account.balanceCents, currency),
        label: account.accountName,
      }));

    if (lines.length === 0) {
      continue;
    }

    const totalCents = section.accountType === "income" ? totalIncomeCents : totalExpenseCents;
    sections.push({
      lines,
      title: section.title,
      totalLabel: formatAmountLabel(totalCents, currency),
    });
  }

  const netIncomeCents = totalIncomeCents - totalExpenseCents;

  if (sections.length === 0) {
    return sections;
  }

  sections.push({
    lines: [
      {
        amountLabel: formatAmountLabel(netIncomeCents, currency),
        label: "Current period result",
      },
    ],
    title: netIncomeCents >= 0 ? "Net income" : "Net loss",
    totalLabel: formatAmountLabel(netIncomeCents, currency),
  });

  return sections;
}
