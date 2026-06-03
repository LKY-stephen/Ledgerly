import { describe, expect, it } from "vitest";

import {
  buildMonthlyReportPeriodId,
  createDefaultReportRouteState,
  getReportRouteLaunchOverrideFromCandidates,
  parsePersistedReportRouteState,
  reduceReportRouteState,
  resolveReportRouteState,
  serializePersistedReportRouteState,
} from "../src/features/ledger/report-route-state";

describe("report route state", () => {
  it("falls back to defaults when persisted cache is missing or invalid", () => {
    expect(parsePersistedReportRouteState(null)).toEqual(
      createDefaultReportRouteState(),
    );
    expect(parsePersistedReportRouteState("{bad-json")).toEqual(
      createDefaultReportRouteState(),
    );
  });

  it("round-trips persisted report route memory", () => {
    const serialized = serializePersistedReportRouteState({
      lastNonProfitLossScope: "personal",
      periodId: "2026:m04",
      view: "general-ledger",
    });

    expect(parsePersistedReportRouteState(serialized)).toEqual({
      lastNonProfitLossScope: "personal",
      periodId: "2026:m04",
      view: "general-ledger",
    });
  });

  it("forces P&L launches into business scope while preserving the last non-P&L scope", () => {
    expect(
      resolveReportRouteState({
        launchOverride: { view: "profit-loss" },
        persisted: {
          lastNonProfitLossScope: "personal",
          periodId: "2026:m03",
          view: "balance-sheet",
        },
      }),
    ).toEqual({
      lastNonProfitLossScope: "personal",
      periodId: "2026:m03",
      scope: "business",
      view: "profit-loss",
    });
  });

  it("restores the remembered non-P&L scope after leaving profit-loss", () => {
    expect(
      reduceReportRouteState({
        nextScope: "business",
        nextView: "profit-loss",
        previous: {
          lastNonProfitLossScope: "personal",
          periodId: "2026:m04",
          view: "profit-loss",
        },
      }),
    ).toEqual({
      lastNonProfitLossScope: "personal",
      periodId: "2026:m04",
      view: "profit-loss",
    });

    expect(
      resolveReportRouteState({
        persisted: {
          lastNonProfitLossScope: "personal",
          periodId: "2026:m04",
          view: "balance-sheet",
        },
      }),
    ).toMatchObject({
      scope: "personal",
      view: "balance-sheet",
    });
  });

  it("derives the report launch override from approved business-only parse results", () => {
    expect(
      getReportRouteLaunchOverrideFromCandidates([
        {
          payload: { date: "2026-04-10", recordKind: "income" },
          reviewValues: { date: "2026-04-10" },
          state: "approved",
        },
        {
          payload: { date: "2026-04-13", recordKind: "expense" },
          reviewValues: { date: "2026-04-13" },
          state: "persisted_final",
        },
      ] as never),
    ).toEqual({
      periodId: "2026:m04",
      scope: "business",
      view: "profit-loss",
    });
  });

  it("falls back to balance sheet for mixed created record kinds", () => {
    expect(
      getReportRouteLaunchOverrideFromCandidates([
        {
          payload: { date: "2026-05-01", recordKind: "income" },
          reviewValues: { date: "2026-05-01" },
          state: "approved",
        },
        {
          payload: { date: "2026-05-02", recordKind: "personal_spending" },
          reviewValues: { date: "2026-05-02" },
          state: "approved",
        },
      ] as never),
    ).toEqual({
      periodId: "2026:m05",
      scope: "business",
      view: "balance-sheet",
    });
  });

  it("builds a month-scoped period id from an approved candidate date", () => {
    expect(buildMonthlyReportPeriodId("2026-12-31")).toBe("2026:m12");
    expect(buildMonthlyReportPeriodId("bad-date")).toBeNull();
  });
});
