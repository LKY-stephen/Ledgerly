import {
  scheduleCSupportedLineDefinitions,
  type ScheduleCAggregationResult,
  type ScheduleCSupportedLineCode,
} from "./schedule-c";

const supportedExpenseLineCodes = scheduleCSupportedLineDefinitions
  .filter((definition) => definition.category !== "income")
  .map((definition) => definition.lineCode as ScheduleCSupportedLineCode);

export interface SupportedScheduleCNetProfitPreview {
  currency: "USD" | null;
  deductibleExpensesCents: number | null;
  grossReceiptsCents: number | null;
  includedLineCodes: ScheduleCSupportedLineCode[];
  netProfitCents: number | null;
  sourceNote: string;
}

export function buildSupportedScheduleCNetProfitPreview(
  aggregation: ScheduleCAggregationResult,
): SupportedScheduleCNetProfitPreview {
  const reviewNotes = [
    ...Object.values(aggregation.lineReviewNotes),
    aggregation.partVReviewNote,
  ].filter((note): note is string => Boolean(note));

  if (reviewNotes.length > 0) {
    return {
      currency: null,
      deductibleExpensesCents: null,
      grossReceiptsCents: null,
      includedLineCodes: [],
      netProfitCents: null,
      sourceNote: `Current mapped Schedule C lines still need review before a downstream Schedule SE preview can be shown. ${reviewNotes[0]}`,
    };
  }

  const grossReceiptsCents = aggregation.lineAmounts.line1?.amountCents ?? 0;
  const includedLineCodes = Object.keys(aggregation.lineAmounts) as ScheduleCSupportedLineCode[];
  const deductibleExpensesCents = supportedExpenseLineCodes.reduce((sum, lineCode) => {
    return sum + (aggregation.lineAmounts[lineCode]?.amountCents ?? 0);
  }, 0);
  const hasAnySupportedAmounts = grossReceiptsCents > 0 || deductibleExpensesCents > 0;

  if (!hasAnySupportedAmounts) {
    return {
      currency: null,
      deductibleExpensesCents: null,
      grossReceiptsCents: null,
      includedLineCodes: [],
      netProfitCents: null,
      sourceNote:
        "No authoritative cash-basis USD Schedule C line mappings are available locally for a downstream Schedule SE preview yet.",
    };
  }

  const includedLineLabel = includedLineCodes.length > 0 ? includedLineCodes.join(", ") : "none";

  return {
    currency: "USD",
    deductibleExpensesCents,
    grossReceiptsCents,
    includedLineCodes,
    netProfitCents: grossReceiptsCents - deductibleExpensesCents,
    sourceNote: `Preview uses only the currently query-backed Schedule C lines (${includedLineLabel}) and still treats unsupported Schedule C lines as manual.`,
  };
}
