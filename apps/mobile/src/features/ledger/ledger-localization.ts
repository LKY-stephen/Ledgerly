import type { ResolvedLocale } from "../app-shell/types";

export type GeneralLedgerEntryKind = "expense" | "income" | "personal";

interface LedgerRuntimeCopy {
  balance: {
    assetMetric: string;
    assetsWord: string;
    businessAssetsLabel: string;
    businessAssetsNote: string;
    deficitLabel: string;
    deficitPosition: string;
    equityLabel: string;
    equityNote: string;
    equityWord: string;
    fundingGapLabel: string;
    fundingGapMetric: string;
    fundingGapNote: string;
    liabilitiesMetric: string;
    liabilitiesWord: string;
    positivePosition: string;
  };
  common: {
    entryPlural: string;
    entrySingular: string;
    pendingDate: string;
    recordPlural: string;
    recordSingular: string;
    referenceLabel: string;
    unlabeledRecord: string;
  };
  journal: {
    businessRevenueMetric: string;
    cashAndBank: string;
    creatorRevenue: string;
    expenseMetric: string;
    expensePrefix: string;
    expenseRecordKind: string;
    groupedExpenseNote: string;
    groupedIncomeNote: string;
    incomeRecordKind: string;
    nonBusinessIncomeMetric: string;
    nonBusinessIncomeRecordKind: string;
    operatingExpense: string;
    personalRecordKind: string;
    personalSpendAccount: string;
    personalSpendMetric: string;
    revenueMetric: string;
    revenueSuffix: string;
    scheduleCOtherExpense: string;
    totalCreditsMetric: string;
    totalDebitsMetric: string;
    transactionsMetric: string;
  };
  periods: {
    wholeYear: string;
    noRecordsLabel: string;
    noRecordsSummary: string;
  };
}

const runtimeCopyByLocale: Record<ResolvedLocale, LedgerRuntimeCopy> = {
  en: {
    balance: {
      assetMetric: "Total Assets",
      assetsWord: "assets",
      businessAssetsLabel: "Net operating assets (derived)",
      businessAssetsNote:
        "Positive net operating position from posted or reconciled business records in the selected reporting slice.",
      deficitLabel: "Owner deficit (derived)",
      deficitPosition: "Negative owner position for this reporting slice",
      equityLabel: "Owner equity (derived)",
      equityNote:
        "Residual position from posted or reconciled business income minus business expenses in the selected reporting slice.",
      equityWord: "equity",
      fundingGapLabel: "Owner funding gap (derived)",
      fundingGapMetric: "Funding Gap",
      fundingGapNote:
        "Shown when business expenses exceed business inflows inside the selected reporting slice.",
      liabilitiesMetric: "Total Liabilities",
      liabilitiesWord: "liabilities",
      positivePosition: "Positive owner position for this reporting slice",
    },
    common: {
      entryPlural: "entries",
      entrySingular: "entry",
      pendingDate: "Pending date",
      recordPlural: "records",
      recordSingular: "record",
      referenceLabel: "Ref",
      unlabeledRecord: "Unlabeled record",
    },
    journal: {
      businessRevenueMetric: "Business Revenue",
      cashAndBank: "Cash & Bank",
      creatorRevenue: "Creator Revenue",
      expenseMetric: "Total Expenses",
      expensePrefix: "Expense",
      expenseRecordKind: "Expense",
      groupedExpenseNote: "Grouped by recorded target label for posted or reconciled expense outflows.",
      groupedIncomeNote: "Grouped by recorded source label for posted or reconciled inflows.",
      incomeRecordKind: "Income",
      nonBusinessIncomeMetric: "Non-Business Income",
      nonBusinessIncomeRecordKind: "Non-Business Income",
      operatingExpense: "Operating Expense",
      personalRecordKind: "Personal",
      personalSpendAccount: "Personal Spending",
      personalSpendMetric: "Personal Spend",
      revenueMetric: "Gross Revenue",
      revenueSuffix: " Revenue",
      scheduleCOtherExpense: "Schedule C Other Expense",
      totalCreditsMetric: "Total Credits (Cr)",
      totalDebitsMetric: "Total Debits (Dr)",
      transactionsMetric: "Transactions",
    },
    periods: {
      wholeYear: "Whole Year",
      noRecordsLabel: "No records yet",
      noRecordsSummary: "No record-backed ranges are available for this scope.",
    },
  },
  "zh-CN": {
    balance: {
      assetMetric: "总资产",
      assetsWord: "资产",
      businessAssetsLabel: "经营净资产（推导）",
      businessAssetsNote: "基于所选报表范围内已入账或已核对的经营记录推导出的正向净经营头寸。",
      deficitLabel: "所有者亏绌（推导）",
      deficitPosition: "本报表范围内为负向所有者头寸",
      equityLabel: "所有者权益（推导）",
      equityNote: "基于所选报表范围内经营收入减经营支出后形成的剩余头寸。",
      equityWord: "权益",
      fundingGapLabel: "所有者补资缺口（推导）",
      fundingGapMetric: "资金缺口",
      fundingGapNote: "当所选报表范围内经营支出高于经营流入时展示。",
      liabilitiesMetric: "总负债",
      liabilitiesWord: "负债",
      positivePosition: "本报表范围内为正向所有者头寸",
    },
    common: {
      entryPlural: "条分录",
      entrySingular: "条分录",
      pendingDate: "待定日期",
      recordPlural: "条记录",
      recordSingular: "条记录",
      referenceLabel: "参考编号",
      unlabeledRecord: "未命名记录",
    },
    journal: {
      businessRevenueMetric: "经营收入",
      cashAndBank: "现金与银行",
      creatorRevenue: "创作者收入",
      expenseMetric: "总支出",
      expensePrefix: "支出",
      expenseRecordKind: "支出",
      groupedExpenseNote: "按已入账或已核对的支出去向标签汇总。",
      groupedIncomeNote: "按已入账或已核对的收入来源标签汇总。",
      incomeRecordKind: "收入",
      nonBusinessIncomeMetric: "非经营收入",
      nonBusinessIncomeRecordKind: "非经营收入",
      operatingExpense: "经营支出",
      personalRecordKind: "个人",
      personalSpendAccount: "个人支出",
      personalSpendMetric: "个人支出",
      revenueMetric: "总收入",
      revenueSuffix: " 收入",
      scheduleCOtherExpense: "Schedule C 其他支出",
      totalCreditsMetric: "贷方合计",
      totalDebitsMetric: "借方合计",
      transactionsMetric: "交易数",
    },
    periods: {
      wholeYear: "全年",
      noRecordsLabel: "还没有记录",
      noRecordsSummary: "当前范围还没有由记录支撑的可选期间。",
    },
  },
};

function getIntlLocale(locale: ResolvedLocale): string {
  return locale === "zh-CN" ? "zh-CN" : "en-US";
}

export function getLedgerRuntimeCopy(locale: ResolvedLocale): LedgerRuntimeCopy {
  return runtimeCopyByLocale[locale];
}

export function formatLedgerDisplayDate(
  dateValue: string,
  locale: ResolvedLocale,
): string {
  if (!dateValue) {
    return getLedgerRuntimeCopy(locale).common.pendingDate;
  }

  const parsed = new Date(`${dateValue}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatLedgerRangeSummary(
  startDate: string,
  endDate: string,
  locale: ResolvedLocale,
): string {
  if (startDate === endDate) {
    return formatLedgerDisplayDate(startDate, locale);
  }

  return `${formatLedgerDisplayDate(startDate, locale)} - ${formatLedgerDisplayDate(endDate, locale)}`;
}

export function formatTrendPointLabel(
  dateValue: string,
  locale: ResolvedLocale,
): string {
  const parsed = new Date(`${dateValue}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: locale === "zh-CN" ? "numeric" : "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatLedgerMonthChip(
  year: number,
  monthNumber: number,
  locale: ResolvedLocale,
): string {
  const parsed = new Date(`${year}-${String(monthNumber).padStart(2, "0")}-01T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return String(monthNumber);
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatLedgerMonthTitle(
  year: number,
  monthNumber: number,
  locale: ResolvedLocale,
): string {
  const parsed = new Date(`${year}-${String(monthNumber).padStart(2, "0")}-01T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return String(year);
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

export function formatLedgerQuarterTitle(
  year: number,
  quarterLabel: string,
  locale: ResolvedLocale,
): string {
  return locale === "zh-CN" ? `${year} ${quarterLabel}` : `${quarterLabel} ${year}`;
}

export function formatLedgerRecordCount(
  count: number,
  locale: ResolvedLocale,
): string {
  const common = getLedgerRuntimeCopy(locale).common;

  return `${count} ${count === 1 ? common.recordSingular : common.recordPlural}`;
}

export function formatLedgerEntryCount(
  count: number,
  locale: ResolvedLocale,
): string {
  const common = getLedgerRuntimeCopy(locale).common;

  return `${count} ${count === 1 ? common.entrySingular : common.entryPlural}`;
}

export function formatLedgerReferenceSubtitle(
  occurredOn: string,
  recordId: string,
  locale: ResolvedLocale,
): string {
  const common = getLedgerRuntimeCopy(locale).common;
  return `${formatLedgerDisplayDate(occurredOn, locale)} · ${common.referenceLabel}: ${recordId}`;
}
