import { describe, expect, it } from "vitest";

import {
  formatLedgerParseCandidateState,
  formatLedgerParseProposalType,
  formatLedgerParseWorkflowState,
} from "../src/features/ledger/ledger-parse-localization";

describe("ledger parse localization", () => {
  it("formats parse workflow labels in zh-CN", () => {
    expect(formatLedgerParseCandidateState("needs_review", "zh-CN")).toBe(
      "待复核",
    );
    expect(formatLedgerParseWorkflowState("pending_approval", "zh-CN")).toBe(
      "待批准",
    );
    expect(
      formatLedgerParseProposalType("persist_candidate_record", "zh-CN"),
    ).toBe("写入候选记录");
    expect(
      formatLedgerParseProposalType("resolve_duplicate_receipt", "zh-CN"),
    ).toBe("处理重复票据");
  });

  it("keeps english parse workflow labels readable", () => {
    expect(formatLedgerParseCandidateState("persisted_final", "en")).toBe(
      "Persisted Final",
    );
    expect(formatLedgerParseWorkflowState("executed", "en")).toBe("Executed");
    expect(formatLedgerParseProposalType("create_counterparty", "en")).toBe(
      "Create Counterparty",
    );
    expect(formatLedgerParseProposalType("merge_counterparty", "en")).toBe(
      "Merge Counterparty",
    );
  });
});
