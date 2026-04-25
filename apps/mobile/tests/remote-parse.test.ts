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

import {
  loadPersistedAiProvider,
  loadPersistedInferApiKey,
  loadPersistedInferBaseUrl,
  loadPersistedInferModel,
  loadPersistedOpenAiApiKey,
} from "../src/features/app-shell/storage";
import {
  buildFallbackModelListForTests,
  parseFileWithOpenAiFromBlob,
  resetRemoteParseRuntimeStateForTests,
} from "../src/features/ledger/remote-parse";

const originalBaseUrl = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const originalModel = process.env.EXPO_PUBLIC_OPENAI_MODEL;
const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

function createParsePayload(input: {
  model?: string | null;
  rawSummary?: string;
  rawText?: string;
  warnings?: string[];
} = {}) {
  const record = {
    candidates: {
      amountCents: 5299,
      category: "expense",
      date: "2026-04-01",
      description: "Apple Store receipt",
      notes: null,
      source: "Business card",
      target: "Apple Store",
      taxCategory: "office",
    },
    fields: {
      amountCents: 5299,
      category: "expense",
      date: "2026-04-01",
      description: "Apple Store receipt",
      notes: null,
      source: "Business card",
      target: "Apple Store",
      taxCategory: "office",
    },
  };

  return {
    candidates: record.candidates,
    fields: record.fields,
    model: input.model === undefined ? "gpt-5" : input.model,
    parser: "openai_gpt",
    rawSummary: input.rawSummary ?? "Apple Store receipt",
    rawText: input.rawText ?? "Apple Store 04/01/2026 $52.99",
    records: [record],
    warnings: input.warnings ?? [],
  };
}

afterEach(() => {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = originalBaseUrl;
  process.env.EXPO_PUBLIC_OPENAI_MODEL = originalModel;
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
  delete process.env.EXPO_PUBLIC_OPENAI_FALLBACK_MODELS;
  delete process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS;
  vi.mocked(loadPersistedAiProvider).mockResolvedValue("openai");
  vi.mocked(loadPersistedInferApiKey).mockResolvedValue("");
  vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("");
  vi.mocked(loadPersistedInferModel).mockResolvedValue("");
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetRemoteParseRuntimeStateForTests();
});

describe("remote parse client", () => {
  it("returns a validated parser DTO for PDFs and sends them as input_file", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1/";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    const parsePayload = createParsePayload();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.openai.com/v1/responses");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-openai-key",
        "Content-Type": "application/json",
      });

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("gpt-4o");
      expect(body.store).toBe(false);
      expect(body.input[0].content[0].text).toContain("# receipt-parse");
      expect(body.input[1].content[0].text).toContain("filename: receipt.pdf");
      expect(body.input[1].content[0].text).toContain("mimeType: application/pdf");
      expect(body.input[1].content[1]).toMatchObject({
        filename: "receipt.pdf",
        type: "input_file",
      });
      expect(body.input[1].content[1].file_data).toContain("data:application/pdf;base64,");

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify(parsePayload),
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-5");
    expect(result.rawText).toBe("Apple Store 04/01/2026 $52.99");
    expect(result.rawJson).toEqual(parsePayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a validated parser DTO for images and sends them as input_image", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      expect(body.input[0].content[0].text).toContain("# receipt-parse");
      expect(body.input[1].content[0].text).toContain("filename: receipt.jpg");
      expect(body.input[1].content[0].text).toContain("mimeType: image/jpeg");
      expect(body.input[1].content[1]).toMatchObject({
        detail: "high",
        type: "input_image",
      });
      expect(body.input[1].content[1].image_url).toContain("data:image/jpeg;base64,");
      expect("filename" in body.input[1].content[1]).toBe(false);

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify(
            createParsePayload({
              model: null,
              rawSummary: "Receipt photo",
              rawText: "Photo capture raw text",
              warnings: ["Date inferred from receipt footer."],
            }),
          ),
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["image-bytes"], { type: "image/jpeg" }),
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-4o");
    expect(result.rawText).toBe("Photo capture raw text");
    expect(result.rawJson).toMatchObject({
      fields: {
        amountCents: 5299,
        description: "Apple Store receipt",
      },
      model: "gpt-4o",
      parser: "openai_gpt",
      rawSummary: "Receipt photo",
      warnings: ["Date inferred from receipt footer."],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns error when OpenAI returns a non-JSON response", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            output_text: "This is not valid JSON at all, just plain text.",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      ),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toBe("OpenAI response is not valid JSON");
    expect(result.rawText).toBe("This is not valid JSON at all, just plain text.");
    expect(result.rawJson).toBeNull();
  });

  it("returns error when OpenAI returns JSON that does not match the parser DTO", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              amountCents: 5299,
              description: "Apple Store receipt",
            }),
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      ),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toBe(
      "OpenAI parser output must include parser, model, rawText, rawSummary, warnings, and at least one record with fields and candidates.",
    );
    expect(result.rawJson).toBeNull();
  });

  it("returns error on API failure", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          {
            headers: { "content-type": "application/json" },
            status: 429,
          },
        ),
      ),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toContain("Rate limit exceeded");
    expect(result.rawJson).toBeNull();
  });

  it("returns a readable Infer error when the provider responds with non-JSON content", async () => {
    vi.mocked(loadPersistedOpenAiApiKey).mockResolvedValue("");
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-test-key");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");
    vi.mocked(loadPersistedInferModel).mockResolvedValue("gpt-4o");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html>bad gateway</html>", {
          headers: { "content-type": "text/html" },
          status: 502,
        }),
      ),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toContain("Infer returned a non-JSON response");
    expect(result.rawJson).toBeNull();
  });

  it("switches to a fallback OpenAI model when the current model is experiencing high demand", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

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
            JSON.stringify({ error: { message: "The gpt-4o model is experiencing high demand right now. Please try again later." } }),
            {
              headers: { "content-type": "application/json" },
              status: 429,
            },
          );
        }

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify(
              createParsePayload({
                model: null,
                rawText: "Fallback model raw text",
              }),
            ),
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      }),
    );

    const firstResult = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    const secondResult = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(firstResult.error).toBeNull();
    expect(firstResult.model).toBe("gpt-4.1");
    expect(secondResult.error).toBeNull();
    expect(secondResult.model).toBe("gpt-4.1");
    expect(requestedModels).toEqual(["gpt-4o", "gpt-4.1", "gpt-4.1"]);
  });

  it("filters Gemini fallback models to 2.5, 3, and 3.1 families only", () => {
    process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS = [
      "gemini-3.1-flash-preview",
      "gemini-2.0-flash",
      "gemini-3-pro-preview",
    ].join(",");

    expect(buildFallbackModelListForTests("gemini", "gemini-2.5-flash")).toEqual([
      "gemini-2.5-flash",
      "gemini-3.1-flash-preview",
      "gemini-3-pro-preview",
      "gemini-3-flash-preview",
      "gemini-2.5-flash-lite",
    ]);
  });

  it("returns error when no API keys are configured", async () => {
    vi.mocked(loadPersistedOpenAiApiKey).mockResolvedValue("");
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toContain("No AI provider configured");
    expect(result.rawJson).toBeNull();
  });
});
