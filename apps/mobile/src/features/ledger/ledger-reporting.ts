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
  getLedgerRuntimeCopy,
  type GeneralLedgerEntryKind,
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
  const scopeRecordKinds =
    scopeId === "personal"
      ? "('personal_spending')"
      : "('income', 'expense')";
  const occurredOnRows = await database.getAllAsync<LedgerAvailableDateRow>(
    `SELECT DISTINCT
      occurred_on AS occurredOn
    FROM records
    WHERE entity_id = ?
      AND record_status IN ('posted', 'reconciled')
      AND record_kind IN ${scopeRecordKinds}
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
  const rows =
    availability.periodOptions.length > 0
      ? await database.searchRecordsByDateRangeAsync<LedgerRecordRow>({
          dateRange: {
            endOn: selectedPeriod.endDate,
            startOn: selectedPeriod.startDate,
          },
          entityId,
          orderBy: "r.occurred_on DESC, r.created_at DESC, r.record_id DESC",
          recordKinds:
            scopeId === "personal" ? ["personal_spending"] : ["income", "expense"],
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
        })
      : [];

  return buildLedgerSnapshotFromRows(rows, {
    locale,
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
    locale?: ResolvedLocale;
    periodOptions: readonly LedgerPeriodOption[];
    selectedScope: LedgerScopeId;
    segmentOptions: readonly LedgerPeriodSegmentOption[];
    selectedPeriod: LedgerPeriodOption;
    yearOptions: readonly LedgerYearOption[];
  },
): LedgerScreenSnapshot {
  const locale = input.locale ?? "en";
  const runtimeCopy = getLedgerRuntimeCopy(locale);
  const normalizedRows = rows
    .map((row) => ({
      ...row,
      effectiveAmountCents: applyScopeAmount(row, input.selectedScope),
    }))
    .filter((row) => row.effectiveAmountCents > 0);
  const incomeRows = normalizedRows.filter((row) => row.recordKind === "income");
  const expenseRows = normalizedRows.filter((row) => row.recordKind === "expense");
  const personalRows = normalizedRows.filter((row) => row.recordKind === "personal_spending");
  const incomeTotalCents = sumAmounts(incomeRows.map((row) => row.effectiveAmountCents));
  const expenseTotalCents = sumAmounts(expenseRows.map((row) => row.effectiveAmountCents));
  const personalTotalCents = sumAmounts(personalRows.map((row) => row.effectiveAmountCents));
  const netIncomeCents = incomeTotalCents - expenseTotalCents;
  const assetTotalCents = Math.max(netIncomeCents, 0);
  const fundingGapCents = Math.max(netIncomeCents * -1, 0);
  const generalLedgerTotalCents =
    input.selectedScope === "personal"
      ? personalTotalCents
      : sumAmounts(normalizedRows.map((row) => row.effectiveAmountCents));

  return {
    balanceSheet: {
      assetRows: [
        {
          amount: formatCurrencyFromCents(assetTotalCents),
          id: "net-business-assets",
          label: runtimeCopy.balance.businessAssetsLabel,
          note: runtimeCopy.balance.businessAssetsNote,
        },
      ],
      equationSummary:
        netIncomeCents >= 0
          ? `${formatCurrencyFromCents(assetTotalCents)} ${runtimeCopy.balance.assetsWord} = ${formatCurrencyFromCents(0)} ${runtimeCopy.balance.liabilitiesWord} + ${formatCurrencyFromCents(netIncomeCents)} ${runtimeCopy.balance.equityWord}`
          : locale === "zh-CN"
            ? `${formatCurrencyFromCents(assetTotalCents)} ${runtimeCopy.balance.assetsWord}，所有者补资缺口 ${formatCurrencyFromCents(fundingGapCents)}`
            : `${formatCurrencyFromCents(assetTotalCents)} ${runtimeCopy.balance.assetsWord} with ${formatCurrencyFromCents(fundingGapCents)} owner funding gap`,
      equityAmount: formatCurrencyFromCents(netIncomeCents),
      equityRows: [
        {
          amount: formatCurrencyFromCents(netIncomeCents),
          id: "owner-equity",
          label: netIncomeCents >= 0 ? runtimeCopy.balance.equityLabel : runtimeCopy.balance.deficitLabel,
          note: runtimeCopy.balance.equityNote,
        },
      ],
      liabilityRows: [
        {
          amount: formatCurrencyFromCents(fundingGapCents),
          id: "funding-gap",
          label: runtimeCopy.balance.fundingGapLabel,
          note: runtimeCopy.balance.fundingGapNote,
        },
      ],
      metricCards: [
        {
          accent: "success",
          id: "asset-total",
          label: runtimeCopy.balance.assetMetric,
          value: formatCurrencyFromCents(assetTotalCents),
        },
        {
          accent: fundingGapCents > 0 ? "danger" : "neutral",
          id: "funding-gap-total",
          label: fundingGapCents > 0 ? runtimeCopy.balance.fundingGapMetric : runtimeCopy.balance.liabilitiesMetric,
          value: formatCurrencyFromCents(fundingGapCents),
        },
      ],
      netPositionLabel:
        netIncomeCents >= 0
          ? runtimeCopy.balance.positivePosition
          : runtimeCopy.balance.deficitPosition,
    },
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
    hasData: normalizedRows.length > 0,
    isEmpty: normalizedRows.length === 0,
    periodOptions: [...input.periodOptions],
    profitAndLoss: {
      expenseRows:
        input.selectedScope === "personal"
          ? []
          : buildGroupedSectionRows(expenseRows, "expense", locale),
      metricCards: [
        {
          accent: input.selectedScope === "personal" ? "neutral" : "success",
          id: "revenue-total",
          label:
            input.selectedScope === "personal"
              ? runtimeCopy.journal.businessRevenueMetric
              : runtimeCopy.journal.revenueMetric,
          value: formatCurrencyFromCents(input.selectedScope === "personal" ? 0 : incomeTotalCents),
        },
        {
          accent: input.selectedScope === "personal" ? "danger" : "danger",
          id: "expense-total",
          label:
            input.selectedScope === "personal"
              ? runtimeCopy.journal.personalSpendMetric
              : runtimeCopy.journal.expenseMetric,
          value: formatCurrencyFromCents(
            input.selectedScope === "personal" ? personalTotalCents : expenseTotalCents,
          ),
        },
      ],
      netIncomeLabel: formatCurrencyFromCents(
        input.selectedScope === "personal" ? personalTotalCents * -1 : netIncomeCents,
      ),
      revenueRows:
        input.selectedScope === "personal"
          ? []
          : buildGroupedSectionRows(incomeRows, "income", locale),
    },
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

export const ledgerPostableStatuses = [...accountingPostableRecordStatuses];
