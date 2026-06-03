import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import type { ReceiptPlannerPayload } from "@ledgerly/schemas";
import {
  createWritableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@ledgerly/storage";

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
  loadPersistedGeminiAuthMode: vi.fn(async () => "api_key"),
  loadPersistedInferApiKey: vi.fn(async () => ""),
  loadPersistedInferBaseUrl: vi.fn(async () => ""),
  loadPersistedInferModel: vi.fn(async () => ""),
  loadPersistedOpenAiApiKey: vi.fn(async () => "test-openai-key"),
}));

import * as ImagePicker from "expo-image-picker";
import * as remoteParse from "../src/features/ledger/remote-parse";
import * as webSqlite from "../src/storage/web-sqlite";
import {
  createUploadBatch,
  createExtractionRun,
  createPlannerRun,
  ensureDefaultEntity,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  savePlannerArtifacts,
  updateEvidenceExtraction,
} from "../src/features/ledger/ledger-store";
import {
  buildRemoteExtractedData,
  type ImportedEvidenceBundle,
} from "../src/features/ledger/ledger-domain";
import {
  approveWriteProposal,
  clearFailedEvidence,
  confirmEvidenceReview,
  enqueueUploadCandidates,
  loadParseQueue,
  loadPlannerState,
  parseEvidence,
  parseFile,
  pickPhotoUploadCandidates,
  rejectWriteProposal,
  resetLedgerWebRuntimeStateForTests,
  retryEvidenceParsing,
  runPlanner,
  takeCameraPhoto,
} from "../src/features/ledger/ledger-runtime.web";

const originalBaseUrl = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const originalModel = process.env.EXPO_PUBLIC_OPENAI_MODEL;
const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

function createTestWebDatabase() {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  for (const statement of structuredStoreContract.maintenanceStatements) {
    database.exec(statement);
  }

  const writableDatabase = createWritableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      database.prepare(source).run(...params);
      return;
    },
  });

  const webDatabase = {
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return writableDatabase.getAllAsync<Row>(source, ...params);
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return writableDatabase.getFirstAsync<Row>(source, ...params);
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      await writableDatabase.runAsync(source, ...params);
    },
    async execAsync(source: string) {
      database.exec(source);
    },
    exportDatabase() {
      return new Uint8Array();
    },
    close() {},
  };

  return { database, webDatabase, writableDatabase };
}

function createReceiptBundle(input: {
  batchId: string;
  capturedAt: string;
  evidenceId: string;
  fileName: string;
  filePath: string;
  sha256Hex?: string;
  sizeBytes?: number | null;
}): ImportedEvidenceBundle {
  return {
    batchId: input.batchId,
    capturedAt: input.capturedAt,
    entityId: "entity-main",
    evidenceId: input.evidenceId,
    evidenceKind: "receipt_document",
    filePath: input.filePath,
    files: [
      {
        capturedAt: input.capturedAt,
        evidenceFileId: `${input.evidenceId}-file-primary`,
        isPrimary: true,
        mimeType: "application/pdf",
        originalFileName: input.fileName,
        relativePath: input.filePath,
        sha256Hex: input.sha256Hex ?? `${input.evidenceId}-hash`,
        sizeBytes: input.sizeBytes ?? 1_024,
        vaultCollection: "evidence-objects",
      },
    ],
    sourceSystem: "ledger-upload-intake",
  };
}

function createSingleCandidatePlannerPayload(
  evidenceId: string,
): ReceiptPlannerPayload {
  return {
    businessEvents: ["Receipt payment"],
    candidateRecords: [
      {
        amountCents: 5299,
        currency: "USD",
        date: "2026-02-27",
        description: "Apple Store accessories",
        evidenceId,
        recordKind: "expense",
        sourceLabel: "Business Card",
        targetLabel: "Apple Store",
      },
    ],
    classifiedFacts: [],
    counterpartyResolutions: [],
    duplicateHints: [],
    readTasks: [
      {
        readTaskId: "read-1",
        rationale: "Lookup counterparties",
        status: "pending",
        taskType: "counterparty_lookup",
      },
      {
        readTaskId: "read-2",
        rationale: "Check duplicate receipts",
        status: "pending",
        taskType: "duplicate_lookup",
      },
    ],
    summary: "One expense record from the uploaded receipt.",
    warnings: [],
    writeProposals: [
      {
        proposalType: "persist_candidate_record",
        reviewFields: ["amount", "date", "source", "target"],
        values: { candidateIndex: 0 },
      },
    ],
  };
}

afterEach(() => {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = originalBaseUrl;
  process.env.EXPO_PUBLIC_OPENAI_MODEL = originalModel;
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
  resetLedgerWebRuntimeStateForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ledger web upload runtime", () => {
  it("exports the queue runtime functions used by the upload queue hook", async () => {
    expect(typeof loadParseQueue).toBe("function");
    expect(typeof parseEvidence).toBe("function");
    expect(typeof retryEvidenceParsing).toBe("function");
    expect(typeof confirmEvidenceReview).toBe("function");
    expect(typeof clearFailedEvidence).toBe("function");
  });

  it("defaults an ambiguous parsed date to the current date in review values", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T03:00:00.000Z"));

    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Receipt payment"],
      candidateRecords: [
        {
          amountCents: 5299,
          currency: "USD",
          date: "2026-02-27",
          description: "Apple Store accessories",
          evidenceId: "web-evidence-ambiguous-date",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Apple Store",
        },
      ],
      classifiedFacts: [
        {
          confidence: "medium",
          field: "date",
          reason: "Date inferred from receipt footer.",
          status: "uncertain",
          value: "2026-02-27",
        },
      ],
      counterpartyResolutions: [
        {
          candidateIndex: 0,
          confidence: "high",
          displayName: "Business Card",
          matchedDisplayNames: ["Business Card"],
          matchedCounterpartyIds: ["counterparty-source-1"],
          role: "source",
          status: "matched",
        },
        {
          candidateIndex: 0,
          confidence: "high",
          displayName: "Blue Bottle",
          matchedDisplayNames: ["Blue Bottle"],
          matchedCounterpartyIds: ["counterparty-target-1"],
          role: "target",
          status: "matched",
        },
        {
          candidateIndex: 1,
          confidence: "high",
          displayName: "Business Card",
          matchedDisplayNames: ["Business Card"],
          matchedCounterpartyIds: ["counterparty-source-1"],
          role: "source",
          status: "matched",
        },
        {
          candidateIndex: 1,
          confidence: "high",
          displayName: "Staples",
          matchedDisplayNames: ["Staples"],
          matchedCounterpartyIds: ["counterparty-target-2"],
          role: "target",
          status: "matched",
        },
      ],
      duplicateHints: [],
      readTasks: [
        { readTaskId: "read-1", rationale: "Lookup counterparties", status: "pending", taskType: "counterparty_lookup" },
        { readTaskId: "read-2", rationale: "Check duplicate receipts", status: "pending", taskType: "duplicate_lookup" },
      ],
      summary: "One expense record from receipt.",
      warnings: ["Date inferred from receipt footer."],
      writeProposals: [
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 0 },
        },
      ],
    });

    const plannerResult = await runPlanner({
      fileName: "receipt-ambiguous-date.pdf",
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
        records: [
          {
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
          },
        ],
        warnings: ["Date inferred from receipt footer."],
      },
      rawText: "Apple Store 02/27/2026 $52.99",
    });

    expect(plannerResult.reviewValues.date).toBe("2026-04-19");
    expect(plannerResult.candidateRecords[0]?.reviewValues.date).toBe("2026-04-19");
    expect(plannerResult.candidateRecords[0]?.payload.date).toBe("2026-02-27");
  });

  it("forwards the current app-shell provider config into the planner path", async () => {
    const providerConfigs: Array<Record<string, unknown> | undefined> = [];

    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockImplementationOnce(
      async (_input, providerConfig) => {
        providerConfigs.push(providerConfig as Record<string, unknown> | undefined);

        return {
          businessEvents: ["Receipt payment"],
          candidateRecords: [
            {
              amountCents: 5299,
              currency: "USD",
              date: "2026-02-27",
              description: "Apple Store accessories",
              evidenceId: "web-evidence-provider-config",
              recordKind: "expense",
              sourceLabel: "Business Card",
              targetLabel: "Apple Store",
            },
          ],
          classifiedFacts: [],
          counterpartyResolutions: [],
          duplicateHints: [],
          readTasks: [
            { readTaskId: "read-1", taskType: "counterparty_lookup", rationale: "Lookup counterparties", status: "pending" },
            { readTaskId: "read-2", taskType: "duplicate_lookup", rationale: "Check duplicate receipts", status: "pending" },
          ],
          summary: "One expense record.",
          warnings: [],
          writeProposals: [
            {
              proposalType: "persist_candidate_record",
              reviewFields: ["amount", "date", "source", "target"],
              values: { candidateIndex: 0 },
            },
          ],
        };
      },
    );

    const plannerResult = await runPlanner({
      fileName: "receipt-provider-config.pdf",
      mimeType: "application/pdf",
      model: "gpt-5",
      providerConfig: {
        aiProvider: "gemini",
        geminiApiKey: "ui-gemini-key",
        geminiAuthMode: "api_key",
        inferApiKey: "",
        inferBaseUrl: "",
        inferModel: "",
        openAiApiKey: "",
      },
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
        records: [
          {
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
          },
        ],
        warnings: [],
      },
      rawText: "Apple Store 02/27/2026 $52.99",
    });

    expect(providerConfigs[0]).toMatchObject({
      aiProvider: "gemini",
      geminiApiKey: "ui-gemini-key",
    });
    expect(plannerResult.plannerSummary?.summary).toBe("One expense record.");
  });

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
              records: [
                {
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
                },
              ],
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
        records: [
          {
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
          },
        ],
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

    const afterMergeApproval = await approveWriteProposal(
      plannerResult.batchId,
      mergeProposal!.writeProposalId,
      {
        amount: "52.99",
        category: "expense",
        date: "2026-03-01",
        description: "Apple Store accessories",
        notes: "edited before counterparty approval",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
    );
    expect(afterMergeApproval.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty")?.state).toBe("rejected");
    expect(afterMergeApproval.candidateRecords[0]?.payload.targetCounterpartyId).toBe("counterparty-existing-target");
    expect(afterMergeApproval.reviewValues.date).toBe("2026-03-01");
    expect(afterMergeApproval.candidateRecords[0]?.reviewValues.date).toBe("2026-03-01");

    const afterKeepSeparate = await rejectWriteProposal(plannerResult.batchId, duplicateProposal!.writeProposalId);
    expect(
      afterKeepSeparate.writeProposals.find(
        (proposal) => proposal.proposalType === "persist_candidate_record",
      )?.state,
    ).toBe("pending_approval");
    expect(afterKeepSeparate.batchState).toBe("review_required");
    expect(
      afterKeepSeparate.writeProposals.filter(
        (proposal) => proposal.state === "pending_approval",
      ),
    ).toHaveLength(1);
    expect(
      afterKeepSeparate.writeProposals.find(
        (proposal) => proposal.proposalType === "merge_counterparty",
      )?.state,
    ).toBe("executed");
    expect(
      afterKeepSeparate.writeProposals.find(
        (proposal) => proposal.proposalType === "create_counterparty",
      )?.state,
    ).toBe("rejected");

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
        records: [
          {
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
          },
        ],
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

  it("keeps candidate approvals scoped and marks batches partially approved", async () => {
    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Two receipt payments"],
      candidateRecords: [
        {
          amountCents: 1299,
          currency: "USD",
          date: "2026-03-01",
          description: "Coffee beans",
          evidenceId: "evidence-web-multi",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Blue Bottle",
        },
        {
          amountCents: 4599,
          currency: "USD",
          date: "2026-03-02",
          description: "Printer ink",
          evidenceId: "evidence-web-multi",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Staples",
        },
      ],
      classifiedFacts: [],
      counterpartyResolutions: [],
      duplicateHints: [],
      readTasks: [
        { readTaskId: "read-1", rationale: "Lookup counterparties", status: "pending", taskType: "counterparty_lookup" },
        { readTaskId: "read-2", rationale: "Check duplicate receipts", status: "pending", taskType: "duplicate_lookup" },
      ],
      summary: "Two expense records from one upload.",
      warnings: [],
      writeProposals: [
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 0 },
        },
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 1 },
        },
      ],
    });

    const plannerResult = await runPlanner({
      fileName: "multi-receipt.pdf",
      mimeType: "application/pdf",
      model: "gpt-5",
      rawJson: {
        candidates: {
          amountCents: 1299,
          category: "expense",
          date: "2026-03-01",
          description: "Coffee beans",
          notes: null,
          source: "Business Card",
          target: "Blue Bottle",
          taxCategory: "meals",
        },
        fields: {
          amountCents: 1299,
          category: "expense",
          date: "2026-03-01",
          description: "Coffee beans",
          notes: null,
          source: "Business Card",
          target: "Blue Bottle",
          taxCategory: "meals",
        },
        model: "gpt-5",
        parser: "openai_gpt",
        rawSummary: "Two receipts in one PDF",
        rawText: "Blue Bottle 03/01/2026 $12.99\nStaples 03/02/2026 $45.99",
        records: [
          {
            candidates: {
              amountCents: 1299,
              category: "expense",
              date: "2026-03-01",
              description: "Coffee beans",
              notes: null,
              source: "Business Card",
              target: "Blue Bottle",
              taxCategory: "meals",
            },
            fields: {
              amountCents: 1299,
              category: "expense",
              date: "2026-03-01",
              description: "Coffee beans",
              notes: null,
              source: "Business Card",
              target: "Blue Bottle",
              taxCategory: "meals",
            },
          },
          {
            candidates: {
              amountCents: 4599,
              category: "expense",
              date: "2026-03-02",
              description: "Printer ink",
              notes: null,
              source: "Business Card",
              target: "Staples",
              taxCategory: "office",
            },
            fields: {
              amountCents: 4599,
              category: "expense",
              date: "2026-03-02",
              description: "Printer ink",
              notes: null,
              source: "Business Card",
              target: "Staples",
              taxCategory: "office",
            },
          },
        ],
        warnings: [],
      },
      rawText: "Blue Bottle 03/01/2026 $12.99\nStaples 03/02/2026 $45.99",
    });

    expect(plannerResult.candidateRecords).toHaveLength(2);

    const persistProposals = plannerResult.writeProposals.filter(
      (proposal) => proposal.proposalType === "persist_candidate_record",
    );

    expect(persistProposals).toHaveLength(2);
    expect(persistProposals[0]?.candidateId).not.toBe(
      persistProposals[1]?.candidateId,
    );

    const firstProposal = persistProposals.find((proposal) =>
      proposal.payload.candidateIndex === 0,
    );
    const secondCandidateId = plannerResult.candidateRecords[1]?.candidateId;
    const secondCandidateOriginalReview = plannerResult.candidateRecords[1]?.reviewValues;

    const afterFirstApproval = await approveWriteProposal(
      plannerResult.batchId,
      firstProposal!.writeProposalId,
      {
        amount: "12.99",
        category: "expense",
        date: "2026-03-03",
        description: "Coffee beans adjusted",
        notes: "only first candidate approved",
        source: "Business Card",
        target: "Blue Bottle",
        taxCategory: "meals",
      },
    );

    expect(afterFirstApproval.batchState).toBe("partially_approved");
    expect(afterFirstApproval.candidateRecords[0]?.state).toBe("persisted_final");
    expect(afterFirstApproval.candidateRecords[0]?.reviewValues.description).toBe(
      "Coffee beans adjusted",
    );
    expect(afterFirstApproval.candidateRecords[1]?.candidateId).toBe(secondCandidateId);
    expect(afterFirstApproval.candidateRecords[1]?.state).toBe("validated");
    expect(afterFirstApproval.candidateRecords[1]?.reviewValues).toEqual(
      secondCandidateOriginalReview,
    );

    const reloadedState = await loadPlannerState(plannerResult.batchId);
    expect(reloadedState?.batchState).toBe("partially_approved");
    expect(reloadedState?.fileName).toBe("multi-receipt.pdf");
    expect(reloadedState?.rawText).toBe(
      "Blue Bottle 03/01/2026 $12.99\nStaples 03/02/2026 $45.99",
    );
    expect(reloadedState?.rawJson).toMatchObject({
      rawSummary: "Two receipts in one PDF",
    });
    expect(
      reloadedState?.writeProposals.some(
        (proposal) =>
          proposal.candidateId === secondCandidateId &&
          proposal.state === "pending_approval",
      ),
    ).toBe(true);
  });

  it("fails when multi-candidate planner output omits explicit candidate routing", async () => {
    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Two receipt payments"],
      candidateRecords: [
        {
          amountCents: 1299,
          currency: "USD",
          date: "2026-03-01",
          description: "Coffee beans",
          evidenceId: "evidence-web-multi-invalid",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Blue Bottle",
        },
        {
          amountCents: 4599,
          currency: "USD",
          date: "2026-03-02",
          description: "Printer ink",
          evidenceId: "evidence-web-multi-invalid",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Staples",
        },
      ],
      classifiedFacts: [],
      counterpartyResolutions: [],
      duplicateHints: [],
      readTasks: [
        { readTaskId: "read-1", rationale: "Lookup counterparties", status: "pending", taskType: "counterparty_lookup" },
        { readTaskId: "read-2", rationale: "Check duplicate receipts", status: "pending", taskType: "duplicate_lookup" },
      ],
      summary: "Two expense records from one upload.",
      warnings: [],
      writeProposals: [
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: {},
        },
      ],
    });

    await expect(
      runPlanner({
        fileName: "multi-receipt-invalid.pdf",
        mimeType: "application/pdf",
        model: "gpt-5",
        rawJson: {
          candidates: {
            amountCents: 1299,
            category: "expense",
            date: "2026-03-01",
            description: "Coffee beans",
            notes: null,
            source: "Business Card",
            target: "Blue Bottle",
            taxCategory: "meals",
          },
          fields: {
            amountCents: 1299,
            category: "expense",
            date: "2026-03-01",
            description: "Coffee beans",
            notes: null,
            source: "Business Card",
            target: "Blue Bottle",
            taxCategory: "meals",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Two receipts in one PDF",
          rawText: "Blue Bottle 03/01/2026 $12.99\nStaples 03/02/2026 $45.99",
          records: [
            {
              candidates: {
                amountCents: 1299,
                category: "expense",
                date: "2026-03-01",
                description: "Coffee beans",
                notes: null,
                source: "Business Card",
                target: "Blue Bottle",
                taxCategory: "meals",
              },
              fields: {
                amountCents: 1299,
                category: "expense",
                date: "2026-03-01",
                description: "Coffee beans",
                notes: null,
                source: "Business Card",
                target: "Blue Bottle",
                taxCategory: "meals",
              },
            },
            {
              candidates: {
                amountCents: 4599,
                category: "expense",
                date: "2026-03-02",
                description: "Printer ink",
                notes: null,
                source: "Business Card",
                target: "Staples",
                taxCategory: "office",
              },
              fields: {
                amountCents: 4599,
                category: "expense",
                date: "2026-03-02",
                description: "Printer ink",
                notes: null,
                source: "Business Card",
                target: "Staples",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        rawText: "Blue Bottle 03/01/2026 $12.99\nStaples 03/02/2026 $45.99",
      }),
    ).rejects.toThrow(
      "Planner payload must include explicit candidateIndex routing for persist_candidate_record when multiple candidate records exist.",
    );
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

  it("marks exact web file duplicates from the image hash and hides them from the active queue", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T01:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-existing-duplicate",
        capturedAt,
        evidenceId: "evidence-web-existing-duplicate",
        fileName: "existing-duplicate.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/existing-duplicate.pdf",
        sha256Hex: "shared-web-hash",
        sizeBytes: 4,
      }),
    );
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-existing-duplicate",
      createdAt: capturedAt,
      evidenceId: "evidence-web-existing-duplicate",
      sourceSystem: "ledger-upload-intake",
      state: "approved",
    });
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-web-existing-duplicate",
      extractedData: buildRemoteExtractedData({
        fileName: "existing-duplicate.pdf",
        parsePayload: {
          candidates: {
            amountCents: 400,
            category: "expense",
            date: "2026-05-26",
            description: "Existing duplicate",
            notes: null,
            source: "Business Card",
            target: "Archive",
            taxCategory: "office",
          },
          fields: {
            amountCents: 400,
            category: "expense",
            date: "2026-05-26",
            description: "Existing duplicate",
            notes: null,
            source: "Business Card",
            target: "Archive",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Existing duplicate",
          rawText: "Existing duplicate receipt",
          records: [
            {
              candidates: {
                amountCents: 400,
                category: "expense",
                date: "2026-05-26",
                description: "Existing duplicate",
                notes: null,
                source: "Business Card",
                target: "Archive",
                taxCategory: "office",
              },
              fields: {
                amountCents: 400,
                category: "expense",
                date: "2026-05-26",
                description: "Existing duplicate",
                notes: null,
                source: "Business Card",
                target: "Archive",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "parsed",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: async () =>
          new Blob([new Uint8Array([1, 2, 3, 4])], {
            type: "application/pdf",
          }),
      }),
    );
    vi.spyOn(
      await import("../src/storage/web-file-vault"),
      "computeSha256Hex",
    ).mockResolvedValue("shared-web-hash");
    vi.spyOn(
      await import("../src/storage/web-file-vault"),
      "writeVaultFile",
    ).mockResolvedValue(undefined);

    const queued = await enqueueUploadCandidates([
      {
        evidenceGroupKey: "web-duplicate",
        isPrimary: true,
        kind: "document",
        mimeType: "application/pdf",
        originalFileName: "incoming-duplicate.pdf",
        sizeBytes: 4,
        uri: "blob:web-duplicate",
      },
    ]);

    expect(queued).toHaveLength(1);

    const duplicateEvidence = await loadEvidenceById(
      writableDatabase,
      queued[0]!.evidenceId,
    );
    expect(duplicateEvidence?.batchState).toBe("duplicate_file");
    expect(duplicateEvidence?.duplicateKind).toBe("file_duplicate");

    const duplicateBatch = await writableDatabase.getFirstAsync<{
      duplicateOfEvidenceId: string | null;
      duplicateKind: string | null;
      state: string;
    }>(
      `SELECT
        duplicate_of_evidence_id AS duplicateOfEvidenceId,
        duplicate_kind AS duplicateKind,
        state
       FROM upload_batches
       WHERE batch_id = ?;`,
      queued[0]!.batchId,
    );
    expect(duplicateBatch).toEqual({
      duplicateOfEvidenceId: "evidence-web-existing-duplicate",
      duplicateKind: "file_duplicate",
      state: "duplicate_file",
    });
    expect(await loadParseQueue()).toHaveLength(0);
  });

  it("advances a queued web batch into review-ready state", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T04:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, {
      batchId: "batch-web-progress",
      capturedAt,
      entityId: "entity-main",
      evidenceId: "evidence-web-progress",
      evidenceKind: "receipt_document",
      filePath: "evidence-objects/entity-main/uploads/2026/05/web-progress.pdf",
      files: [
        {
          capturedAt,
          evidenceFileId: "evidence-file-web-progress",
          isPrimary: true,
          mimeType: "application/pdf",
          originalFileName: "web-progress.pdf",
          relativePath:
            "evidence-objects/entity-main/uploads/2026/05/web-progress.pdf",
          sha256Hex: "web-progress-hash",
          sizeBytes: 12,
          vaultCollection: "evidence-objects",
        },
      ],
      sourceSystem: "ledger-upload-intake",
    });
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-progress",
      createdAt: capturedAt,
      evidenceId: "evidence-web-progress",
      sourceSystem: "ledger-upload-intake",
      state: "uploaded",
    });

    vi.spyOn(
      await import("../src/storage/web-file-vault"),
      "readVaultFile",
    ).mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    vi.spyOn(remoteParse, "parseFileWithOpenAiFromBlob").mockResolvedValueOnce({
      error: null,
      model: "gpt-5",
      parserKind: "openai_gpt",
      rawJson: {
        candidates: {
          amountCents: 1299,
          category: "expense",
          date: "2026-05-26",
          description: "Coffee beans",
          notes: null,
          source: "Business Card",
          target: "Blue Bottle",
          taxCategory: "meals",
        },
        fields: {
          amountCents: 1299,
          category: "expense",
          date: "2026-05-26",
          description: "Coffee beans",
          notes: null,
          source: "Business Card",
          target: "Blue Bottle",
          taxCategory: "meals",
        },
        model: "gpt-5",
        parser: "openai_gpt",
        rawSummary: "Blue Bottle receipt",
        rawText: "Blue Bottle 05/26/2026 $12.99",
        records: [
          {
            candidates: {
              amountCents: 1299,
              category: "expense",
              date: "2026-05-26",
              description: "Coffee beans",
              notes: null,
              source: "Business Card",
              target: "Blue Bottle",
              taxCategory: "meals",
            },
            fields: {
              amountCents: 1299,
              category: "expense",
              date: "2026-05-26",
              description: "Coffee beans",
              notes: null,
              source: "Business Card",
              target: "Blue Bottle",
              taxCategory: "meals",
            },
          },
        ],
        warnings: [],
      },
      rawText: "Blue Bottle 05/26/2026 $12.99",
    });

    vi.spyOn(remoteParse, "planEvidenceDbUpdates").mockResolvedValueOnce({
      businessEvents: ["Receipt payment"],
      candidateRecords: [
        {
          amountCents: 1299,
          currency: "USD",
          date: "2026-05-26",
          description: "Coffee beans",
          evidenceId: "evidence-web-progress",
          recordKind: "expense",
          sourceLabel: "Business Card",
          targetLabel: "Blue Bottle",
        },
      ],
      classifiedFacts: [],
      counterpartyResolutions: [],
      duplicateHints: [],
      readTasks: [
        {
          readTaskId: "read-progress-1",
          rationale: "Lookup counterparties",
          status: "pending",
          taskType: "counterparty_lookup",
        },
        {
          readTaskId: "read-progress-2",
          rationale: "Check duplicates",
          status: "pending",
          taskType: "duplicate_lookup",
        },
      ],
      summary: "One expense record from the uploaded receipt.",
      warnings: [],
      writeProposals: [
        {
          proposalType: "persist_candidate_record",
          reviewFields: ["amount", "date", "source", "target"],
          values: { candidateIndex: 0 },
        },
      ],
    });

    const result = await parseEvidence("evidence-web-progress");
    expect(result?.batchState).toBe("write_proposal_ready");

    const reloaded = await loadEvidenceById(
      writableDatabase,
      "evidence-web-progress",
    );
    expect(reloaded?.displayState).toBe("ready_for_review");

    const queue = await loadParseQueue();
    expect(queue[0]?.displayState).toBe("ready_for_review");
  });

  it("demotes stale in-progress web batches into retryable failed state on load", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T08:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-stale-progress",
        capturedAt,
        evidenceId: "evidence-web-stale-progress",
        fileName: "stale-progress.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/stale-progress.pdf",
      }),
    );
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-stale-progress",
      createdAt: capturedAt,
      evidenceId: "evidence-web-stale-progress",
      sourceSystem: "ledger-upload-intake",
      state: "parsing",
    });
    await writableDatabase.runAsync(
      `UPDATE upload_batches
       SET updated_at = ?
       WHERE batch_id = ?;`,
      "2026-05-26T07:59:00.000Z",
      "batch-web-stale-progress",
    );

    const queue = await loadParseQueue();
    expect(queue[0]?.batchState).toBe("failed");
    expect(queue[0]?.displayState).toBe("failed");
    expect(queue[0]?.errorMessage).toContain("moved back to retry");
  });

  it("moves a retried failed web batch back into in-progress state immediately", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T09:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-retry-progress",
        capturedAt,
        evidenceId: "evidence-web-retry-progress",
        fileName: "retry-progress.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/retry-progress.pdf",
      }),
    );
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-retry-progress",
      createdAt: capturedAt,
      evidenceId: "evidence-web-retry-progress",
      sourceSystem: "ledger-upload-intake",
      state: "failed",
    });
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-web-retry-progress",
      extractedData: buildRemoteExtractedData({
        fileName: "retry-progress.pdf",
        parsePayload: {
          candidates: {
            amountCents: 1299,
            category: "expense",
            date: "2026-05-26",
            description: "Coffee beans",
            notes: null,
            source: "Business Card",
            target: "Blue Bottle",
            taxCategory: "meals",
          },
          fields: {
            amountCents: 1299,
            category: "expense",
            date: "2026-05-26",
            description: "Coffee beans",
            notes: null,
            source: "Business Card",
            target: "Blue Bottle",
            taxCategory: "meals",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Blue Bottle receipt",
          rawText: "Blue Bottle 05/26/2026 $12.99",
          records: [
            {
              candidates: {
                amountCents: 1299,
                category: "expense",
                date: "2026-05-26",
                description: "Coffee beans",
                notes: null,
                source: "Business Card",
                target: "Blue Bottle",
                taxCategory: "meals",
              },
              fields: {
                amountCents: 1299,
                category: "expense",
                date: "2026-05-26",
                description: "Coffee beans",
                notes: null,
                source: "Business Card",
                target: "Blue Bottle",
                taxCategory: "meals",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "failed",
    });

    const retried = await retryEvidenceParsing("evidence-web-retry-progress");
    expect(retried?.batchState).toBe("parsing");
    expect(retried?.displayState).toBe("recovering");
    expect(retried?.errorMessage).toBeNull();
  });

  it("removes a queue-backed duplicate review task from the active web queue after keep-separate", async () => {
    const { database, webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T05:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);

    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-existing-duplicate",
        capturedAt: "2026-05-26T04:30:00.000Z",
        evidenceId: "evidence-web-existing-duplicate",
        fileName: "existing-duplicate.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/existing-duplicate.pdf",
      }),
    );
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-existing-duplicate",
      createdAt: "2026-05-26T04:30:00.000Z",
      evidenceId: "evidence-web-existing-duplicate",
      sourceSystem: "ledger-upload-intake",
      state: "approved",
    });
    await writableDatabase.runAsync(
      `INSERT INTO records (
        record_id,
        entity_id,
        record_status,
        source_system,
        description,
        memo,
        occurred_on,
        currency,
        amount_cents,
        source_label,
        target_label,
        source_counterparty_id,
        target_counterparty_id,
        record_kind,
        category_code,
        subcategory_code,
        tax_category_code,
        tax_line_code,
        business_use_bps,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "record-web-existing-duplicate",
      "entity-main",
      "posted",
      "duplicate-fixture",
      "Apple Store accessories",
      null,
      "2026-02-27",
      "USD",
      5299,
      "Business Card",
      "Apple Store",
      null,
      null,
      "expense",
      null,
      null,
      null,
      null,
      10_000,
      "2026-02-27T08:30:00.000Z",
      "2026-02-27T08:30:00.000Z",
    );
    database
      .prepare(
        `INSERT INTO record_evidence_links (
          record_id,
          evidence_id,
          link_role,
          is_primary,
          created_at
        ) VALUES (?, ?, ?, ?, ?);`,
      )
      .run(
        "record-web-existing-duplicate",
        "evidence-web-existing-duplicate",
        "supporting",
        1,
        "2026-02-27T08:30:00.000Z",
      );

    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-duplicate-review",
        capturedAt,
        evidenceId: "evidence-web-duplicate-review",
        fileName: "duplicate-review.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/duplicate-review.pdf",
      }),
    );
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-web-duplicate-review",
      extractedData: buildRemoteExtractedData({
        fileName: "duplicate-review.pdf",
        parsePayload: {
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
          records: [
            {
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
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-duplicate-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-duplicate-review",
      sourceSystem: "ledger-upload-intake",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: "batch-web-duplicate-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-duplicate-review",
      extractionRunId: "extraction-web-duplicate-review",
    });
    await createPlannerRun(writableDatabase, {
      batchId: "batch-web-duplicate-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-duplicate-review",
      extractionRunId: "extraction-web-duplicate-review",
      plannerRunId: "planner-web-duplicate-review",
    });

    const evidenceBeforeSave = await loadEvidenceById(
      writableDatabase,
      "evidence-web-duplicate-review",
    );
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: "batch-web-duplicate-review",
      createdAt: capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-web-duplicate-review",
      remotePlan: createSingleCandidatePlannerPayload(
        "evidence-web-duplicate-review",
      ),
    });

    let queue = await loadParseQueue();
    const queueItem = queue.find(
      (item) => item.batchId === "batch-web-duplicate-review",
    );
    expect(queueItem?.displayState).toBe("ready_for_review");
    expect(queueItem?.displayStepLabel).toBe("Review duplicate match");

    const plannerState = await loadPlannerState("batch-web-duplicate-review");
    const duplicateProposal = plannerState?.writeProposals.find(
      (proposal) => proposal.proposalType === "resolve_duplicate_receipt",
    );
    expect(duplicateProposal).toBeDefined();

    const afterKeepSeparate = await rejectWriteProposal(
      "batch-web-duplicate-review",
      duplicateProposal!.writeProposalId,
    );
    expect(afterKeepSeparate.batchState).toBe("approved");

    const persistedEvidence = await loadEvidenceById(
      writableDatabase,
      "evidence-web-duplicate-review",
    );
    expect(persistedEvidence?.batchState).toBe("approved");
    expect(persistedEvidence?.candidateRecords[0]?.state).toBe("approved");

    queue = await loadParseQueue();
    expect(
      queue.some((item) => item.batchId === "batch-web-duplicate-review"),
    ).toBe(false);
  });

  it("persists a queue-backed web review confirmation out of the active queue", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T06:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-confirm-review",
        capturedAt,
        evidenceId: "evidence-web-confirm-review",
        fileName: "confirm-review.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/confirm-review.pdf",
      }),
    );
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-web-confirm-review",
      extractedData: buildRemoteExtractedData({
        fileName: "confirm-review.pdf",
        parsePayload: {
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
          records: [
            {
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
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-confirm-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-confirm-review",
      sourceSystem: "ledger-upload-intake",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: "batch-web-confirm-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-confirm-review",
      extractionRunId: "extraction-web-confirm-review",
    });
    await createPlannerRun(writableDatabase, {
      batchId: "batch-web-confirm-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-confirm-review",
      extractionRunId: "extraction-web-confirm-review",
      plannerRunId: "planner-web-confirm-review",
    });

    const evidenceBeforeSave = await loadEvidenceById(
      writableDatabase,
      "evidence-web-confirm-review",
    );
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: "batch-web-confirm-review",
      createdAt: capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-web-confirm-review",
      remotePlan: {
        businessEvents: ["Receipt payment"],
        candidateRecords: [
          {
            amountCents: 5299,
            currency: "USD",
            date: "2026-02-27",
            description: "Apple Store accessories",
            evidenceId: "evidence-web-confirm-review",
            recordKind: "expense",
            sourceLabel: "Business Card",
            targetLabel: "Apple Store",
          },
        ],
        classifiedFacts: [],
        counterpartyResolutions: [],
        duplicateHints: [],
        readTasks: [
          {
            readTaskId: "read-confirm-review-1",
            rationale: "Lookup counterparties",
            status: "pending",
            taskType: "counterparty_lookup",
          },
          {
            readTaskId: "read-confirm-review-2",
            rationale: "Check duplicate receipts",
            status: "pending",
            taskType: "duplicate_lookup",
          },
        ],
        summary: "One expense record from the uploaded receipt.",
        warnings: [],
        writeProposals: [
          {
            proposalType: "persist_candidate_record",
            reviewFields: ["amount", "date", "source", "target"],
            values: { candidateIndex: 0 },
          },
        ],
      },
    });

    const queueBefore = await loadParseQueue();
    expect(
      queueBefore.some((item) => item.batchId === "batch-web-confirm-review"),
    ).toBe(true);

    const recordId = await confirmEvidenceReview("evidence-web-confirm-review", {
      amount: "52.99",
      category: "expense",
      date: "2026-02-27",
      description: "Apple Store accessories",
      notes: "",
      source: "Business Card",
      target: "Apple Store",
      taxCategory: "office",
    });
    expect(recordId).toBe("record-evidence-web-confirm-review");

    const persistedEvidence = await loadEvidenceById(
      writableDatabase,
      "evidence-web-confirm-review",
    );
    expect(persistedEvidence?.batchState).toBe("approved");

    const queueAfter = await loadParseQueue();
    expect(
      queueAfter.some((item) => item.batchId === "batch-web-confirm-review"),
    ).toBe(false);
  });

  it("heals a legacy web review row with no candidate records left", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const capturedAt = "2026-05-26T07:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(
      writableDatabase,
      createReceiptBundle({
        batchId: "batch-web-legacy-stale-review",
        capturedAt,
        evidenceId: "evidence-web-legacy-stale-review",
        fileName: "legacy-stale-review.pdf",
        filePath:
          "evidence-objects/entity-main/uploads/2026/05/legacy-stale-review.pdf",
      }),
    );
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-web-legacy-stale-review",
      extractedData: buildRemoteExtractedData({
        fileName: "legacy-stale-review.pdf",
        parsePayload: {
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
          records: [
            {
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
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "parsed",
    });
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-legacy-stale-review",
      createdAt: capturedAt,
      evidenceId: "evidence-web-legacy-stale-review",
      sourceSystem: "ledger-upload-intake",
      state: "review_required",
    });

    const queueBefore = await loadParseQueue();
    expect(
      queueBefore.some((item) => item.batchId === "batch-web-legacy-stale-review"),
    ).toBe(false);

    await writableDatabase.runAsync(
      `UPDATE upload_batches
       SET state = 'review_required',
           updated_at = ?
       WHERE batch_id = ?;`,
      "2026-05-26T07:05:00.000Z",
      "batch-web-legacy-stale-review",
    );

    const queueAfter = await loadParseQueue();
    expect(
      queueAfter.some((item) => item.batchId === "batch-web-legacy-stale-review"),
    ).toBe(false);

    const batchState = await writableDatabase.getFirstAsync<{ state: string }>(
      `SELECT state
       FROM upload_batches
       WHERE batch_id = ?;`,
      "batch-web-legacy-stale-review",
    );
    expect(batchState?.state).toBe("approved");
  });

  it("clears a failed web task and deletes stored files when no persisted records depend on it", async () => {
    const { webDatabase, writableDatabase } = createTestWebDatabase();
    vi.spyOn(webSqlite, "getActiveWebDatabase").mockReturnValue(webDatabase);
    vi.spyOn(webSqlite, "openWebSqliteDatabase").mockResolvedValue(webDatabase);

    const deleteSpy = vi
      .spyOn(
        await import("../src/storage/web-file-vault"),
        "deleteVaultFile",
      )
      .mockResolvedValue(undefined);

    const capturedAt = "2026-05-26T03:00:00.000Z";
    await ensureDefaultEntity(writableDatabase, capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, {
      batchId: "batch-web-clear",
      capturedAt,
      entityId: "entity-main",
      evidenceId: "evidence-web-clear",
      evidenceKind: "receipt_document",
      filePath: "evidence-objects/entity-main/uploads/2026/05/failed-web-clear.pdf",
      files: [
        {
          capturedAt,
          evidenceFileId: "evidence-file-web-clear",
          isPrimary: true,
          mimeType: "application/pdf",
          originalFileName: "failed-web-clear.pdf",
          relativePath:
            "evidence-objects/entity-main/uploads/2026/05/failed-web-clear.pdf",
          sha256Hex: "failed-web-clear-hash",
          sizeBytes: 3,
          vaultCollection: "evidence-objects",
        },
      ],
      sourceSystem: "ledger-upload-intake",
    });
    await createUploadBatch(writableDatabase, {
      batchId: "batch-web-clear",
      createdAt: capturedAt,
      evidenceId: "evidence-web-clear",
      sourceSystem: "ledger-upload-intake",
      state: "failed",
    });

    const failedItem = (await loadParseQueue())[0]!;
    expect(failedItem.displayState).toBe("failed");

    await clearFailedEvidence(failedItem.evidenceId);

    expect(deleteSpy).toHaveBeenCalledWith(
      "evidence-objects/entity-main/uploads/2026/05/failed-web-clear.pdf",
    );
    expect(await loadParseQueue()).toHaveLength(0);
  });
});
