import { accountingPostableRecordStatuses } from "./contracts";

const expenseLikeRecordKinds = ["expense", "reimbursable_expense"] as const;
const incomeLikeRecordKinds = ["income", "invoice_payment", "platform_payout"] as const;

export const scheduleCSupportedLineDefinitions = [
  {
    amountField: "amountCents",
    applyBusinessUse: false,
    category: "income",
    description: "Gross receipts or sales",
    lineCode: "line1",
    recordKinds: incomeLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Advertising",
    lineCode: "line8",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Commissions and fees",
    lineCode: "line10",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Contract labor",
    lineCode: "line11",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Insurance (other than health)",
    lineCode: "line15",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Other interest",
    lineCode: "line16b",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Legal and professional services",
    lineCode: "line17",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Office expense",
    lineCode: "line18",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Rent or lease - vehicles, machinery, and equipment",
    lineCode: "line20a",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Rent or lease - other business property",
    lineCode: "line20b",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Repairs and maintenance",
    lineCode: "line21",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Supplies",
    lineCode: "line22",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Taxes and licenses",
    lineCode: "line23",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Travel",
    lineCode: "line24a",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "expense",
    description: "Utilities",
    lineCode: "line25",
    recordKinds: expenseLikeRecordKinds,
  },
  {
    amountField: "amountCents",
    applyBusinessUse: true,
    category: "part_v",
    description: "Other expenses",
    lineCode: "line27a",
    recordKinds: expenseLikeRecordKinds,
  },
] as const satisfies readonly ScheduleCLineDefinition[];

export type ScheduleCSupportedLineCode = (typeof scheduleCSupportedLineDefinitions)[number]["lineCode"];
export type ScheduleCLineCategory = (typeof scheduleCSupportedLineDefinitions)[number]["category"];
export type ScheduleCAmountField = (typeof scheduleCSupportedLineDefinitions)[number]["amountField"];

export interface ScheduleCLineDefinition {
  amountField: "amountCents";
  applyBusinessUse: boolean;
  category: "expense" | "income" | "part_v";
  description: string;
  lineCode: string;
  recordKinds: readonly string[];
}

export interface ScheduleCCandidateRecord {
  amountCents: number;
  businessUseBps: number | null;
  categoryCode: string | null;
  currency: string | null;
  description: string;
  memo: string | null;
  occurredOn: string;
  recordId: string;
  recordKind: string;
  recordStatus: string;
  subcategoryCode: string | null;
  taxCategoryCode: string | null;
  taxLineCode: string | null;
}

export interface ScheduleCReadyLineAmount {
  amountCents: number;
  currency: "USD";
  lineCode: ScheduleCSupportedLineCode;
  matchedRecordCount: number;
  matchedRecordIds: string[];
  readableCategoryLabels: string[];
}

export interface ScheduleCPartVRow {
  amountCents: number;
  currency: "USD";
  label: string;
  matchedRecordCount: number;
  matchedRecordIds: string[];
}

export interface ScheduleCAggregationResult {
  lineAmounts: Partial<Record<ScheduleCSupportedLineCode, ScheduleCReadyLineAmount>>;
  lineReviewNotes: Partial<Record<ScheduleCSupportedLineCode, string>>;
  partVReviewNote: string | null;
  partVRows: ScheduleCPartVRow[];
}

interface ScheduleCLineAccumulator {
  amountCents: number;
  matchedRecordIds: string[];
  readableCategoryLabels: Set<string>;
}

interface ScheduleCPartVAccumulator {
  amountCents: number;
  label: string;
  matchedRecordIds: string[];
}

interface ScheduleCReviewCounts {
  nonUsdCurrency: number;
  unsupportedRecordKind: number;
}

const scheduleCDefinitionsByLineCode = new Map<ScheduleCSupportedLineCode, ScheduleCLineDefinition>(
  scheduleCSupportedLineDefinitions.map((definition) => [
    definition.lineCode as ScheduleCSupportedLineCode,
    definition,
  ]),
);

const accountingPostableStatusSet = new Set<string>(accountingPostableRecordStatuses);

export function buildScheduleCAggregation(
  records: readonly ScheduleCCandidateRecord[],
): ScheduleCAggregationResult {
  const lineAccumulators = new Map<ScheduleCSupportedLineCode, ScheduleCLineAccumulator>();
  const lineReviewCounts = new Map<ScheduleCSupportedLineCode, ScheduleCReviewCounts>();
  const partVAccumulators = new Map<string, ScheduleCPartVAccumulator>();

  for (const record of records) {
    if (!accountingPostableStatusSet.has(record.recordStatus)) {
      continue;
    }

    const lineCode = normalizeSupportedLineCode(record.taxLineCode);

    if (!lineCode) {
      continue;
    }

    const definition = scheduleCDefinitionsByLineCode.get(lineCode);

    if (!definition) {
      continue;
    }

    if (!definition.recordKinds.includes(record.recordKind)) {
      incrementReviewCount(lineReviewCounts, lineCode, "unsupportedRecordKind");
      continue;
    }

    if ((record.currency ?? "USD").toUpperCase() !== "USD") {
      incrementReviewCount(lineReviewCounts, lineCode, "nonUsdCurrency");
      continue;
    }

    const amountCents = normalizeAmount(record, definition);

    if (amountCents <= 0) {
      continue;
    }

    if (definition.category === "part_v") {
      const label = deriveScheduleCPartVLabel(record);
      const nextAccumulator = partVAccumulators.get(label) ?? {
        amountCents: 0,
        label,
        matchedRecordIds: [],
      };

      nextAccumulator.amountCents += amountCents;
      nextAccumulator.matchedRecordIds.push(record.recordId);
      partVAccumulators.set(label, nextAccumulator);
      continue;
    }

    const nextAccumulator = lineAccumulators.get(lineCode) ?? {
      amountCents: 0,
      matchedRecordIds: [],
      readableCategoryLabels: new Set<string>(),
    };

    nextAccumulator.amountCents += amountCents;
    nextAccumulator.matchedRecordIds.push(record.recordId);

    for (const label of deriveReadableCategoryLabels(record)) {
      nextAccumulator.readableCategoryLabels.add(label);
    }

    lineAccumulators.set(lineCode, nextAccumulator);
  }

  const lineAmounts: Partial<Record<ScheduleCSupportedLineCode, ScheduleCReadyLineAmount>> = {};
  const lineReviewNotes: Partial<Record<ScheduleCSupportedLineCode, string>> = {};
  let partVReviewNote: string | null = null;
  const partVLineCode: ScheduleCSupportedLineCode = "line27a";
  const partVReviewCounts = lineReviewCounts.get(partVLineCode);

  for (const definition of scheduleCSupportedLineDefinitions) {
    const lineCode = definition.lineCode as ScheduleCSupportedLineCode;

    if (definition.category === "part_v") {
      continue;
    }

    const reviewCounts = lineReviewCounts.get(lineCode);
    const accumulator = lineAccumulators.get(lineCode);

    if (hasReviewCounts(reviewCounts)) {
      lineReviewNotes[lineCode] = buildScheduleCReviewNote(definition.description, reviewCounts);
      continue;
    }

    if (!accumulator || accumulator.amountCents <= 0) {
      continue;
    }

    lineAmounts[lineCode] = {
      amountCents: accumulator.amountCents,
      currency: "USD",
      lineCode,
      matchedRecordCount: accumulator.matchedRecordIds.length,
      matchedRecordIds: accumulator.matchedRecordIds,
      readableCategoryLabels: [...accumulator.readableCategoryLabels].sort(),
    };
  }

  let partVRows: ScheduleCPartVRow[] = [];

  if (hasReviewCounts(partVReviewCounts)) {
    partVReviewNote = buildScheduleCReviewNote("Part V other expenses", partVReviewCounts);
  } else if (partVAccumulators.size > 0) {
    partVRows = [...partVAccumulators.values()]
      .sort((left, right) => right.amountCents - left.amountCents || left.label.localeCompare(right.label))
      .map((row) => ({
        amountCents: row.amountCents,
        currency: "USD",
        label: row.label,
        matchedRecordCount: row.matchedRecordIds.length,
        matchedRecordIds: row.matchedRecordIds,
      }));

    lineAmounts[partVLineCode] = {
      amountCents: partVRows.reduce((total, row) => total + row.amountCents, 0),
      currency: "USD",
      lineCode: partVLineCode,
      matchedRecordCount: partVRows.reduce((total, row) => total + row.matchedRecordCount, 0),
      matchedRecordIds: partVRows.flatMap((row) => row.matchedRecordIds),
      readableCategoryLabels: partVRows.map((row) => row.label),
    };
  }

  return {
    lineAmounts,
    lineReviewNotes,
    partVReviewNote,
    partVRows,
  };
}

export function deriveScheduleCPartVLabel(record: Pick<
  ScheduleCCandidateRecord,
  "categoryCode" | "description" | "memo" | "subcategoryCode" | "taxCategoryCode"
>): string {
  const candidates = [
    record.description,
    record.memo,
    record.subcategoryCode,
    record.categoryCode,
    record.taxCategoryCode,
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = candidate?.trim();

    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return "Other expense";
}

export function getScheduleCLineDefinition(
  lineCode: ScheduleCSupportedLineCode,
): ScheduleCLineDefinition | undefined {
  return scheduleCDefinitionsByLineCode.get(lineCode);
}

export function isSupportedScheduleCLineCode(value: string | null | undefined): value is ScheduleCSupportedLineCode {
  return normalizeSupportedLineCode(value) !== null;
}

function normalizeSupportedLineCode(value: string | null | undefined): ScheduleCSupportedLineCode | null {
  const normalizedValue = value?.trim() as ScheduleCSupportedLineCode | undefined;

  if (!normalizedValue) {
    return null;
  }

  return scheduleCDefinitionsByLineCode.has(normalizedValue) ? normalizedValue : null;
}

function normalizeAmount(
  record: ScheduleCCandidateRecord,
  definition: ScheduleCLineDefinition,
): number {
  const absoluteAmount = Math.abs(record.amountCents);

  if (!definition.applyBusinessUse) {
    return absoluteAmount;
  }

  const businessUseBps = Math.max(record.businessUseBps ?? 10_000, 0);
  return Math.round((absoluteAmount * businessUseBps) / 10_000);
}

function deriveReadableCategoryLabels(
  record: Pick<ScheduleCCandidateRecord, "categoryCode" | "subcategoryCode" | "taxCategoryCode">,
): string[] {
  const labels = [record.taxCategoryCode, record.subcategoryCode, record.categoryCode]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(labels)];
}

function incrementReviewCount(
  reviewCountsByLine: Map<ScheduleCSupportedLineCode, ScheduleCReviewCounts>,
  lineCode: ScheduleCSupportedLineCode,
  key: keyof ScheduleCReviewCounts,
) {
  const nextCounts = reviewCountsByLine.get(lineCode) ?? {
    nonUsdCurrency: 0,
    unsupportedRecordKind: 0,
  };

  nextCounts[key] += 1;
  reviewCountsByLine.set(lineCode, nextCounts);
}

function hasReviewCounts(counts: ScheduleCReviewCounts | undefined): counts is ScheduleCReviewCounts {
  return Boolean(
    counts &&
      (counts.nonUsdCurrency > 0 || counts.unsupportedRecordKind > 0),
  );
}

function buildScheduleCReviewNote(
  description: string,
  counts: ScheduleCReviewCounts,
): string {
  const fragments: string[] = [];

  if (counts.nonUsdCurrency > 0) {
    fragments.push(
      `${formatCount(counts.nonUsdCurrency, "mapped record")} using non-USD currency without stored IRS-ready translation data`,
    );
  }

  if (counts.unsupportedRecordKind > 0) {
    fragments.push(
      `${formatCount(counts.unsupportedRecordKind, "mapped record")} using record kinds outside the current Schedule C contract`,
    );
  }

  return `Review required for ${description}: ${fragments.join(", ")}. This line stays manual until the data matches the confirmed cash-basis USD contract.`;
}

function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
