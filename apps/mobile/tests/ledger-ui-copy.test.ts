import { describe, expect, it } from "vitest";

import {
  describeUploadCandidate,
  formatUploadCandidateSize,
  getProposalUiCopy,
} from "../src/features/ledger/ledger-ui-copy";

describe("ledger upload preview helpers", () => {
  it("formats byte sizes for operator preview metadata", () => {
    expect(formatUploadCandidateSize(null)).toBeNull();
    expect(formatUploadCandidateSize(0)).toBeNull();
    expect(formatUploadCandidateSize(512)).toBe("512 B");
    expect(formatUploadCandidateSize(1_536)).toBe("1.5 KB");
    expect(formatUploadCandidateSize(2_621_440)).toBe("2.5 MB");
  });

  it("describes image uploads with image preview copy", () => {
    expect(
      describeUploadCandidate({
        kind: "image",
        mimeType: "image/jpeg",
        originalFileName: "receipt.jpg",
        sizeBytes: 2_048,
      }),
    ).toEqual({
      detailLines: ["Type: image/jpeg", "Size: 2.0 KB"],
      iconName: "image-outline",
      title: "Image preview",
    });
  });

  it("describes document uploads with document preview copy", () => {
    expect(
      describeUploadCandidate({
        kind: "document",
        mimeType: "application/pdf",
        originalFileName: "receipt.pdf",
        sizeBytes: 8_192,
      }),
    ).toEqual({
      detailLines: ["Type: application/pdf", "Size: 8.0 KB"],
      iconName: "file-document-outline",
      title: "Document preview",
    });
  });
});

describe("ledger proposal copy helpers", () => {
  it("builds duplicate-receipt decision copy from overlap metadata", () => {
    expect(
      getProposalUiCopy("resolve_duplicate_receipt", {
        duplicateReceiptLabel: "receipt-2026-02-27.pdf",
        overlapEntryCount: 5,
      }),
    ).toEqual({
      approveLabel: "Merge Receipt",
      detailLines: ["Conflict: receipt-2026-02-27.pdf", "Overlapping entries: 5"],
      rejectLabel: "Keep Separate",
      summary: "This upload appears to overlap 5 receipt entries.",
      title: "Duplicate receipt decision",
    });
  });

  it("builds counterparty-merge decision copy from parsed and existing names", () => {
    expect(
      getProposalUiCopy("merge_counterparty", {
        existingDisplayName: "Intercom, Inc.",
        parsedDisplayName: "Intercom",
      }),
    ).toEqual({
      approveLabel: "Merge Counterparty",
      detailLines: ["Parsed party: Intercom", "Keep existing: Intercom, Inc."],
      rejectLabel: "Keep New Counterparty",
      summary: "Use Intercom, Inc. instead of creating a duplicate local counterparty.",
      title: "Counterparty merge decision",
    });
  });

  it("falls back to generic approve/reject copy for ordinary proposal types", () => {
    expect(getProposalUiCopy("persist_candidate_record", null)).toEqual({
      approveLabel: "Approve",
      detailLines: [],
      rejectLabel: "Reject",
      summary: null,
      title: "Persist Candidate Record",
    });
  });
});
