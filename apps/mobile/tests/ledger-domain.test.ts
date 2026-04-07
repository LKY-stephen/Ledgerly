import { describe, expect, it } from "vitest";

import {
  buildRecordSchemeTemplate,
  buildRemoteExtractedData,
  formatExtractedDataJson,
  formatFirstParsePayloadJson,
  prioritizeEvidenceQueue,
} from "../src/features/ledger/ledger-domain";

describe("ledger parse json preview", () => {
  it("formats the first parser payload as indented JSON for the parse screen", () => {
    const preview = formatFirstParsePayloadJson({
      candidates: {
        amountCents: 9900,
        category: "expense",
        date: "2026-04-02",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      fields: {
        amountCents: 9900,
        category: "expense",
        date: "2026-04-02",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      model: "gpt-5",
      originData: {
        invoice: {
          total: 99,
        },
        merchant: "Intercom",
      },
      parser: "openai_gpt" as const,
      rawLines: ["Intercom", "$99.00"],
      rawSummary: "Intercom receipt",
      rawText: "Intercom\n$99.00",
      sourceLabel: "OpenAI GPT",
      warnings: [],
    });

    expect(preview).toContain('"merchant": "Intercom"');
    expect(preview).toContain('"total": 99');
    expect(preview).not.toContain('"parser": "openai_gpt"');
  });

  it("formats the workflow snapshot as indented JSON for the parse screen", () => {
    const preview = formatExtractedDataJson({
      candidates: {
        amountCents: 9900,
        category: "expense",
        date: "2026-04-02",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      fields: {
        amountCents: 9900,
        category: "expense",
        date: "2026-04-02",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      model: "gpt-5",
      originData: {
        invoice: {
          total: 99,
        },
        merchant: "Intercom",
      },
      parser: "openai_gpt" as const,
      rawLines: ["Intercom", "$99.00"],
      rawSummary: "Intercom receipt",
      rawText: "Intercom\n$99.00",
      sourceLabel: "OpenAI GPT",
      warnings: [],
    });

    expect(preview).toContain('"originData"');
    expect(preview).toContain('"parser": "openai_gpt"');
    expect(preview).toContain('"rawSummary": "Intercom receipt"');
  });

  it("returns an empty string when extracted data is unavailable", () => {
    expect(formatExtractedDataJson(null)).toBe("");
    expect(formatFirstParsePayloadJson(null)).toBe("");
  });

  it("prioritizes the focused upload so parse review opens the latest upload response", () => {
    const queue = prioritizeEvidenceQueue(
      [
        {
          batchCreatedAt: "2026-04-02T10:00:00.000Z",
          batchId: "batch-old",
          batchState: "parse_pending",
          capturedAmountCents: 0,
          capturedDate: "2026-04-02",
          capturedDescription: "",
          capturedSource: "",
          capturedTarget: "",
          candidateRecords: [],
          createdAt: "2026-04-02T10:00:00.000Z",
          duplicateKind: null,
          evidenceId: "evidence-old",
          evidenceKind: "document",
          extractionRunId: null,
          extractedData: null,
          filePath: "old.pdf",
          mimeType: "application/pdf",
          originalFileName: "old.pdf",
          parseStatus: "pending",
          plannerRunId: null,
          plannerSummary: null,
          readTasks: [],
          resolutions: [],
          writeProposals: [],
        },
        {
          batchCreatedAt: "2026-04-03T10:00:00.000Z",
          batchId: "batch-new",
          batchState: "parse_pending",
          capturedAmountCents: 0,
          capturedDate: "2026-04-03",
          capturedDescription: "",
          capturedSource: "",
          capturedTarget: "",
          candidateRecords: [],
          createdAt: "2026-04-03T10:00:00.000Z",
          duplicateKind: null,
          evidenceId: "evidence-new",
          evidenceKind: "document",
          extractionRunId: null,
          extractedData: null,
          filePath: "new.pdf",
          mimeType: "application/pdf",
          originalFileName: "new.pdf",
          parseStatus: "pending",
          plannerRunId: null,
          plannerSummary: null,
          readTasks: [],
          resolutions: [],
          writeProposals: [],
        },
      ],
      "evidence-new",
    );

    expect(queue.map((item) => item.evidenceId)).toEqual(["evidence-new", "evidence-old"]);
  });

  it("stores remote originData and falls back rawText to the serialized JSON payload", () => {
    const parsePayload = {
      candidates: {
        amountCents: 9900,
        category: "expense",
        date: "2026-02-27",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      fields: {
        amountCents: 9900,
        category: "expense",
        date: "2026-02-27",
        description: "Intercom",
        notes: null,
        source: "Visa",
        target: "Intercom",
        taxCategory: "software",
      },
      model: "gpt-5",
      parser: "openai_gpt" as const,
      rawSummary: "Intercom receipt",
      rawText: "Intercom\n2026-02-27\n$99.00",
      warnings: [],
    };
    const scheme = {
      amount_cents: 9900,
      description: "Intercom",
      memo: "",
      occurred_on: "2026-02-27",
      record_kind: "expense",
      source_label: "Visa",
      target_label: "Intercom",
      tax_category_code: "software",
    } as const;

    const extractedData = buildRemoteExtractedData({
      fileName: "receipt.pdf",
      parsePayload,
      scheme,
      sourceLabel: "OpenAI GPT",
    });

    expect(extractedData.originData).toEqual(parsePayload);
    expect(extractedData.rawText).toBe("Intercom\n2026-02-27\n$99.00");
    expect(extractedData.rawSummary).toBe("Intercom receipt");
    expect(extractedData.fields).toMatchObject({
      amountCents: 9900,
      category: "expense",
      date: "2026-02-27",
      description: "Intercom",
      source: "Visa",
      target: "Intercom",
      taxCategory: "software",
    });
    expect(extractedData.scheme).toEqual(scheme);
  });

  it("builds the mapping scheme from the records table contract instead of the parse form fields", () => {
    const scheme = buildRecordSchemeTemplate();

    expect(Object.keys(scheme)).toEqual([
      "record_id",
      "entity_id",
      "record_status",
      "source_system",
      "description",
      "memo",
      "occurred_on",
      "currency",
      "amount_cents",
      "source_label",
      "target_label",
      "source_counterparty_id",
      "target_counterparty_id",
      "record_kind",
      "category_code",
      "subcategory_code",
      "tax_category_code",
      "tax_line_code",
      "business_use_bps",
      "created_at",
      "updated_at",
    ]);
  });
});
