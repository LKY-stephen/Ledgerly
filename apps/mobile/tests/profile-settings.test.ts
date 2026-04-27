import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/app-shell/storage", () => ({
  loadPersistedAiProvider: vi.fn(async () => "openai"),
  loadPersistedGeminiApiKey: vi.fn(async () => ""),
  loadPersistedGeminiAuthMode: vi.fn(async () => "api_key"),
  loadPersistedInferApiKey: vi.fn(async () => ""),
  loadPersistedInferBaseUrl: vi.fn(async () => ""),
  loadPersistedInferModel: vi.fn(async () => ""),
  loadPersistedOpenAiApiKey: vi.fn(async () => "test-openai-key"),
}));

import { planEvidenceDbUpdates, resetRemoteParseRuntimeStateForTests } from "../src/features/ledger/remote-parse";

const originalBaseUrl = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const originalModel = process.env.EXPO_PUBLIC_OPENAI_MODEL;
const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

afterEach(() => {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = originalBaseUrl;
  process.env.EXPO_PUBLIC_OPENAI_MODEL = originalModel;
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
  delete process.env.EXPO_PUBLIC_OPENAI_FALLBACK_MODELS;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetRemoteParseRuntimeStateForTests();
});

function stubOpenAiEnv() {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
  process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";
}

function buildPlannerResponse() {
  return JSON.stringify({
    businessEvents: ["Receipt payment"],
    classifiedFacts: [
      { field: "amountCents", value: 5000, confidence: "high", status: "confirmed", reason: "Amount on receipt" },
    ],
    readTasks: [
      { readTaskId: "read-1", taskType: "counterparty_lookup", rationale: "Lookup", status: "pending" },
      { readTaskId: "read-2", taskType: "duplicate_lookup", rationale: "Dup check", status: "pending" },
    ],
    counterpartyResolutions: [
      { role: "source", displayName: "Alice", confidence: "high", status: "proposed_new", matchedCounterpartyIds: [] },
      { role: "target", displayName: "Store", confidence: "high", status: "proposed_new", matchedCounterpartyIds: [] },
    ],
    candidateRecords: [
      {
        evidenceId: "ev-1",
        amountCents: 5000,
        currency: "USD",
        date: "2026-04-01",
        description: "Test",
        recordKind: "expense",
        sourceLabel: "Alice",
        targetLabel: "Store",
      },
    ],
    writeProposals: [
      { proposalType: "create_counterparty", role: "source", values: { displayName: "Alice", role: "source" } },
      { proposalType: "create_counterparty", role: "target", values: { displayName: "Store", role: "target" } },
      { proposalType: "persist_candidate_record", values: { candidateIndex: 0 }, reviewFields: ["amount"] },
    ],
    duplicateHints: [],
    summary: "One expense record.",
    warnings: [],
  });
}

describe("planner sourceProfileInfo", () => {
  it("includes sourceProfileInfo in user prompt when profileInfo is provided", async () => {
    stubOpenAiEnv();

    let capturedBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      profileInfo: { name: "Alice Wang", email: "alice@example.com", phone: "+1234" },
      rawJson: { total: 50 },
    });

    expect(capturedBody).not.toBeNull();
    const inputMessages = capturedBody!.input as Array<{ content: Array<{ text: string }>, role: string }>;
    const userMessage = inputMessages.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();

    const userPrompt = JSON.parse(userMessage!.content[0].text);
    expect(userPrompt.sourceProfileInfo).toEqual({
      name: "Alice Wang",
      email: "alice@example.com",
      phone: "+1234",
    });
  });

  it("sets sourceProfileInfo to null when profileInfo is empty", async () => {
    stubOpenAiEnv();

    let capturedBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      profileInfo: { name: "", email: "", phone: "" },
      rawJson: { total: 50 },
    });

    const inputMessages = capturedBody!.input as Array<{ content: Array<{ text: string }>, role: string }>;
    const userMessage = inputMessages.find((m) => m.role === "user");
    const userPrompt = JSON.parse(userMessage!.content[0].text);
    expect(userPrompt.sourceProfileInfo).toBeNull();
  });

  it("sets sourceProfileInfo to null when profileInfo is omitted", async () => {
    stubOpenAiEnv();

    let capturedBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      rawJson: { total: 50 },
    });

    const inputMessages = capturedBody!.input as Array<{ content: Array<{ text: string }>, role: string }>;
    const userMessage = inputMessages.find((m) => m.role === "user");
    const userPrompt = JSON.parse(userMessage!.content[0].text);
    expect(userPrompt.sourceProfileInfo).toBeNull();
  });

  it("includes source attribution guidance in system prompt", async () => {
    stubOpenAiEnv();

    let capturedBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      rawJson: { total: 50 },
    });

    const inputMessages = capturedBody!.input as Array<{ content: Array<{ text: string }>, role: string }>;
    const systemMessage = inputMessages.find((m) => m.role === "system");
    const systemPrompt = systemMessage!.content[0].text;
    expect(systemPrompt).toContain("sourceProfileInfo");
    expect(systemPrompt).toContain("sourceLabel / targetLabel");
  });

  it("switches the planner call to a fallback model when the current model is experiencing high demand", async () => {
    stubOpenAiEnv();

    const requestedModels: string[] = [];
    let firstPrimaryAttempt = true;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        requestedModels.push(body.model);

        if (body.model === "gpt-4o" && firstPrimaryAttempt) {
          firstPrimaryAttempt = false;
          return new Response(
            JSON.stringify({ error: { message: "This model is experiencing high demand. Please try again later." } }),
            { headers: { "content-type": "application/json" }, status: 503 },
          );
        }

        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    const result = await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      rawJson: { total: 50 },
    });

    expect(result.summary).toBe("One expense record.");
    expect(requestedModels).toEqual(["gpt-4o", "gpt-4.1"]);
  });
});

describe("infer provider routing", () => {
  it("routes planner call through Infer base URL when ai_provider is infer", async () => {
    const storageMock = await import("../src/features/app-shell/storage");
    vi.mocked(storageMock.loadPersistedOpenAiApiKey).mockResolvedValue("");
    vi.mocked(storageMock.loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(storageMock.loadPersistedInferApiKey).mockResolvedValue("infer-key-123");
    vi.mocked(storageMock.loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example.com/v1");

    let capturedUrl = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response(
          JSON.stringify({ output_text: buildPlannerResponse() }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }),
    );

    const result = await planEvidenceDbUpdates({
      evidenceId: "ev-1",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      rawJson: { total: 50 },
    });

    expect(capturedUrl).toContain("https://infer.example.com/v1");
    expect(result.summary).toBe("One expense record.");
  });

  it("falls through to error when Infer base URL is empty", async () => {
    const storageMock = await import("../src/features/app-shell/storage");
    vi.mocked(storageMock.loadPersistedOpenAiApiKey).mockResolvedValue("");
    vi.mocked(storageMock.loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(storageMock.loadPersistedInferApiKey).mockResolvedValue("infer-key-123");
    vi.mocked(storageMock.loadPersistedInferBaseUrl).mockResolvedValue("");

    await expect(
      planEvidenceDbUpdates({
        evidenceId: "ev-1",
        fileName: "receipt.pdf",
        mimeType: "application/pdf",
        rawJson: { total: 50 },
      }),
    ).rejects.toThrow("No AI provider configured");
  });

  it("falls through to error when Infer API Key is empty", async () => {
    const storageMock = await import("../src/features/app-shell/storage");
    vi.mocked(storageMock.loadPersistedOpenAiApiKey).mockResolvedValue("");
    vi.mocked(storageMock.loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(storageMock.loadPersistedInferApiKey).mockResolvedValue("");
    vi.mocked(storageMock.loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example.com/v1");

    await expect(
      planEvidenceDbUpdates({
        evidenceId: "ev-1",
        fileName: "receipt.pdf",
        mimeType: "application/pdf",
        rawJson: { total: 50 },
      }),
    ).rejects.toThrow("No AI provider configured");
  });
});
