import { describe, expect, it } from "vitest";

import { buildScheduleCAggregation, buildSupportedScheduleCNetProfitPreview } from "../src/index";

import type { ScheduleCCandidateRecord } from "../src/index";

function createCandidateRecord(
  overrides: Partial<ScheduleCCandidateRecord> = {},
): ScheduleCCandidateRecord {
  return {
    amountCents: 0,
    businessUseBps: 10_000,
    categoryCode: null,
    currency: "USD",
    description: "Default record",
    memo: null,
    occurredOn: "2026-03-15",
    recordId: "record-1",
    recordKind: "expense",
    recordStatus: "posted",
    subcategoryCode: null,
    taxCategoryCode: null,
    taxLineCode: "line18",
    ...overrides,
  };
}

describe("schedule se support preview contract", () => {
  it("derives a partial Schedule C net-profit preview from supported line mappings", () => {
    const aggregation = buildScheduleCAggregation([
      createCandidateRecord({
        description: "Platform payout",
        amountCents: 500_000,
        recordId: "income-1",
        recordKind: "platform_payout",
        taxLineCode: "line1",
      }),
      createCandidateRecord({
        description: "Office tools",
        amountCents: 40_000,
        recordId: "expense-1",
        taxLineCode: "line18",
      }),
      createCandidateRecord({
        description: "Studio props",
        amountCents: 10_000,
        recordId: "expense-2",
        taxLineCode: "line27a",
      }),
    ]);
    const preview = buildSupportedScheduleCNetProfitPreview(aggregation);

    expect(preview).toMatchObject({
      currency: "USD",
      deductibleExpensesCents: 50_000,
      grossReceiptsCents: 500_000,
      netProfitCents: 450_000,
    });
    expect(preview.sourceNote).toContain("line1");
    expect(preview.sourceNote).toContain("line18");
    expect(preview.sourceNote).toContain("line27a");
  });

  it("blocks the downstream preview when a mapped Schedule C line is review-required", () => {
    const aggregation = buildScheduleCAggregation([
      createCandidateRecord({
        amountCents: 12_000,
        recordId: "expense-review",
        recordKind: "transfer",
        taxLineCode: "line18",
      }),
    ]);
    const preview = buildSupportedScheduleCNetProfitPreview(aggregation);

    expect(preview.netProfitCents).toBeNull();
    expect(preview.sourceNote).toContain("still need review");
  });
});
