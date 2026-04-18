import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-document-picker", () => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => ({
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));

vi.mock("../src/features/app-shell/storage", () => ({
  loadPersistedAiProvider: vi.fn(async () => "openai"),
  loadPersistedGeminiApiKey: vi.fn(async () => ""),
  loadPersistedOpenAiApiKey: vi.fn(async () => ""),
}));

import * as ImagePicker from "expo-image-picker";
import * as remoteParse from "../src/features/ledger/remote-parse";

import {
  approveWriteProposal,
  loadPlannerState,
  parseFile,
  pickPhotoUploadCandidates,
  rejectWriteProposal,
  resetLedgerWebRuntimeStateForTests,
  runPlanner,
  takeCameraPhoto,
} from "../src/features/ledger/ledger-runtime.web";

const originalBaseUrl = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const originalModel = process.env.EXPO_PUBLIC_OPENAI_MODEL;
const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

afterEach(() => {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = originalBaseUrl;
  process.env.EXPO_PUBLIC_OPENAI_MODEL = originalModel;
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
  resetLedgerWebRuntimeStateForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ledger web upload runtime", () => {
  it("picks photo candidates from the image library", async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      assets: [
        {
          assetId: "photo-asset-1",
          fileName: "receipt-photo.jpg",
          fileSize: 512,
          mimeType: "image/jpeg",
          uri: "blob:photo-asset-1",
        },
      ],
      canceled: false,
    } as never);

    const candidates = await pickPhotoUploadCandidates();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "image",
      mimeType: "image/jpeg",
      originalFileName: "receipt-photo.jpg",
      uri: "blob:photo-asset-1",
    });
  });

  it("parses a file via OpenAI and returns raw JSON", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    const fileBlob = new Blob(["receipt image"], { type: "image/jpeg" });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "blob:receipt-1") {
        return new Response(fileBlob, {
          headers: { "content-type": "image/jpeg" },
          status: 200,
        });
      }

      if (url === "https://api.openai.com/v1/responses") {
        return new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-04-02",
                description: "Apple accessories",
                notes: null,
                source: "Business card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-04-02",
                description: "Apple accessories",
                notes: null,
                source: "Business card",
                target: "Apple Store",
                taxCategory: "office",
              },
              model: "gpt-4o",
              parser: "openai_gpt",
              rawSummary: "Apple accessories receipt",
              rawText: "Apple accessories 04/02/2026 $52.99",
              warnings: [],
            }),
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await parseFile("blob:receipt-1", "receipt.jpg", "image/jpeg");

    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-4o");
    expect(result.rawJson).toMatchObject({
      fields: {
        amountCents: 5299,
        description: "Apple accessories",
      },
      parser: "openai_gpt",
    });
    expect(result.rawText).toBe("Apple accessories 04/02/2026 $52.99");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns error when OpenAI fails", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    const fileBlob = new Blob(["receipt image"], { type: "image/jpeg" });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "blob:receipt-err") {
        return new Response(fileBlob, {
          headers: { "content-type": "image/jpeg" },
          status: 200,
        });
      }

      if (url === "https://api.openai.com/v1/responses") {
        return new Response(
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          {
            headers: { "content-type": "application/json" },
            status: 429,
          },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await parseFile("blob:receipt-err", "receipt.jpg", "image/jpeg");

    expect(result.error).toContain("Rate limit exceeded");
    expect(result.rawJson).toBeNull();
  });

  it("keeps merge decisions in memory for duplicate receipts and counterparties", async () => {
    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Receipt payment"],
      candidateRecords: [
        {
          amountCents: 5299,
          currency: "USD",
          date: "2026-02-27",
          description: "Apple Store accessories",
          evidenceId: "web-evidence",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Apple Store",
        },
      ],
      classifiedFacts: [],
      counterpartyResolutions: [
        {
          confidence: "high",
          displayName: "Business Card",
          matchedDisplayNames: ["Business Card"],
          matchedCounterpartyIds: ["counterparty-existing-source"],
          role: "source",
          status: "matched",
        },
        {
          confidence: "medium",
          displayName: "Apple Store",
          matchedDisplayNames: ["Apple Store LLC"],
          matchedCounterpartyIds: ["counterparty-existing-target"],
          role: "target",
          status: "ambiguous",
        },
      ],
      duplicateHints: ["near_duplicate"],
      readTasks: [
        { readTaskId: "read-1", rationale: "Lookup counterparties", status: "pending", taskType: "counterparty_lookup" },
        { readTaskId: "read-2", rationale: "Check duplicate receipts", status: "pending", taskType: "duplicate_lookup" },
      ],
      summary: "One expense record from receipt.",
      warnings: [],
      writeProposals: [
        {
          proposalType: "resolve_duplicate_receipt",
          values: {
            conflictEvidenceId: "evidence-existing-duplicate",
            duplicateReceiptLabel: "receipt-2026-02-27.pdf",
            overlapEntryCount: 5,
          },
        },
        {
          proposalType: "merge_counterparty",
          role: "target",
          values: {
            existingCounterpartyId: "counterparty-existing-target",
            existingDisplayName: "Apple Store LLC",
            parsedDisplayName: "Apple Store",
            role: "target",
          },
        },
        {
          proposalType: "create_counterparty",
          role: "target",
          values: { displayName: "Apple Store", role: "target" },
        },
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 0 },
        },
      ],
    });

    const plannerResult = await runPlanner({
      fileName: "receipt-feb-27.pdf",
      mimeType: "application/pdf",
      model: "gpt-5",
      rawJson: {
        candidates: {
          amountCents: 5299,
          category: "expense",
          date: "2026-02-27",
          description: "Apple Store accessories",
          notes: null,
          source: "Business Card",
          target: "Apple Store",
          taxCategory: "office",
        },
        fields: {
          amountCents: 5299,
          category: "expense",
          date: "2026-02-27",
          description: "Apple Store accessories",
          notes: null,
          source: "Business Card",
          target: "Apple Store",
          taxCategory: "office",
        },
        model: "gpt-5",
        parser: "openai_gpt",
        rawSummary: "Apple Store receipt",
        rawText: "Apple Store 02/27/2026 $52.99",
        warnings: [],
      },
      rawText: "Apple Store 02/27/2026 $52.99",
    });

    expect(plannerResult.writeProposals).toHaveLength(4);
    expect(plannerResult.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt")?.state).toBe("pending_approval");
    expect(plannerResult.writeProposals.find((proposal) => proposal.proposalType === "merge_counterparty")?.state).toBe("pending_approval");
    expect(plannerResult.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty")?.state).toBe("blocked");
    expect(plannerResult.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state).toBe("blocked");

    const mergeProposal = plannerResult.writeProposals.find((proposal) => proposal.proposalType === "merge_counterparty");
    const duplicateProposal = plannerResult.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt");
    const createProposal = plannerResult.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty");
    const persistProposal = plannerResult.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record");

    const afterMergeApproval = await approveWriteProposal(plannerResult.batchId, mergeProposal!.writeProposalId);
    expect(afterMergeApproval.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty")?.state).toBe("rejected");
    expect(afterMergeApproval.candidateRecords[0]?.payload.targetCounterpartyId).toBe("counterparty-existing-target");

    const afterKeepSeparate = await rejectWriteProposal(plannerResult.batchId, duplicateProposal!.writeProposalId);
    expect(afterKeepSeparate.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state).toBe("pending_approval");
    expect(afterKeepSeparate.batchState).toBe("review_required");

    const afterPersist = await approveWriteProposal(
      plannerResult.batchId,
      persistProposal!.writeProposalId,
      {
        amount: "52.99",
        category: "expense",
        date: "2026-02-27",
        description: "Apple Store accessories",
        notes: "kept separate on web",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
    );
    expect(afterPersist.batchState).toBe("approved");
    expect(afterPersist.candidateRecords[0]?.state).toBe("persisted_final");

    const reloadedState = await loadPlannerState(plannerResult.batchId);
    expect(reloadedState?.batchState).toBe("approved");
    expect(reloadedState?.writeProposals.find((proposal) => proposal.writeProposalId === createProposal!.writeProposalId)?.state).toBe("rejected");
  });

  it("supports keeping the new record when approving a duplicate merge", async () => {
    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Receipt payment"],
      candidateRecords: [
        {
          amountCents: 5299,
          currency: "USD",
          date: "2026-02-27",
          description: "Apple Store accessories",
          evidenceId: "evidence-web-keep-new",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Apple Store",
        },
      ],
      classifiedFacts: [],
      counterpartyResolutions: [
        {
          confidence: "high",
          displayName: "Business Card",
          matchedDisplayNames: [],
          matchedCounterpartyIds: [],
          role: "source",
          status: "proposed_new",
        },
      ],
      duplicateHints: [],
      readTasks: [
        { readTaskId: "read-1", rationale: "Lookup counterparties", status: "pending", taskType: "counterparty_lookup" },
        { readTaskId: "read-2", rationale: "Check duplicate receipts", status: "pending", taskType: "duplicate_lookup" },
      ],
      summary: "One expense record from the uploaded receipt.",
      warnings: [],
      writeProposals: [
        {
          proposalType: "resolve_duplicate_receipt",
          values: {
            conflictEvidenceId: "evidence-existing-duplicate",
            duplicateReceiptLabel: "receipt-2026-02-27.pdf",
            matchedRecordIds: ["record-existing-1"],
            matchedRecords: [
              {
                amountCents: 5299,
                date: "2026-02-27",
                description: "Apple Store accessories",
                recordId: "record-existing-1",
                sourceLabel: "Business Card",
                targetLabel: "Apple Store",
              },
            ],
            overlapEntryCount: 1,
          },
        },
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 0 },
        },
      ],
    });

    const plannerResult = await runPlanner({
      fileName: "receipt-feb-27-keep-new.pdf",
      mimeType: "application/pdf",
      model: "gpt-5",
      rawJson: {
        candidates: {
          amountCents: 5299,
          category: "expense",
          date: "2026-02-27",
          description: "Apple Store accessories",
          notes: null,
          source: "Business Card",
          target: "Apple Store",
          taxCategory: "office",
        },
        fields: {
          amountCents: 5299,
          category: "expense",
          date: "2026-02-27",
          description: "Apple Store accessories",
          notes: null,
          source: "Business Card",
          target: "Apple Store",
          taxCategory: "office",
        },
        model: "gpt-5",
        parser: "openai_gpt",
        rawSummary: "Apple Store receipt",
        rawText: "Apple Store 02/27/2026 $52.99",
        warnings: [],
      },
      rawText: "Apple Store 02/27/2026 $52.99",
    });

    const duplicateProposal = plannerResult.writeProposals.find(
      (proposal) => proposal.proposalType === "resolve_duplicate_receipt",
    );

    const afterKeepNew = await approveWriteProposal(
      plannerResult.batchId,
      duplicateProposal!.writeProposalId,
      {
        amount: "52.99",
        category: "expense",
        date: "2026-02-27",
        description: "Apple Store accessories",
        notes: "keep new on web",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
      {
        duplicateResolution: { keepMode: "keep_new" },
      },
    );

    expect(afterKeepNew.batchState).toBe("approved");
    expect(afterKeepNew.candidateRecords[0]?.state).toBe("persisted_final");
    expect(
      afterKeepNew.writeProposals.find(
        (proposal) => proposal.proposalType === "persist_candidate_record",
      )?.state,
    ).toBe("rejected");
  });

  it("takes a camera photo and returns an upload candidate", async () => {
    vi.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({
      assets: [
        {
          assetId: "camera-asset-1",
          fileName: "camera-photo.jpg",
          fileSize: 1024,
          mimeType: "image/jpeg",
          uri: "blob:camera-asset-1",
        },
      ],
      canceled: false,
    } as never);

    const candidates = await takeCameraPhoto();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "image",
      mimeType: "image/jpeg",
      originalFileName: "camera-photo.jpg",
      uri: "blob:camera-asset-1",
    });
  });

  it("returns empty array when camera is canceled", async () => {
    vi.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({
      assets: [],
      canceled: true,
    } as never);

    const candidates = await takeCameraPhoto();

    expect(candidates).toHaveLength(0);
  });
});
