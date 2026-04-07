import { describe, expect, it } from "vitest";

import {
  buildLedgerPeriodIdForYearAndSegment,
  buildLedgerPeriodIdForSegment,
  buildLedgerPeriodIdForYear,
  getAvailableQuarterPickerOptions,
  getAvailableQuarterSegmentIds,
} from "../src/features/ledger/ledger-screen-state";

describe("useLedgerScreen helpers", () => {
  it("builds the next period id when the user changes only the segment", () => {
    expect(buildLedgerPeriodIdForSegment(2026, "full-year")).toBe("2026:full-year");
    expect(buildLedgerPeriodIdForSegment(2026, "q2")).toBe("2026:q2");
    expect(buildLedgerPeriodIdForSegment(2026, "m08")).toBe("2026:m08");
  });

  it("builds the next period id when the user changes only the year", () => {
    expect(buildLedgerPeriodIdForYear("2024", "q3")).toBe("2024:q3");
    expect(buildLedgerPeriodIdForYear("2021", "m02")).toBe("2021:m02");
  });

  it("builds an exact target period id for atomic picker selections", () => {
    expect(buildLedgerPeriodIdForYearAndSegment("2024", "full-year")).toBe("2024:full-year");
    expect(buildLedgerPeriodIdForYearAndSegment("2024", "q3")).toBe("2024:q3");
    expect(buildLedgerPeriodIdForYearAndSegment("2021", "m02")).toBe("2021:m02");
    expect(buildLedgerPeriodIdForYearAndSegment("bad-year", "m02")).toBeNull();
  });

  it("rejects invalid years instead of mutating hook state to a broken period id", () => {
    expect(buildLedgerPeriodIdForYear("abc", "m04")).toBeNull();
    expect(buildLedgerPeriodIdForYear("20.5", "full-year")).toBeNull();
  });

  it("derives only record-backed quarter ids for the selected year", () => {
    expect(
      getAvailableQuarterSegmentIds(
        [
          { segmentId: "full-year", year: 2026 },
          { segmentId: "q2", year: 2026 },
          { segmentId: "m04", year: 2026 },
          { segmentId: "q3", year: 2024 },
          { segmentId: "m09", year: 2024 },
        ],
        "2026",
      ),
    ).toEqual(["q2"]);
    expect(
      getAvailableQuarterSegmentIds(
        [{ segmentId: "q4", year: 2025 }],
        "bad-year",
      ),
    ).toEqual([]);
  });

  it("derives the exact quarter picker actions from record-backed quarters", () => {
    expect(
      getAvailableQuarterPickerOptions(
        [
          { segmentId: "full-year", year: 2026 },
          { segmentId: "q2", year: 2026 },
          { segmentId: "m04", year: 2026 },
          { segmentId: "q4", year: 2026 },
          { segmentId: "m10", year: 2026 },
          { segmentId: "q1", year: 2024 },
        ],
        "2026",
      ),
    ).toEqual([
      { id: "q2", label: "Q2", wholeLabel: "All Q2" },
      { id: "q4", label: "Q4", wholeLabel: "All Q4" },
    ]);
    expect(
      getAvailableQuarterPickerOptions(
        [{ segmentId: "q3", year: 2025 }],
        "bad-year",
      ),
    ).toEqual([]);
  });
});
