import { accountingPostableRecordStatuses } from "./contracts";
import type { ReadableStorageDatabase } from "./database";

export interface ReportingDateRange {
  startDate: string;
  endDate: string;
}

export interface ProfitAndLossSummary {
  period: ReportingDateRange;
  revenueRows: Array<{ counterparty: string; totalCents: number }>;
  expenseRows: Array<{ counterparty: string; totalCents: number }>;
  totalRevenueCents: number;
  totalExpenseCents: number;
  netIncomeCents: number;
}

export interface BalanceSheetSummary {
  asOfDate: string;
  openingBalanceCents: number;
  periodRevenueCents: number;
  periodExpenseCents: number;
  closingBalanceCents: number;
}

export interface GeneralLedgerEntry {
  date: string;
  description: string;
  amountCents: number;
  recordKind: string;
  source: string;
  target: string;
}

export interface GeneralLedgerSummary {
  period: ReportingDateRange;
  entries: GeneralLedgerEntry[];
  totalDebitsCents: number;
  totalCreditsCents: number;
  entryCount: number;
}

const postableStatuses = accountingPostableRecordStatuses.map(() => "?").join(", ");
const postableParams = [...accountingPostableRecordStatuses];

export async function loadProfitAndLossSummary(
  database: ReadableStorageDatabase,
  entityId: string,
  range: ReportingDateRange,
): Promise<ProfitAndLossSummary> {
  interface GroupedRow { counterparty: string; total_cents: number }

  const revenueRows = await database.getAllAsync<GroupedRow>(
    `SELECT target_label AS counterparty, SUM(amount_cents) AS total_cents
     FROM records
     WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
       AND record_kind IN ('income', 'invoice_payment', 'platform_payout')
       AND record_status IN (${postableStatuses})
     GROUP BY target_label
     ORDER BY total_cents DESC`,
    entityId, range.startDate, range.endDate, ...postableParams,
  );

  const expenseRows = await database.getAllAsync<GroupedRow>(
    `SELECT target_label AS counterparty, SUM(amount_cents) AS total_cents
     FROM records
     WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
       AND record_kind IN ('expense', 'reimbursable_expense')
       AND record_status IN (${postableStatuses})
     GROUP BY target_label
     ORDER BY total_cents DESC`,
    entityId, range.startDate, range.endDate, ...postableParams,
  );

  const totalRevenueCents = revenueRows.reduce((sum, r) => sum + r.total_cents, 0);
  const totalExpenseCents = expenseRows.reduce((sum, r) => sum + r.total_cents, 0);

  return {
    period: range,
    revenueRows: revenueRows.map((r) => ({ counterparty: r.counterparty, totalCents: r.total_cents })),
    expenseRows: expenseRows.map((r) => ({ counterparty: r.counterparty, totalCents: r.total_cents })),
    totalRevenueCents,
    totalExpenseCents,
    netIncomeCents: totalRevenueCents - totalExpenseCents,
  };
}

export async function loadBalanceSheetSummary(
  database: ReadableStorageDatabase,
  entityId: string,
  range: ReportingDateRange,
): Promise<BalanceSheetSummary> {
  interface SumRow { total: number }

  const openingIncome = await database.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM records
     WHERE entity_id = ? AND occurred_on < ?
       AND record_kind IN ('income', 'invoice_payment', 'platform_payout')
       AND record_status IN (${postableStatuses})`,
    entityId, range.startDate, ...postableParams,
  );

  const openingExpense = await database.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM records
     WHERE entity_id = ? AND occurred_on < ?
       AND record_kind IN ('expense', 'reimbursable_expense', 'personal_spending')
       AND record_status IN (${postableStatuses})`,
    entityId, range.startDate, ...postableParams,
  );

  const periodIncome = await database.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM records
     WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
       AND record_kind IN ('income', 'invoice_payment', 'platform_payout')
       AND record_status IN (${postableStatuses})`,
    entityId, range.startDate, range.endDate, ...postableParams,
  );

  const periodExpense = await database.getFirstAsync<SumRow>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
     FROM records
     WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
       AND record_kind IN ('expense', 'reimbursable_expense', 'personal_spending')
       AND record_status IN (${postableStatuses})`,
    entityId, range.startDate, range.endDate, ...postableParams,
  );

  const openingBalanceCents = (openingIncome?.total ?? 0) - (openingExpense?.total ?? 0);
  const periodRevenueCents = periodIncome?.total ?? 0;
  const periodExpenseCents = periodExpense?.total ?? 0;

  return {
    asOfDate: range.endDate,
    openingBalanceCents,
    periodRevenueCents,
    periodExpenseCents,
    closingBalanceCents: openingBalanceCents + periodRevenueCents - periodExpenseCents,
  };
}

export async function loadGeneralLedgerSummary(
  database: ReadableStorageDatabase,
  entityId: string,
  range: ReportingDateRange,
): Promise<GeneralLedgerSummary> {
  interface EntryRow {
    occurred_on: string;
    description: string;
    amount_cents: number;
    record_kind: string;
    source_label: string;
    target_label: string;
  }

  const rows = await database.getAllAsync<EntryRow>(
    `SELECT occurred_on, description, amount_cents, record_kind, source_label, target_label
     FROM records
     WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
       AND record_status IN (${postableStatuses})
     ORDER BY occurred_on, record_id`,
    entityId, range.startDate, range.endDate, ...postableParams,
  );

  let totalDebitsCents = 0;
  let totalCreditsCents = 0;

  const entries: GeneralLedgerEntry[] = rows.map((r) => {
    if (r.record_kind === "income" || r.record_kind === "invoice_payment" || r.record_kind === "platform_payout") {
      totalDebitsCents += r.amount_cents;
      totalCreditsCents += r.amount_cents;
    } else {
      totalCreditsCents += r.amount_cents;
      totalDebitsCents += r.amount_cents;
    }

    return {
      date: r.occurred_on,
      description: r.description,
      amountCents: r.amount_cents,
      recordKind: r.record_kind,
      source: r.source_label,
      target: r.target_label,
    };
  });

  return {
    period: range,
    entries,
    totalDebitsCents,
    totalCreditsCents,
    entryCount: entries.length,
  };
}
