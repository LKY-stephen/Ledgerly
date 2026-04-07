import {
  accountingPostableRecordStatuses,
  type ReadableStorageDatabase,
} from "@creator-cfo/storage";

import {
  defaultEntityId,
  formatCurrencyFromCents,
  formatDisplayDate,
} from "./ledger-domain";

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
    now?: string;
    preferredPeriodId?: string | null;
    scopeId?: LedgerScopeId;
  } = {},
): Promise<LedgerScreenSnapshot> {
  const entityId = input.entityId ?? defaultEntityId;
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
  );
  const selectedPeriod = resolveSelectedLedgerPeriod({
    forceDefaultSelection: input.forceDefaultSelection ?? false,
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
): LedgerPeriodSegmentOption[] {
  const options: LedgerPeriodSegmentOption[] = [];
  const includeSegment = (segmentId: LedgerPeriodSegmentId) =>
    !availableSegmentIds || availableSegmentIds.has(segmentId);

  if (includeSegment("full-year")) {
    options.push(buildLedgerSegmentOption(year, "full-year"));
  }

  for (const segmentId of quarterSegmentIds) {
    if (includeSegment(segmentId)) {
      options.push(buildLedgerSegmentOption(year, segmentId));
    }
  }

  for (const segmentId of monthSegmentIds) {
    if (includeSegment(segmentId)) {
      options.push(buildLedgerSegmentOption(year, segmentId));
    }
  }

  return options;
}

export function buildLedgerPeriodOptions(
  yearOptions: readonly LedgerYearOption[],
  segmentIdsByYear?: ReadonlyMap<number, ReadonlySet<LedgerPeriodSegmentId>>,
): LedgerPeriodOption[] {
  return yearOptions.flatMap((option) =>
    buildLedgerSegmentOptions(option.year, segmentIdsByYear?.get(option.year)).map((segment) => ({
      ...segment,
      id: buildLedgerPeriodId(option.year, segment.id),
      label: formatLedgerPeriodLabel(option.year, segment.id),
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
    periodOptions: readonly LedgerPeriodOption[];
    selectedScope: LedgerScopeId;
    segmentOptions: readonly LedgerPeriodSegmentOption[];
    selectedPeriod: LedgerPeriodOption;
    yearOptions: readonly LedgerYearOption[];
  },
): LedgerScreenSnapshot {
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
          label: "Net operating assets (derived)",
          note: "Positive net operating position from posted or reconciled business records in the selected reporting slice.",
        },
      ],
      equationSummary:
        netIncomeCents >= 0
          ? `${formatCurrencyFromCents(assetTotalCents)} assets = ${formatCurrencyFromCents(0)} liabilities + ${formatCurrencyFromCents(netIncomeCents)} equity`
          : `${formatCurrencyFromCents(assetTotalCents)} assets with ${formatCurrencyFromCents(fundingGapCents)} owner funding gap`,
      equityAmount: formatCurrencyFromCents(netIncomeCents),
      equityRows: [
        {
          amount: formatCurrencyFromCents(netIncomeCents),
          id: "owner-equity",
          label: netIncomeCents >= 0 ? "Owner equity (derived)" : "Owner deficit (derived)",
          note: "Residual position from posted or reconciled business income minus business expenses in the selected reporting slice.",
        },
      ],
      liabilityRows: [
        {
          amount: formatCurrencyFromCents(fundingGapCents),
          id: "funding-gap",
          label: "Owner funding gap (derived)",
          note: "Shown when business expenses exceed business inflows inside the selected reporting slice.",
        },
      ],
      metricCards: [
        {
          accent: "success",
          id: "asset-total",
          label: "Total Assets",
          value: formatCurrencyFromCents(assetTotalCents),
        },
        {
          accent: fundingGapCents > 0 ? "danger" : "neutral",
          id: "funding-gap-total",
          label: fundingGapCents > 0 ? "Funding Gap" : "Total Liabilities",
          value: formatCurrencyFromCents(fundingGapCents),
        },
      ],
      netPositionLabel:
        netIncomeCents >= 0
          ? "Positive owner position for this reporting slice"
          : "Negative owner position for this reporting slice",
    },
    generalLedger: {
      debitTotal: formatCurrencyFromCents(generalLedgerTotalCents),
      entries: normalizedRows.map((row) => buildGeneralLedgerEntry(row)),
      metricCards: [
        {
          accent: input.selectedScope === "personal" ? "danger" : "success",
          id: "scope-total",
          label: input.selectedScope === "personal" ? "Personal Spend" : "Total Debits (Dr)",
          value: formatCurrencyFromCents(generalLedgerTotalCents),
        },
        {
          accent: "neutral",
          id: "scope-count",
          label: input.selectedScope === "personal" ? "Transactions" : "Total Credits (Cr)",
          value:
            input.selectedScope === "personal"
              ? String(normalizedRows.length)
              : formatCurrencyFromCents(generalLedgerTotalCents),
        },
      ],
      recordCountLabel: `${normalizedRows.length} ${normalizedRows.length === 1 ? "record" : "records"}`,
    },
    hasData: normalizedRows.length > 0,
    isEmpty: normalizedRows.length === 0,
    periodOptions: [...input.periodOptions],
    profitAndLoss: {
      expenseRows:
        input.selectedScope === "personal"
          ? []
          : buildGroupedSectionRows(expenseRows, "expense"),
      metricCards: [
        {
          accent: input.selectedScope === "personal" ? "neutral" : "success",
          id: "revenue-total",
          label: input.selectedScope === "personal" ? "Business Revenue" : "Gross Revenue",
          value: formatCurrencyFromCents(input.selectedScope === "personal" ? 0 : incomeTotalCents),
        },
        {
          accent: input.selectedScope === "personal" ? "danger" : "danger",
          id: "expense-total",
          label: input.selectedScope === "personal" ? "Personal Spend" : "Total Expenses",
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
          : buildGroupedSectionRows(incomeRows, "income"),
    },
    selectedScope: input.selectedScope,
    segmentOptions: [...input.segmentOptions],
    selectedPeriod: input.selectedPeriod,
    yearOptions: [...input.yearOptions],
  };
}

export function createEmptyLedgerSnapshot(): LedgerScreenSnapshot {
  return buildLedgerSnapshotFromRows([], {
    periodOptions: [],
    selectedScope: "business",
    segmentOptions: [],
    selectedPeriod: createUnavailableLedgerPeriodOption(),
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
): LedgerPeriodSegmentOption {
  if (segmentId === "full-year") {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    return {
      endDate,
      id: segmentId,
      label: "Whole Year",
      startDate,
      summary: formatRangeSummary(startDate, endDate),
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
      summary: formatRangeSummary(startDate, endDate),
    };
  }

  const monthNumber = Number(segmentId.slice(1));
  const startDate = `${year}-${padMonth(monthNumber)}-01`;
  const endDate = endOfMonth(startDate);

  return {
    endDate,
    id: segmentId,
    label: monthNamesShort[monthNumber - 1] ?? "Month",
    startDate,
    summary: formatRangeSummary(startDate, endDate),
  };
}

function formatLedgerPeriodLabel(year: number, segmentId: LedgerPeriodSegmentId): string {
  if (segmentId === "full-year") {
    return String(year);
  }

  if (isQuarterSegmentId(segmentId)) {
    return `${segmentId.toUpperCase()} ${year}`;
  }

  const monthNumber = Number(segmentId.slice(1));
  return `${monthNamesLong[monthNumber - 1] ?? "Month"} ${year}`;
}

function buildLedgerAvailability(
  occurredOnValues: readonly string[],
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
      buildLedgerSegmentOptions(option.year, readonlySegmentIdsByYear.get(option.year)),
    ]),
  );

  return {
    periodOptions: buildLedgerPeriodOptions(yearOptions, readonlySegmentIdsByYear),
    segmentOptionsByYear,
    yearOptions,
  };
}

function resolveSelectedLedgerPeriod(input: {
  forceDefaultSelection: boolean;
  periodOptions: readonly LedgerPeriodOption[];
  preferredPeriodId: string | null;
  yearOptions: readonly LedgerYearOption[];
}): LedgerPeriodOption {
  const defaultPeriodId = getDefaultLedgerPeriodId(input.yearOptions);
  const defaultPeriod =
    resolveLedgerPeriodOption(defaultPeriodId, input.periodOptions) ?? null;

  if (input.forceDefaultSelection) {
    return defaultPeriod ?? createUnavailableLedgerPeriodOption();
  }

  return (
    resolveLedgerPeriodOption(input.preferredPeriodId, input.periodOptions) ??
    resolveLedgerFallbackPeriodOption(input.preferredPeriodId, input.periodOptions, defaultPeriod) ??
    defaultPeriod ??
    createUnavailableLedgerPeriodOption()
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

function createUnavailableLedgerPeriodOption(): LedgerPeriodOption {
  return {
    endDate: "",
    id: unavailableLedgerPeriodId,
    label: "No records yet",
    segmentId: "full-year",
    startDate: "",
    summary: "No record-backed ranges are available for this scope.",
    year: 0,
  };
}

function buildGeneralLedgerEntry(
  row: LedgerRecordRow & { effectiveAmountCents: number },
): GeneralLedgerEntry {
  const amount = formatCurrencyFromCents(row.effectiveAmountCents);
  const counterparty =
    row.recordKind === "income" ? normalizeLabel(row.sourceLabel) : normalizeLabel(row.targetLabel);
  const lines =
    row.recordKind === "income"
      ? [
          {
            accountName: "Cash & Bank",
            amount,
            detail: counterparty,
            id: `${row.recordId}-debit`,
            side: "debit" as const,
          },
          {
            accountName: buildRevenueAccountName(row.sourceLabel),
            amount,
            detail: normalizeLabel(row.description),
            id: `${row.recordId}-credit`,
            side: "credit" as const,
          },
        ]
      : [
          {
            accountName:
              row.recordKind === "personal_spending"
                ? "Personal Spending"
                : buildExpenseAccountName(row.taxLineCode),
            amount,
            detail: normalizeLabel(row.description),
            id: `${row.recordId}-debit`,
            side: "debit" as const,
          },
          {
            accountName: "Cash & Bank",
            amount,
            detail: normalizeLabel(row.sourceLabel),
            id: `${row.recordId}-credit`,
            side: "credit" as const,
          },
        ];

  return {
    amount,
    dateLabel: formatDisplayDate(row.occurredOn),
    id: row.recordId,
    kindLabel:
      row.recordKind === "income"
        ? "Income"
        : row.recordKind === "personal_spending"
          ? "Personal"
          : "Expense",
    lines,
    subtitle: row.memo?.trim() || `${formatDisplayDate(row.occurredOn)} • Ref: ${row.recordId}`,
    title: normalizeLabel(row.description),
  };
}

function buildGroupedSectionRows(
  rows: readonly (LedgerRecordRow & { effectiveAmountCents: number })[],
  kind: "expense" | "income",
): LedgerSectionRow[] {
  const groups = new Map<string, number>();

  for (const row of rows) {
    const key =
      kind === "income"
        ? normalizeLabel(row.sourceLabel || row.description)
        : normalizeLabel(row.targetLabel || row.description);
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
          ? "Grouped by recorded source label for posted or reconciled inflows."
          : "Grouped by recorded target label for posted or reconciled expense outflows.",
    }));
}

function buildExpenseAccountName(taxLineCode: string | null): string {
  if (!taxLineCode) {
    return "Operating Expense";
  }

  if (taxLineCode.toLowerCase() === "line27a") {
    return "Schedule C Other Expense";
  }

  return `Expense ${taxLineCode.toUpperCase()}`;
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

function buildRevenueAccountName(sourceLabel: string): string {
  const normalized = normalizeLabel(sourceLabel);

  if (normalized === "Unlabeled record") {
    return "Creator Revenue";
  }

  return `${normalized} Revenue`;
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

function formatRangeSummary(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDisplayDate(startDate);
  }

  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function endOfMonth(dateValue: string): string {
  const date = new Date(`${dateValue.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function normalizeIsoDate(value: string): string {
  return value.slice(0, 10);
}

function normalizeLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "Unlabeled record";
}

function padMonth(value: number): string {
  return value.toString().padStart(2, "0");
}

const monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const monthNamesLong = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const ledgerPostableStatuses = [...accountingPostableRecordStatuses];
