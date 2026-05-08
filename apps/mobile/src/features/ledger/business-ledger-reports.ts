import type { LedgerlySDK, RecordRow } from "@ledgerly/sdk";

import type { ResolvedLocale } from "../app-shell/types";
import {
  buildLedgerSnapshotFromRows,
  ledgerPostableStatuses,
  type LedgerPeriodOption,
  type LedgerScreenSnapshot,
  type LedgerScopeId,
} from "./ledger-reporting";

type BusinessLedgerSdk = Pick<LedgerlySDK, "searchRecordsByDateRange">;
type SupportedLedgerRecordKind =
  | "expense"
  | "income"
  | "non_business_income"
  | "personal_spending";

interface LedgerSdkRecordRow {
  amountCents: number;
  businessUseBps: number;
  createdAt: string;
  currency: string;
  description: string;
  memo: string | null;
  occurredOn: string;
  recordId: string;
  recordKind: SupportedLedgerRecordKind;
  sourceLabel: string;
  targetLabel: string;
  taxLineCode: string | null;
}

const businessSearchRecordKinds: RecordRow["recordKind"][] = [
  "income",
  "invoice_payment",
  "platform_payout",
  "expense",
  "reimbursable_expense",
];

const balanceSearchRecordKinds: RecordRow["recordKind"][] = [
  ...businessSearchRecordKinds,
  "non_business_income",
  "personal_spending",
];

export type BusinessLedgerReportsState =
  | { status: "error"; error: string }
  | { status: "idle" }
  | { status: "loading" }
  | { snapshot: LedgerScreenSnapshot; status: "ready" };

export async function loadBusinessLedgerReportSnapshot(input: {
  locale: ResolvedLocale;
  period: LedgerPeriodOption;
  sdk: BusinessLedgerSdk;
}): Promise<LedgerScreenSnapshot> {
  const [periodRows, profitLossRows, balanceSheetRows] = await Promise.all([
    loadSdkRowsForRange(input.sdk, {
      endOn: input.period.endDate,
      recordKinds: businessSearchRecordKinds,
      startOn: input.period.startDate,
    }),
    loadSdkRowsForRange(input.sdk, {
      endOn: input.period.endDate,
      recordKinds: balanceSearchRecordKinds,
      startOn: input.period.startDate,
    }),
    loadSdkRowsForRange(input.sdk, {
      endOn: input.period.endDate,
      recordKinds: balanceSearchRecordKinds,
      startOn: "0001-01-01",
    }),
  ]);

  return buildLedgerSnapshotFromSdkRecords({
    balanceSheetRows,
    locale: input.locale,
    periodRows,
    profitLossRows,
    selectedPeriod: input.period,
    selectedScope: "business",
  });
}

export function buildLedgerSnapshotFromSdkRecords(input: {
  balanceSheetRows?: readonly RecordRow[];
  locale?: ResolvedLocale;
  periodRows: readonly RecordRow[];
  profitLossRows?: readonly RecordRow[];
  selectedPeriod: LedgerPeriodOption;
  selectedScope: LedgerScopeId;
}): LedgerScreenSnapshot {
  const locale = input.locale ?? "en";
  const mappedPeriodRows = mapSdkRowsToLedgerRows(input.periodRows);
  const mappedProfitLossRows = mapSdkRowsToLedgerRows(input.profitLossRows ?? []);
  const mappedBalanceSheetRows = mapSdkRowsToLedgerRows(
    input.balanceSheetRows ?? [],
  );

  return buildLedgerSnapshotFromRows(mappedPeriodRows, {
    balanceSheetRows: mappedBalanceSheetRows,
    locale,
    periodOptions: [input.selectedPeriod],
    profitLossRows: mappedProfitLossRows,
    segmentOptions: [],
    selectedPeriod: input.selectedPeriod,
    selectedScope: input.selectedScope,
    yearOptions: [
      {
        id: String(input.selectedPeriod.year),
        label: String(input.selectedPeriod.year),
        year: input.selectedPeriod.year,
      },
    ],
  });
}

export function createIdleBusinessLedgerReportsState(): BusinessLedgerReportsState {
  return { status: "idle" };
}

export function createBusinessLedgerReportsErrorMessage(
  error: unknown,
  locale: ResolvedLocale,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return locale === "zh-CN"
    ? "经营报表加载失败。"
    : "Business reports failed to load.";
}

export function hasLedgerPeriodRange(
  period: Pick<LedgerPeriodOption, "endDate" | "startDate">,
): boolean {
  return Boolean(period.startDate && period.endDate);
}

async function loadSdkRowsForRange(
  sdk: BusinessLedgerSdk,
  input: {
    endOn: string;
    recordKinds: readonly string[];
    startOn: string;
  },
): Promise<RecordRow[]> {
  return sdk.searchRecordsByDateRange({
    endOn: input.endOn,
    recordKinds: [...input.recordKinds],
    recordStatuses: ledgerPostableStatuses,
    startOn: input.startOn,
  });
}

function mapSdkRowsToLedgerRows(rows: readonly RecordRow[]): LedgerSdkRecordRow[] {
  return rows
    .map((row) => mapSdkRowToLedgerRow(row))
    .filter((row): row is LedgerSdkRecordRow => row !== null);
}

function mapSdkRowToLedgerRow(row: RecordRow): LedgerSdkRecordRow | null {
  const recordKind = normalizeLedgerRecordKind(row.recordKind);

  if (!recordKind) {
    return null;
  }

  return {
    amountCents: row.amountCents,
    businessUseBps: row.businessUseBps,
    createdAt: row.createdAt,
    currency: row.currency,
    description: row.description,
    memo: row.memo,
    occurredOn: row.occurredOn,
    recordId: row.recordId,
    recordKind,
    sourceLabel: row.sourceLabel,
    targetLabel: row.targetLabel,
    taxLineCode: row.taxLineCode,
  };
}

function normalizeLedgerRecordKind(
  recordKind: string,
): SupportedLedgerRecordKind | null {
  if (
    recordKind === "income" ||
    recordKind === "invoice_payment" ||
    recordKind === "platform_payout"
  ) {
    return "income";
  }

  if (recordKind === "expense" || recordKind === "reimbursable_expense") {
    return "expense";
  }

  if (recordKind === "non_business_income") {
    return "non_business_income";
  }

  if (recordKind === "personal_spending") {
    return "personal_spending";
  }

  return null;
}
