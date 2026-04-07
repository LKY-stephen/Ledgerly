import {
  buildLedgerPeriodId,
  type LedgerPeriodOption,
  type LedgerPeriodSegmentId,
} from "./ledger-reporting";

export type LedgerQuarterSegmentId = Extract<
  LedgerPeriodSegmentId,
  "q1" | "q2" | "q3" | "q4"
>;

export interface LedgerQuarterPickerOption {
  id: LedgerQuarterSegmentId;
  label: string;
  wholeLabel: string;
}

const quarterPickerOptions: readonly LedgerQuarterPickerOption[] = [
  { id: "q1", label: "Q1", wholeLabel: "All Q1" },
  { id: "q2", label: "Q2", wholeLabel: "All Q2" },
  { id: "q3", label: "Q3", wholeLabel: "All Q3" },
  { id: "q4", label: "Q4", wholeLabel: "All Q4" },
];

export function buildLedgerPeriodIdForSegment(
  year: number,
  segmentId: LedgerPeriodSegmentId,
): string {
  return buildLedgerPeriodId(year, segmentId);
}

export function buildLedgerPeriodIdForYear(
  yearId: string,
  currentSegmentId: LedgerPeriodSegmentId,
): string | null {
  const year = Number(yearId);

  if (!Number.isInteger(year)) {
    return null;
  }

  return buildLedgerPeriodId(year, currentSegmentId);
}

export function buildLedgerPeriodIdForYearAndSegment(
  yearId: string,
  segmentId: LedgerPeriodSegmentId,
): string | null {
  const year = Number(yearId);

  if (!Number.isInteger(year)) {
    return null;
  }

  return buildLedgerPeriodId(year, segmentId);
}

export function getAvailableQuarterSegmentIds(
  periodOptions: readonly Pick<LedgerPeriodOption, "segmentId" | "year">[],
  yearId: string,
): LedgerQuarterSegmentId[] {
  const year = Number(yearId);

  if (!Number.isInteger(year)) {
    return [];
  }

  const availableQuarterIds = new Set<LedgerQuarterSegmentId>();

  for (const option of periodOptions) {
    if (
      option.year === year &&
      (option.segmentId === "q1" ||
        option.segmentId === "q2" ||
        option.segmentId === "q3" ||
        option.segmentId === "q4")
    ) {
      availableQuarterIds.add(option.segmentId);
    }
  }

  return quarterPickerOptions.map((option) => option.id).filter((segmentId) =>
    availableQuarterIds.has(segmentId),
  );
}

export function getAvailableQuarterPickerOptions(
  periodOptions: readonly Pick<LedgerPeriodOption, "segmentId" | "year">[],
  yearId: string,
): LedgerQuarterPickerOption[] {
  const availableQuarterIds = new Set(
    getAvailableQuarterSegmentIds(periodOptions, yearId),
  );

  return quarterPickerOptions.filter((option) =>
    availableQuarterIds.has(option.id),
  );
}
