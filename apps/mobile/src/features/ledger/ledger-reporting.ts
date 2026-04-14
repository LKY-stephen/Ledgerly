import {
  accountingPostableRecordStatuses,
  type ReadableStorageDatabase,
} from "@creator-cfo/storage";

import {
  defaultEntityId,
  formatCurrencyFromCents,
} from "./ledger-domain";
import type { ResolvedLocale } from "../app-shell/types";
import {
  formatLedgerDisplayDate,
  formatLedgerMonthChip,
  formatLedgerMonthTitle,
  formatLedgerQuarterTitle,
  formatLedgerRangeSummary,
  formatLedgerRecordCount,
  formatLedgerReferenceSubtitle,
  type GeneralLedgerEntryKind,
  getLedgerRuntimeCopy,
} from "./ledger-localization";

export type LedgerViewId = "general-ledger" | "balance-sheet" | "profit-loss";
export type LedgerScopeId = "business" | "personal";

export type LedgerPeriodSegmentId =
  | "full-year"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "m01"
  | "m02"
  | "m03"
  | "m04"
  | "m05"
  | "m06"
  | "m07"
  | "m08"
  | "m09"
  | "m10"
  | "m11"
  | "m12";

export interface LedgerYearOption {
  id: string;
  label: string;
  year: number;
}

export interface LedgerPeriodSegmentOption {
  endDate: string;
  id: LedgerPeriodSegmentId;
  label: string;
  startDate: string;
  summary: string;
}

export interface LedgerPeriodOption {
  endDate: string;
  id: string;
  label: string;
  segmentId: LedgerPeriodSegmentId;
  startDate: string;
  summary: string;
  year: number;
}

export interface LedgerMetricCard {
  accent?: "danger" | "neutral" | "success";
  id: string;
  label: string;
  value: string;
}

export interface LedgerSectionRow {
  amount: string;
  id: string;
  label: string;
  note: string;
}

export interface GeneralLedgerPostingLine {
  accountName: string;
  amount: string;
  detail: string;
  id: string;
  side: "credit" | "debit";
}

export interface GeneralLedgerEntry {
  amount: string;
  dateLabel: string;
  id: string;
  kind: GeneralLedgerEntryKind;
  kindLabel: string;
  lines: GeneralLedgerPostingLine[];
  subtitle: string;
  title: string;
}

export interface GeneralLedgerSnapshot {
  debitTotal: string;
  entries: GeneralLedgerEntry[];
  metricCards: LedgerMetricCard[];
  recordCountLabel: string;
}

export interface BalanceSheetSnapshot {
  assetRows: LedgerSectionRow[];
  carryForwardRows: LedgerSectionRow[];
  equationSummary: string;
  equityAmount: string;
  equityRows: LedgerSectionRow[];
  liabilityRows: LedgerSectionRow[];
  metricCards: LedgerMetricCard[];
  netPositionLabel: string;
}

export interface ProfitAndLossSnapshot {
  expenseRows: LedgerSectionRow[];
  metricCards: LedgerMetricCard[];
  netIncomeLabel: string;
  revenueRows: LedgerSectionRow[];
}

export interface LedgerScreenSnapshot {
  balanceSheet: BalanceSheetSnapshot;
  generalLedger: GeneralLedgerSnapshot;
  hasData: boolean;
  isEmpty: boolean;
  periodOptions: LedgerPeriodOption[];
  profitAndLoss: ProfitAndLossSnapshot;
  selectedScope: LedgerScopeId;
  segmentOptions: LedgerPeriodSegmentOption[];
  selectedPeriod: LedgerPeriodOption;
  yearOptions: LedgerYearOption[];
}

interface LedgerRecordRow {
  amountCents: number;
  businessUseBps: number;
  createdAt: string;
  currency: string;
  description: string;
  memo: string | null;
  occurredOn: string;
  recordId: string;
  recordKind: "expense" | "income" | "personal_spending";
  sourceLabel: string;
  targetLabel: string;
  taxLineCode: string | null;
}

interface LedgerAvailableDateRow {
  occurredOn: string;
}

const monthSegmentIds = [
  "m01",
  "m02",
  "m03",
  "m04",
  "m05",
  "m06",
  "m07",
  "m08",
  "m09",
  "m10",
  "m11",
  "m12",
] as const satisfies readonly LedgerPeriodSegmentId[];
const quarterSegmentIds = ["q1", "q2", "q3", "q4"] as const satisfies readonly LedgerPeriodSegmentId[];
const businessLedgerRecordKinds = [
  "income",
  "expense",
] as const satisfies readonly LedgerRecordRow["recordKind"][];
const personalLedgerRecordKinds = [
  "personal_spending",
] as const satisfies readonly LedgerRecordRow["recordKind"][];
const balanceSheetLedgerRecordKinds = [
  "income",
  "expense",
  "personal_spending",
] as const satisfies readonly LedgerRecordRow["recordKind"][];
const unavailableLedgerPeriodId = "unavailable";

export async function loadLedgerSnapshot(
  database: ReadableStorageDatabase,
  input: {
    entityId?: string;
    forceDefaultSelection?: boolean;
    locale?: ResolvedLocale;
    now?: string;
    preferredPeriodId?: string | null;
    scopeId?: LedgerScopeId;
  } = {},
): Promise<LedgerScreenSnapshot> {
  const entityId = input.entityId ?? defaultEntityId;
  const locale = input.locale ?? "en";
  const scopeId = input.scopeId ?? "business";
  const scopeRecordKinds = buildScopeRecordKinds(scopeId);
  const availabilityRecordKinds = buildBalanceSheetRecordKinds();
  const availabilityRecordKindsLiteral = buildRecordKindsLiteral(availabilityRecordKinds);
  const occurredOnRows = await database.getAllAsync<LedgerAvailableDateRow>(
    `SELECT DISTINCT
      occurred_on AS occurredOn
    FROM records
    WHERE entity_id = ?
      AND record_status IN ('posted', 'reconciled')
      AND record_kind IN ${availabilityRecordKindsLiteral}
    ORDER BY occurred_on DESC;`,
    entityId,
  );

  const availability = buildLedgerAvailability(
    occurredOnRows.map((row) => normalizeIsoDate(row.occurredOn)),
    locale,
  );
  const selectedPeriod = resolveSelectedLedgerPeriod({
    forceDefaultSelection: input.forceDefaultSelection ?? false,
    locale,
    periodOptions: availability.periodOptions,
    preferredPeriodId: input.preferredPeriodId ?? null,
    yearOptions: availability.yearOptions,
  });
  const segmentOptions = availability.segmentOptionsByYear.get(selectedPeriod.year) ?? [];
  const earliestOccurredOn = occurredOnRows[occurredOnRows.length - 1]?.occurredOn
    ? normalizeIsoDate(occurredOnRows[occurredOnRows.length - 1].occurredOn)
    : null;
  const periodRows =
    availability.periodOptions.length > 0
      ? await loadLedgerRowsForRange(database, {
          endDate: selectedPeriod.endDate,
          entityId,
          recordKinds: scopeRecordKinds,
          startDate: selectedPeriod.startDate,
        })
      : [];
  const profitLossRows =
    availability.periodOptions.length > 0
      ? await loadLedgerRowsForRange(database, {
          endDate: selectedPeriod.endDate,
          entityId,
          recordKinds: availabilityRecordKinds,
          startDate: selectedPeriod.startDate,
        })
      : [];
  const balanceSheetRows =
    availability.periodOptions.length > 0 && earliestOccurredOn
      ? await loadLedgerRowsForRange(database, {
          endDate: selectedPeriod.endDate,
          entityId,
          recordKinds: availabilityRecordKinds,
          startDate: earliestOccurredOn,
        })
      : [];

  return buildLedgerSnapshotFromRows(periodRows, {
    balanceSheetRows,
    locale,
    profitLossRows,
    periodOptions: availability.periodOptions,
    selectedScope: scopeId,
    segmentOptions,
    selectedPeriod,
    yearOptions: availability.yearOptions,
  });
}

export function buildLedgerPeriodId(year: number, segmentId: LedgerPeriodSegmentId): string {
  return `${year}:${segmentId}`;
}

export function getDefaultLedgerPeriodId(
  yearOptions: readonly LedgerYearOption[],
): string | null {
  const latestYear = yearOptions[0]?.year;
  return typeof latestYear === "number"
    ? buildLedgerPeriodId(latestYear, "full-year")
    : null;
}

export function buildLedgerYearOptions(years: readonly number[]): LedgerYearOption[] {
  return [...years]
    .sort((left, right) => right - left)
    .map((year) => ({
      id: String(year),
      label: String(year),
      year,
    }));
}

export function buildLedgerSegmentOptions(
  year: number,
  availableSegmentIds?: ReadonlySet<LedgerPeriodSegmentId>,
  locale: ResolvedLocale = "en",
): LedgerPeriodSegmentOption[] {
  const options: LedgerPeriodSegmentOption[] = [];
  const includeSegment = (segmentId: LedgerPeriodSegmentId) =>
    !availableSegmentIds || availableSegmentIds.has(segmentId);

  if (includeSegment("full-year")) {
    options.push(buildLedgerSegmentOption(year, "full-year", locale));
  }

  for (const segmentId of quarterSegmentIds) {
    if (includeSegment(segmentId)) {
      options.push(buildLedgerSegmentOption(year, segmentId, locale));
    }
  }

  for (const segmentId of monthSegmentIds) {
    if (includeSegment(segmentId)) {
      options.push(buildLedgerSegmentOption(year, segmentId, locale));
    }
  }

  return options;
}

export function buildLedgerPeriodOptions(
  yearOptions: readonly LedgerYearOption[],
  segmentIdsByYear?: ReadonlyMap<number, ReadonlySet<LedgerPeriodSegmentId>>,
  locale: ResolvedLocale = "en",
): LedgerPeriodOption[] {
  return yearOptions.flatMap((option) =>
    buildLedgerSegmentOptions(option.year, segmentIdsByYear?.get(option.year), locale).map((segment) => ({
      ...segment,
      id: buildLedgerPeriodId(option.year, segment.id),
      label: formatLedgerPeriodLabel(option.year, segment.id, locale),
      segmentId: segment.id,
      year: option.year,
    })),
  );
}

export function resolveLedgerPeriodOption(
  periodId: string | null | undefined,
  periodOptions: readonly LedgerPeriodOption[],
): LedgerPeriodOption | null {
  if (!periodId) {
    return null;
  }

  return periodOptions.find((option) => option.id === periodId) ?? null;
}

export function buildLedgerSnapshotFromRows(
  rows: readonly LedgerRecordRow[],
  input: {
    balanceSheetRows?: readonly LedgerRecordRow[];
    locale?: ResolvedLocale;
    profitLossRows?: readonly LedgerRecordRow[];
    periodOptions: readonly LedgerPeriodOption[];
    selectedScope: LedgerScopeId;
    segmentOptions: readonly LedgerPeriodSegmentOption[];
    selectedPeriod: LedgerPeriodOption;
    yearOptions: readonly LedgerYearOption[];
  },
): LedgerScreenSnapshot {
  const locale = input.locale ?? "en";
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const normalizedRows = normalizeLedgerRows(rows, input.selectedScope);
  const normalizedProfitLossRows = normalizeDerivedRows(input.profitLossRows ?? rows);
  const normalizedBalanceSheetRows = normalizeDerivedRows(input.balanceSheetRows ?? rows);
  const hasBalanceSheetData = normalizedBalanceSheetRows.length > 0;
  const generalLedgerTotalCents =
    input.selectedScope === "personal"
      ? sumAmounts(normalizedRows.map((row) => row.effectiveAmountCents))
      : sumAmounts(normalizedRows.map((row) => row.effectiveAmountCents));
  const balanceSheet = buildBalanceSheetSnapshot(
    normalizedBalanceSheetRows,
    {
      locale,
      scopeId: input.selectedScope,
      selectedPeriod: input.selectedPeriod,
    },
  );
  const profitAndLoss = buildProfitAndLossSnapshot(
    normalizedProfitLossRows,
    input.selectedScope,
    locale,
  );

  return {
    balanceSheet,
    generalLedger: {
      debitTotal: formatCurrencyFromCents(generalLedgerTotalCents),
      entries: normalizedRows.map((row) => buildGeneralLedgerEntry(row, locale)),
      metricCards: [
        {
          accent: input.selectedScope === "personal" ? "danger" : "success",
          id: "scope-total",
          label:
            input.selectedScope === "personal"
              ? runtimeCopy.journal.personalSpendMetric
              : runtimeCopy.journal.totalDebitsMetric,
          value: formatCurrencyFromCents(generalLedgerTotalCents),
        },
        {
          accent: "neutral",
          id: "scope-count",
          label:
            input.selectedScope === "personal"
              ? runtimeCopy.journal.transactionsMetric
              : runtimeCopy.journal.totalCreditsMetric,
          value:
            input.selectedScope === "personal"
              ? String(normalizedRows.length)
              : formatCurrencyFromCents(generalLedgerTotalCents),
        },
      ],
      recordCountLabel: formatLedgerRecordCount(normalizedRows.length, locale),
    },
    hasData: normalizedRows.length > 0 || hasBalanceSheetData,
    isEmpty: normalizedRows.length === 0 && !hasBalanceSheetData,
    periodOptions: [...input.periodOptions],
    profitAndLoss,
    selectedScope: input.selectedScope,
    segmentOptions: [...input.segmentOptions],
    selectedPeriod: input.selectedPeriod,
    yearOptions: [...input.yearOptions],
  };
}

export function createEmptyLedgerSnapshot(
  locale: ResolvedLocale = "en",
): LedgerScreenSnapshot {
  return buildLedgerSnapshotFromRows([], {
    locale,
    periodOptions: [],
    selectedScope: "business",
    segmentOptions: [],
    selectedPeriod: createUnavailableLedgerPeriodOption(locale),
    yearOptions: [],
  });
}

function parseLedgerPeriodId(periodId: string): { segmentId: LedgerPeriodSegmentId; year: number } | null {
  const [yearValue, segmentId] = periodId.split(":");
  const year = Number(yearValue);

  if (!Number.isInteger(year) || year < 1 || !isLedgerSegmentId(segmentId)) {
    return null;
  }

  return {
    segmentId,
    year,
  };
}

function isLedgerSegmentId(value: string | undefined): value is LedgerPeriodSegmentId {
  return value === "full-year" || isQuarterSegmentId(value) || isMonthSegmentId(value);
}

function isQuarterSegmentId(value: string | undefined): value is (typeof quarterSegmentIds)[number] {
  return quarterSegmentIds.some((segmentId) => segmentId === value);
}

function isMonthSegmentId(value: string | undefined): value is (typeof monthSegmentIds)[number] {
  return monthSegmentIds.some((segmentId) => segmentId === value);
}

function buildLedgerSegmentOption(
  year: number,
  segmentId: LedgerPeriodSegmentId,
  locale: ResolvedLocale,
): LedgerPeriodSegmentOption {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  if (segmentId === "full-year") {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    return {
      endDate,
      id: segmentId,
      label: runtimeCopy.periods.wholeYear,
      startDate,
      summary: formatRangeSummary(startDate, endDate, locale),
    };
  }

  if (isQuarterSegmentId(segmentId)) {
    const quarterIndex = quarterSegmentIds.indexOf(segmentId);
    const startMonth = quarterIndex * 3 + 1;
    const startDate = `${year}-${padMonth(startMonth)}-01`;
    const endDate = endOfMonth(`${year}-${padMonth(startMonth + 2)}-01`);

    return {
      endDate,
      id: segmentId,
      label: segmentId.toUpperCase(),
      startDate,
      summary: formatRangeSummary(startDate, endDate, locale),
    };
  }

  const monthNumber = Number(segmentId.slice(1));
  const startDate = `${year}-${padMonth(monthNumber)}-01`;
  const endDate = endOfMonth(startDate);

  return {
    endDate,
    id: segmentId,
    label: formatLedgerMonthChip(year, monthNumber, locale),
    startDate,
    summary: formatRangeSummary(startDate, endDate, locale),
  };
}

function formatLedgerPeriodLabel(
  year: number,
  segmentId: LedgerPeriodSegmentId,
  locale: ResolvedLocale,
): string {
  if (segmentId === "full-year") {
    return String(year);
  }

  if (isQuarterSegmentId(segmentId)) {
    return formatLedgerQuarterTitle(year, segmentId.toUpperCase(), locale);
  }

  const monthNumber = Number(segmentId.slice(1));
  return formatLedgerMonthTitle(year, monthNumber, locale);
}

function buildLedgerAvailability(
  occurredOnValues: readonly string[],
  locale: ResolvedLocale,
): {
  periodOptions: LedgerPeriodOption[];
  segmentOptionsByYear: Map<number, LedgerPeriodSegmentOption[]>;
  yearOptions: LedgerYearOption[];
} {
  const segmentIdsByYear = new Map<number, Set<LedgerPeriodSegmentId>>();

  for (const occurredOn of occurredOnValues) {
    const year = Number(occurredOn.slice(0, 4));
    const monthNumber = Number(occurredOn.slice(5, 7));

    if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      continue;
    }

    const availableSegments = segmentIdsByYear.get(year) ?? new Set<LedgerPeriodSegmentId>();
    const quarterId = quarterSegmentIds[Math.floor((monthNumber - 1) / 3)];
    const monthId = `m${padMonth(monthNumber)}` as LedgerPeriodSegmentId;

    availableSegments.add("full-year");
    if (quarterId) {
      availableSegments.add(quarterId);
    }
    availableSegments.add(monthId);
    segmentIdsByYear.set(year, availableSegments);
  }

  const yearOptions = buildLedgerYearOptions([...segmentIdsByYear.keys()]);
  const readonlySegmentIdsByYear = new Map<number, ReadonlySet<LedgerPeriodSegmentId>>(
    [...segmentIdsByYear.entries()].map(([year, segmentIds]) => [year, segmentIds]),
  );
  const segmentOptionsByYear = new Map<number, LedgerPeriodSegmentOption[]>(
    yearOptions.map((option) => [
      option.year,
      buildLedgerSegmentOptions(option.year, readonlySegmentIdsByYear.get(option.year), locale),
    ]),
  );

  return {
    periodOptions: buildLedgerPeriodOptions(yearOptions, readonlySegmentIdsByYear, locale),
    segmentOptionsByYear,
    yearOptions,
  };
}

function resolveSelectedLedgerPeriod(input: {
  forceDefaultSelection: boolean;
  locale: ResolvedLocale;
  periodOptions: readonly LedgerPeriodOption[];
  preferredPeriodId: string | null;
  yearOptions: readonly LedgerYearOption[];
}): LedgerPeriodOption {
  const defaultPeriodId = getDefaultLedgerPeriodId(input.yearOptions);
  const defaultPeriod =
    resolveLedgerPeriodOption(defaultPeriodId, input.periodOptions) ?? null;

  if (input.forceDefaultSelection) {
    return defaultPeriod ?? createUnavailableLedgerPeriodOption(input.locale);
  }

  return (
    resolveLedgerPeriodOption(input.preferredPeriodId, input.periodOptions) ??
    resolveLedgerFallbackPeriodOption(input.preferredPeriodId, input.periodOptions, defaultPeriod) ??
    defaultPeriod ??
    createUnavailableLedgerPeriodOption(input.locale)
  );
}

function resolveLedgerFallbackPeriodOption(
  preferredPeriodId: string | null,
  periodOptions: readonly LedgerPeriodOption[],
  defaultPeriod: LedgerPeriodOption | null,
): LedgerPeriodOption | null {
  if (!preferredPeriodId) {
    return null;
  }

  const parsed = parseLedgerPeriodId(preferredPeriodId);

  if (!parsed) {
    return null;
  }

  const latestMonth = pickLatestLedgerPeriodOption(periodOptions, "month");
  const latestQuarter = pickLatestLedgerPeriodOption(periodOptions, "quarter");

  switch (getLedgerPeriodGranularity(parsed.segmentId)) {
    case "month":
      return latestMonth ?? latestQuarter ?? defaultPeriod;
    case "quarter":
      return latestQuarter ?? defaultPeriod;
    case "full-year":
    default:
      return defaultPeriod;
  }
}

function pickLatestLedgerPeriodOption(
  periodOptions: readonly LedgerPeriodOption[],
  granularity: "full-year" | "month" | "quarter",
): LedgerPeriodOption | null {
  return [...periodOptions]
    .filter((option) => getLedgerPeriodGranularity(option.segmentId) === granularity)
    .sort(compareLedgerPeriodRecency)[0] ?? null;
}

function compareLedgerPeriodRecency(left: LedgerPeriodOption, right: LedgerPeriodOption): number {
  return (
    right.endDate.localeCompare(left.endDate) ||
    right.startDate.localeCompare(left.startDate)
  );
}

function getLedgerPeriodGranularity(
  segmentId: LedgerPeriodSegmentId,
): "full-year" | "month" | "quarter" {
  if (segmentId === "full-year") {
    return "full-year";
  }

  return segmentId.startsWith("q") ? "quarter" : "month";
}

function createUnavailableLedgerPeriodOption(
  locale: ResolvedLocale,
): LedgerPeriodOption {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  return {
    endDate: "",
    id: unavailableLedgerPeriodId,
    label: runtimeCopy.periods.noRecordsLabel,
    segmentId: "full-year",
    startDate: "",
    summary: runtimeCopy.periods.noRecordsSummary,
    year: 0,
  };
}

function buildGeneralLedgerEntry(
  row: LedgerRecordRow & { effectiveAmountCents: number },
  locale: ResolvedLocale,
): GeneralLedgerEntry {
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const amount = formatCurrencyFromCents(row.effectiveAmountCents);
  const counterparty =
    row.recordKind === "income"
      ? normalizeLabel(row.sourceLabel, locale)
      : normalizeLabel(row.targetLabel, locale);
  const lines =
    row.recordKind === "income"
      ? [
          {
            accountName: runtimeCopy.journal.cashAndBank,
            amount,
            detail: counterparty,
            id: `${row.recordId}-debit`,
            side: "debit" as const,
          },
          {
            accountName: buildRevenueAccountName(row.sourceLabel, locale),
            amount,
            detail: normalizeLabel(row.description, locale),
            id: `${row.recordId}-credit`,
            side: "credit" as const,
          },
        ]
      : [
          {
            accountName:
              row.recordKind === "personal_spending"
                ? runtimeCopy.journal.personalSpendAccount
                : buildExpenseAccountName(row.taxLineCode, locale),
            amount,
            detail: normalizeLabel(row.description, locale),
            id: `${row.recordId}-debit`,
            side: "debit" as const,
          },
          {
            accountName: runtimeCopy.journal.cashAndBank,
            amount,
            detail: normalizeLabel(row.sourceLabel, locale),
            id: `${row.recordId}-credit`,
            side: "credit" as const,
          },
        ];

  return {
    amount,
    dateLabel: formatLedgerDisplayDate(row.occurredOn, locale),
    id: row.recordId,
    kind:
      row.recordKind === "income"
        ? "income"
        : row.recordKind === "personal_spending"
          ? "personal"
          : "expense",
    kindLabel:
      row.recordKind === "income"
        ? runtimeCopy.journal.incomeRecordKind
        : row.recordKind === "personal_spending"
          ? runtimeCopy.journal.personalRecordKind
          : runtimeCopy.journal.expenseRecordKind,
    lines,
    subtitle: row.memo?.trim() || formatLedgerReferenceSubtitle(row.occurredOn, row.recordId, locale),
    title: normalizeLabel(row.description, locale),
  };
}

function buildGroupedSectionRows(
  rows: readonly (LedgerRecordRow & { effectiveAmountCents: number })[],
  kind: "expense" | "income",
  locale: ResolvedLocale,
): LedgerSectionRow[] {
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const groups = new Map<string, number>();

  for (const row of rows) {
    const key =
      kind === "income"
        ? normalizeLabel(row.sourceLabel || row.description, locale)
        : normalizeLabel(row.targetLabel || row.description, locale);
    groups.set(key, (groups.get(key) ?? 0) + row.effectiveAmountCents);
  }

  return [...groups.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, amountCents], index) => ({
      amount: formatCurrencyFromCents(amountCents),
      id: `${kind}-${index}-${label}`,
      label,
      note:
        kind === "income"
          ? runtimeCopy.journal.groupedIncomeNote
          : runtimeCopy.journal.groupedExpenseNote,
    }));
}

function buildExpenseAccountName(
  taxLineCode: string | null,
  locale: ResolvedLocale,
): string {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  if (!taxLineCode) {
    return runtimeCopy.journal.operatingExpense;
  }

  if (taxLineCode.toLowerCase() === "line27a") {
    return runtimeCopy.journal.scheduleCOtherExpense;
  }

  return `${runtimeCopy.journal.expensePrefix} ${taxLineCode.toUpperCase()}`;
}

function applyScopeAmount(
  row: LedgerRecordRow,
  scopeId: LedgerScopeId,
): number {
  if (scopeId === "personal" || row.recordKind === "personal_spending") {
    return row.amountCents;
  }

  return applyBusinessUse(row.amountCents, row.businessUseBps);
}

function buildProfitAndLossSnapshot(
  rows: readonly (LedgerRecordRow & { effectiveAmountCents: number })[],
  scopeId: LedgerScopeId,
  locale: ResolvedLocale,
): ProfitAndLossSnapshot {
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const incomeRows = rows.filter((row) => row.recordKind === "income");
  const expenseRows = rows.filter((row) => row.recordKind === "expense");
  const personalRows = rows.filter((row) => row.recordKind === "personal_spending");
  const businessRevenueTotalCents = sumAmounts(
    incomeRows.map((row) => row.effectiveAmountCents),
  );
  const businessExpenseTotalCents = sumAmounts(
    expenseRows.map((row) => row.effectiveAmountCents),
  );
  const personalSpendingTotalCents = sumAmounts(
    personalRows.map((row) => row.effectiveAmountCents),
  );
  const businessProfitCents = businessRevenueTotalCents - businessExpenseTotalCents;
  const personalProfitCents = businessProfitCents - personalSpendingTotalCents;

  if (scopeId === "personal") {
    return {
      expenseRows: [],
      metricCards: [
        {
          accent:
            businessProfitCents > 0
              ? "success"
              : businessProfitCents < 0
                ? "danger"
                : "neutral",
          id: "business-profit",
          label: locale === "zh-CN" ? "经营利润" : "Business Profit",
          value: formatCurrencyFromCents(normalizeSignedZeroCents(businessProfitCents)),
        },
        {
          accent: "danger",
          id: "personal-spend",
          label: runtimeCopy.journal.personalSpendMetric,
          value: formatCurrencyFromCents(personalSpendingTotalCents),
        },
      ],
      netIncomeLabel: formatCurrencyFromCents(normalizeSignedZeroCents(personalProfitCents)),
      revenueRows: [],
    };
  }

  return {
    expenseRows: buildGroupedSectionRows(expenseRows, "expense", locale),
    metricCards: [
      {
        accent: "success",
        id: "revenue-total",
        label: runtimeCopy.journal.revenueMetric,
        value: formatCurrencyFromCents(businessRevenueTotalCents),
      },
      {
        accent: "danger",
        id: "expense-total",
        label: runtimeCopy.journal.expenseMetric,
        value: formatCurrencyFromCents(businessExpenseTotalCents),
      },
    ],
    netIncomeLabel: formatCurrencyFromCents(normalizeSignedZeroCents(businessProfitCents)),
    revenueRows: buildGroupedSectionRows(incomeRows, "income", locale),
  };
}

function buildBalanceSheetSnapshot(
  rows: readonly (LedgerRecordRow & { effectiveAmountCents: number })[],
  input: {
    locale: ResolvedLocale;
    scopeId: LedgerScopeId;
    selectedPeriod: LedgerPeriodOption;
  },
): BalanceSheetSnapshot {
  if (input.selectedPeriod.year < 1) {
    return createEmptyBalanceSheetSnapshot(input.scopeId, input.locale);
  }

  const summary = buildSplitBalanceSheetSummary(rows, input.selectedPeriod.year);
  const closingAssetCents =
    input.scopeId === "business"
      ? summary.businessClosingAssetCents
      : summary.personalClosingAssetCents;
  const businessAssetTotalCents = Math.max(summary.businessClosingAssetCents, 0);
  const assetTotalCents = Math.max(closingAssetCents, 0);
  const fundingGapCents = Math.max(closingAssetCents * -1, 0);

  return {
    assetRows: [
      buildBalanceSheetAssetRow(
        input.scopeId,
        assetTotalCents,
        businessAssetTotalCents,
        summary.businessClosingAssetCents,
        closingAssetCents,
        input.locale,
      ),
    ],
    carryForwardRows: buildBalanceSheetCarryForwardRows(
      summary,
      input.selectedPeriod.year,
      input.scopeId,
    ),
    equationSummary: buildBalanceSheetEquationSummary(
      summary,
      input.scopeId,
      input.locale,
    ),
    equityAmount: formatCurrencyFromCents(closingAssetCents),
    equityRows: [
      buildBalanceSheetEquityRow(
        input.scopeId,
        closingAssetCents,
        input.locale,
      ),
    ],
    liabilityRows: [
      buildBalanceSheetLiabilityRow(
        input.scopeId,
        fundingGapCents,
        input.locale,
      ),
    ],
    metricCards: [
      {
        accent: "success",
        id: "asset-total",
        label: getLedgerRuntimeCopy(input.locale).balance.assetMetric,
        value: formatCurrencyFromCents(assetTotalCents),
      },
      {
        accent: fundingGapCents > 0 ? "danger" : "neutral",
        id: "funding-gap-total",
        label: buildBalanceSheetFundingGapLabel(fundingGapCents, input.locale),
        value: formatCurrencyFromCents(fundingGapCents),
      },
    ],
    netPositionLabel: buildBalanceSheetNetPositionLabel(
      input.scopeId,
      closingAssetCents,
      input.locale,
    ),
  };
}

function buildBalanceSheetAssetRow(
  scopeId: LedgerScopeId,
  assetTotalCents: number,
  businessAssetTotalCents: number,
  businessClosingAssetCents: number,
  closingNetAssetCents: number,
  locale: ResolvedLocale,
): LedgerSectionRow {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  if (scopeId === "personal") {
    return {
      amount: formatCurrencyFromCents(businessAssetTotalCents),
      id: "business-total-asset-basis",
      label: runtimeCopy.balance.businessAssetsLabel,
      note:
        businessClosingAssetCents >= 0
          ? runtimeCopy.balance.businessAssetsNote
          : runtimeCopy.balance.deficitPosition,
    };
  }

  return {
    amount: formatCurrencyFromCents(assetTotalCents),
    id: "closing-business-assets",
    label: runtimeCopy.balance.businessAssetsLabel,
    note:
      closingNetAssetCents >= 0
        ? runtimeCopy.balance.businessAssetsNote
        : runtimeCopy.balance.deficitPosition,
  };
}

function buildBalanceSheetLiabilityRow(
  scopeId: LedgerScopeId,
  fundingGapCents: number,
  locale: ResolvedLocale,
): LedgerSectionRow {
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const fundingGapLabel =
    locale === "zh-CN" ? "资金缺口（推导）" : "Funding gap (derived)";

  if (scopeId === "personal") {
    return {
      amount: formatCurrencyFromCents(fundingGapCents),
      id: "funding-gap",
      label:
        fundingGapCents > 0 ? fundingGapLabel : runtimeCopy.balance.liabilitiesMetric,
      note:
        fundingGapCents > 0
          ? runtimeCopy.balance.fundingGapNote
          : runtimeCopy.balance.liabilitiesMetric,
    };
  }

  return {
    amount: formatCurrencyFromCents(fundingGapCents),
    id: "funding-gap",
    label:
      fundingGapCents > 0 ? fundingGapLabel : runtimeCopy.balance.liabilitiesMetric,
    note:
      fundingGapCents > 0
        ? runtimeCopy.balance.fundingGapNote
        : runtimeCopy.balance.liabilitiesMetric,
  };
}

function buildBalanceSheetEquityRow(
  scopeId: LedgerScopeId,
  netPositionCents: number,
  locale: ResolvedLocale,
): LedgerSectionRow {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  if (scopeId === "personal") {
    return {
      amount: formatCurrencyFromCents(netPositionCents),
      id: "net-position",
      label:
        netPositionCents >= 0
          ? runtimeCopy.balance.equityLabel
          : runtimeCopy.balance.deficitLabel,
      note: runtimeCopy.balance.equityNote,
    };
  }

  return {
    amount: formatCurrencyFromCents(netPositionCents),
    id: "owner-equity",
    label:
      netPositionCents >= 0
        ? runtimeCopy.balance.equityLabel
        : runtimeCopy.balance.deficitLabel,
    note: runtimeCopy.balance.equityNote,
  };
}

function buildBalanceSheetFundingGapLabel(
  fundingGapCents: number,
  locale: ResolvedLocale,
): string {
  if (fundingGapCents <= 0) {
    return getLedgerRuntimeCopy(locale).balance.liabilitiesMetric;
  }

  return getLedgerRuntimeCopy(locale).balance.fundingGapMetric;
}

function buildBalanceSheetEquationSummary(
  summary: {
    businessClosingAssetCents: number;
    currentYearBusinessProfitCents: number;
    currentYearPersonalSpendingCents: number;
    openingBalanceCents: number;
    personalClosingAssetCents: number;
  },
  scopeId: LedgerScopeId,
  locale: ResolvedLocale,
): string {
  const opening = formatCurrencyFromCents(
    normalizeSignedZeroCents(summary.openingBalanceCents),
  );
  const businessMovement = formatCurrencyFromCents(
    normalizeSignedZeroCents(summary.currentYearBusinessProfitCents),
  );

  if (scopeId === "business") {
    return `Opening ${opening} + business movement ${businessMovement} = closing business asset ${formatCurrencyFromCents(
      normalizeSignedZeroCents(summary.businessClosingAssetCents),
    )}`;
  }

  if (locale === "zh-CN") {
    return `期初 ${opening} + 经营变动 ${businessMovement} - 个人支出 ${formatCurrencyFromCents(
      normalizeSignedZeroCents(summary.currentYearPersonalSpendingCents),
    )} = 期末个人资产 ${formatCurrencyFromCents(
      normalizeSignedZeroCents(summary.personalClosingAssetCents),
    )}`;
  }

  return `Opening ${opening} + business movement ${businessMovement} - personal spending ${formatCurrencyFromCents(
    normalizeSignedZeroCents(summary.currentYearPersonalSpendingCents),
  )} = closing personal asset ${formatCurrencyFromCents(
    normalizeSignedZeroCents(summary.personalClosingAssetCents),
  )}`;
}

function buildBalanceSheetNetPositionLabel(
  scopeId: LedgerScopeId,
  netPositionCents: number,
  locale: ResolvedLocale,
): string {
  if (scopeId === "personal") {
    if (locale === "zh-CN") {
      return netPositionCents >= 0
        ? "所选期间结束时，在扣除当年个人支出后的期末个人资产。这仍然是一个推导出的个人视图，并非完整的资产负债表。"
        : "所选期间结束时，在扣除当年个人支出后的个人净头寸为负。这仍然是一个推导出的个人视图，并非完整的资产负债表。";
    }

    return netPositionCents >= 0
      ? "Closing personal asset as of the selected period end after current-year personal-spending deductions. This remains a limited derived personal view rather than a full asset and debt statement."
      : "Negative closing personal position as of the selected period end after current-year personal-spending deductions. This remains a limited derived personal view rather than a full asset and debt statement.";
  }

  if (locale === "zh-CN") {
    return netPositionCents >= 0
      ? "所选期间结束时，在扣除当年个人支出前的期末经营资产。"
      : "所选期间结束时，在扣除当年个人支出前的经营净头寸为负。";
  }

  return netPositionCents >= 0
    ? "Closing business asset as of the selected period end before current-year personal-spending deductions."
    : "Negative closing business position as of the selected period end before current-year personal-spending deductions.";
}

function normalizeLedgerRows(
  rows: readonly LedgerRecordRow[],
  scopeId: LedgerScopeId,
): (LedgerRecordRow & { effectiveAmountCents: number })[] {
  return rows
    .map((row) => ({
      ...row,
      effectiveAmountCents: applyScopeAmount(row, scopeId),
    }))
    .filter((row) => row.effectiveAmountCents > 0);
}

function normalizeDerivedRows(
  rows: readonly LedgerRecordRow[],
): (LedgerRecordRow & { effectiveAmountCents: number })[] {
  return rows
    .map((row) => ({
      ...row,
      effectiveAmountCents: applyDerivedAmount(row),
    }))
    .filter((row) => row.effectiveAmountCents > 0);
}

function applyDerivedAmount(row: LedgerRecordRow): number {
  if (row.recordKind === "personal_spending") {
    return row.amountCents;
  }

  return applyBusinessUse(row.amountCents, row.businessUseBps);
}

function buildSplitBalanceSheetSummary(
  rows: readonly (LedgerRecordRow & { effectiveAmountCents: number })[],
  selectedYear: number,
): {
  businessClosingAssetCents: number;
  currentYearBusinessProfitCents: number;
  currentYearPersonalSpendingCents: number;
  hasPriorYearActivity: boolean;
  openingBalanceCents: number;
  personalClosingAssetCents: number;
} {
  const currentYearStart = `${selectedYear}-01-01`;
  let currentYearBusinessProfitCents = 0;
  let currentYearPersonalSpendingCents = 0;
  let hasPriorYearActivity = false;
  let openingBalanceCents = 0;

  for (const row of rows) {
    const signedAmountCents =
      row.recordKind === "income" ? row.effectiveAmountCents : row.effectiveAmountCents * -1;
    const isPriorYearRow = row.occurredOn < currentYearStart;

    if (isPriorYearRow) {
      hasPriorYearActivity = true;
      openingBalanceCents += signedAmountCents;
      continue;
    }

    if (row.recordKind === "personal_spending") {
      currentYearPersonalSpendingCents += row.effectiveAmountCents;
      continue;
    }

    currentYearBusinessProfitCents += signedAmountCents;
  }

  const businessClosingAssetCents =
    openingBalanceCents + currentYearBusinessProfitCents;
  const personalClosingAssetCents =
    businessClosingAssetCents - currentYearPersonalSpendingCents;

  return {
    businessClosingAssetCents,
    currentYearBusinessProfitCents,
    currentYearPersonalSpendingCents,
    hasPriorYearActivity,
    openingBalanceCents,
    personalClosingAssetCents,
  };
}

function buildBalanceSheetCarryForwardRows(
  summary: {
    businessClosingAssetCents: number;
    currentYearBusinessProfitCents: number;
    currentYearPersonalSpendingCents: number;
    hasPriorYearActivity: boolean;
    openingBalanceCents: number;
    personalClosingAssetCents: number;
  },
  selectedYear: number,
  scopeId: LedgerScopeId,
): LedgerSectionRow[] {
  const openingBalanceRow: LedgerSectionRow = {
    amount: formatCurrencyFromCents(normalizeSignedZeroCents(summary.openingBalanceCents)),
    id: "opening-balance",
    label: "Opening balance (carried forward)",
    note:
      summary.hasPriorYearActivity
        ? `Derived from the ${selectedYear - 1} closing personal asset carried into both balance-sheet scopes.`
        : "No prior-year closing personal asset is available, so the opening balance starts at zero.",
  };
  const businessProfitRow: LedgerSectionRow = {
    amount: formatCurrencyFromCents(
      normalizeSignedZeroCents(summary.currentYearBusinessProfitCents),
    ),
    id: "current-year-business-profit",
    label: "Business profit YTD",
    note: "Year-to-date business revenue minus business expense from January 1 through the selected period end.",
  };

  if (scopeId === "business") {
    return [
      openingBalanceRow,
      businessProfitRow,
      {
        amount: formatCurrencyFromCents(
          normalizeSignedZeroCents(summary.businessClosingAssetCents),
        ),
        id: "closing-business-asset",
        label: "Closing business asset",
        note: "Opening balance plus year-to-date business profit. Current-year personal spending does not reduce this business closing value.",
      },
    ];
  }

  return [
    openingBalanceRow,
    businessProfitRow,
    {
      amount: formatCurrencyFromCents(
        normalizeSignedZeroCents(summary.currentYearPersonalSpendingCents * -1),
      ),
      id: "current-year-personal-spending",
      label: "Personal spending deduction YTD",
      note: "Current-year cumulative personal spending through the selected period end reduces the business asset basis here and in the next carry-forward.",
    },
    {
      amount: formatCurrencyFromCents(
        normalizeSignedZeroCents(summary.personalClosingAssetCents),
      ),
      id: "closing-personal-asset",
      label: "Closing personal asset",
      note: "Business asset basis after current-year personal-spending deductions, shown in a limited derived personal view.",
    },
  ];
}

function createEmptyBalanceSheetSnapshot(
  scopeId: LedgerScopeId,
  locale: ResolvedLocale,
): BalanceSheetSnapshot {
  const runtimeCopy = getLedgerRuntimeCopy(locale);

  return {
    assetRows: [],
    carryForwardRows: [],
    equationSummary: "",
    equityAmount: formatCurrencyFromCents(0),
    equityRows: [],
    liabilityRows: [],
    metricCards: [
      {
        accent: "success",
        id: "asset-total",
        label: runtimeCopy.balance.assetMetric,
        value: formatCurrencyFromCents(0),
      },
      {
        accent: "neutral",
        id: "funding-gap-total",
        label: runtimeCopy.balance.liabilitiesMetric,
        value: formatCurrencyFromCents(0),
      },
    ],
    netPositionLabel:
      scopeId === "personal"
        ? runtimeCopy.balance.deficitPosition
        : runtimeCopy.balance.positivePosition,
  };
}

function buildRevenueAccountName(
  sourceLabel: string,
  locale: ResolvedLocale,
): string {
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const normalized = normalizeLabel(sourceLabel, locale);

  if (normalized === runtimeCopy.common.unlabeledRecord) {
    return runtimeCopy.journal.creatorRevenue;
  }

  return `${normalized}${runtimeCopy.journal.revenueSuffix}`;
}

function applyBusinessUse(amountCents: number, businessUseBps: number): number {
  return Math.round((amountCents * normalizeBusinessUseBps(businessUseBps)) / 10_000);
}

function normalizeBusinessUseBps(value: number): number {
  if (!Number.isFinite(value)) {
    return 10_000;
  }

  return Math.max(0, Math.min(10_000, Math.round(value)));
}

function sumAmounts(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function normalizeSignedZeroCents(value: number): number {
  return value === 0 ? 0 : value;
}

function formatRangeSummary(
  startDate: string,
  endDate: string,
  locale: ResolvedLocale,
): string {
  return formatLedgerRangeSummary(startDate, endDate, locale);
}

function endOfMonth(dateValue: string): string {
  const date = new Date(`${dateValue.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function normalizeIsoDate(value: string): string {
  return value.slice(0, 10);
}

function normalizeLabel(
  value: string | null | undefined,
  locale: ResolvedLocale,
): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : getLedgerRuntimeCopy(locale).common.unlabeledRecord;
}

function padMonth(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildScopeRecordKinds(scopeId: LedgerScopeId): LedgerRecordRow["recordKind"][] {
  return scopeId === "personal"
    ? [...personalLedgerRecordKinds]
    : [...businessLedgerRecordKinds];
}

function buildBalanceSheetRecordKinds(): LedgerRecordRow["recordKind"][] {
  return [...balanceSheetLedgerRecordKinds];
}

function buildRecordKindsLiteral(
  recordKinds: readonly LedgerRecordRow["recordKind"][],
): string {
  return `(${recordKinds.map((recordKind) => `'${recordKind}'`).join(", ")})`;
}

async function loadLedgerRowsForRange(
  database: ReadableStorageDatabase,
  input: {
    endDate: string;
    entityId: string;
    recordKinds: readonly LedgerRecordRow["recordKind"][];
    startDate: string;
  },
): Promise<LedgerRecordRow[]> {
  return database.searchRecordsByDateRangeAsync<LedgerRecordRow>({
    dateRange: {
      endOn: input.endDate,
      startOn: input.startDate,
    },
    entityId: input.entityId,
    orderBy: "r.occurred_on DESC, r.created_at DESC, r.record_id DESC",
    recordKinds: input.recordKinds,
    recordStatuses: ledgerPostableStatuses,
    select: `r.record_id AS recordId,
      r.description,
      r.memo,
      r.occurred_on AS occurredOn,
      r.created_at AS createdAt,
      r.currency,
      r.amount_cents AS amountCents,
      r.record_kind AS recordKind,
      r.source_label AS sourceLabel,
      r.target_label AS targetLabel,
      COALESCE(r.business_use_bps, 10000) AS businessUseBps,
      r.tax_line_code AS taxLineCode`,
  });
}

export const ledgerPostableStatuses = [...accountingPostableRecordStatuses];
