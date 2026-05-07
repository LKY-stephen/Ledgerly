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
  loadPersistedGeminiApiKey,
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
  vi.mocked(loadPersistedGeminiApiKey).mockResolvedValue("");
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
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-key-123");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");

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

  it("uses the current app-shell provider config for image parsing when env keys are absent", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    vi.mocked(loadPersistedOpenAiApiKey).mockResolvedValue("");

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer ui-openai-key",
      });

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify(
            createParsePayload({
              model: null,
              rawSummary: "UI config image parse",
              rawText: "UI-provided key parse",
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
    }, {
      aiProvider: "openai",
      geminiApiKey: "",
      geminiAuthMode: "api_key",
      inferApiKey: "",
      inferBaseUrl: "",
      inferModel: "",
      openAiApiKey: "ui-openai-key",
    });

    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-4o");
    expect(result.rawText).toBe("UI-provided key parse");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefers a valid runtime Infer config over a stale persisted openai provider selection", async () => {
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("openai");
    vi.mocked(loadPersistedOpenAiApiKey).mockResolvedValue("");

    let capturedUrl = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe("gpt-4o");

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify(
              createParsePayload({
                model: null,
                rawSummary: "Infer runtime fallback parse",
                rawText: "Infer runtime-selected parse",
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

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["image-bytes"], { type: "image/jpeg" }),
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    }, {
      aiProvider: "openai",
      geminiApiKey: "",
      geminiAuthMode: "api_key",
      inferApiKey: "ui-infer-key",
      inferBaseUrl: "https://infer.example/v1",
      inferModel: "gpt-4o",
      openAiApiKey: "",
    });

    expect(capturedUrl).toContain("https://infer.example/v1");
    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-4o");
    expect(result.rawText).toBe("Infer runtime-selected parse");
  });

  it("uses the current app-shell Gemini config for image parsing when env keys are absent", async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    vi.mocked(loadPersistedGeminiApiKey).mockResolvedValue("");

    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("key=ui-gemini-key");

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      createParsePayload({
                        model: null,
                        rawSummary: "Gemini UI config image parse",
                        rawText: "Gemini UI-provided key parse",
                      }),
                    ),
                  },
                ],
              },
            },
          ],
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
    }, {
      aiProvider: "gemini",
      geminiApiKey: "ui-gemini-key",
      geminiAuthMode: "api_key",
      inferApiKey: "",
      inferBaseUrl: "",
      inferModel: "",
      openAiApiKey: "",
    });

    expect(result.error).toBeNull();
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.parserKind).toBe("gemini");
    expect(result.rawText).toBe("Gemini UI-provided key parse");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the configured Infer provider for image parsing even when an OpenAI key is also available", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-test-key");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");
    vi.mocked(loadPersistedInferModel).mockResolvedValue("gpt-4o");

    let capturedUrl = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        const body = JSON.parse(String(init?.body));

        expect(body.model).toBe("gpt-4o");

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify(
              createParsePayload({
                model: null,
                rawText: "Infer-selected image parse",
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

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["image-bytes"], { type: "image/jpeg" }),
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(capturedUrl).toContain("https://infer.example/v1");
    expect(result.error).toBeNull();
    expect(result.model).toBe("gpt-4o");
  });

  it("uses the configured Gemini provider for image parsing when Gemini is selected", async () => {
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("gemini");
    vi.mocked(loadPersistedGeminiApiKey).mockResolvedValue("gemini-test-key");

    let capturedUrl = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        const body = JSON.parse(String(init?.body));

        expect(body.systemInstruction.parts[0].text).toContain("# receipt-parse");
        expect(body.contents[0].parts[0].text).toContain("filename: receipt.jpg");

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify(
                        createParsePayload({
                          model: null,
                          rawSummary: "Gemini receipt photo",
                          rawText: "Gemini image parse raw text",
                        }),
                      ),
                    },
                  ],
                },
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      }),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["image-bytes"], { type: "image/jpeg" }),
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(capturedUrl).toContain(":generateContent");
    expect(result.error).toBeNull();
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.parserKind).toBe("gemini");
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
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-test-key");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");
    vi.mocked(loadPersistedInferModel).mockResolvedValue("gpt-4o");

    let requestedModel = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        requestedModel = JSON.parse(String(init?.body)).model;

        return new Response("<html>bad gateway</html>", {
          headers: { "content-type": "text/html" },
          status: 502,
        });
      }),
    );

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(requestedModel).toBe("gpt-4o");
    expect(result.error).toContain("Infer returned a non-JSON response");
    expect(result.rawJson).toBeNull();
  });

  it("uses the Infer provider label when the response JSON does not match the parser DTO", async () => {
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-test-key");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");
    vi.mocked(loadPersistedInferModel).mockResolvedValue("gpt-4o");

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
      "Infer parser output must include parser, model, rawText, rawSummary, warnings, and at least one record with fields and candidates.",
    );
    expect(result.rawJson).toBeNull();
  });

  it("defaults Infer parse requests to gemini-2.5-flash when no explicit Infer model is configured", async () => {
    vi.mocked(loadPersistedAiProvider).mockResolvedValue("infer");
    vi.mocked(loadPersistedInferApiKey).mockResolvedValue("infer-test-key");
    vi.mocked(loadPersistedInferBaseUrl).mockResolvedValue("https://infer.example/v1");
    vi.mocked(loadPersistedInferModel).mockResolvedValue("");

    let requestedModel = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        requestedModel = JSON.parse(String(init?.body)).model;

        return new Response(
          JSON.stringify({
            output_text: JSON.stringify(
              createParsePayload({
                model: null,
                rawText: "Infer default model raw text",
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

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(requestedModel).toBe("gemini-2.5-flash");
    expect(result.error).toBeNull();
    expect(result.model).toBe("gemini-2.5-flash");
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

  it("returns the selected provider error when no API keys are configured", async () => {
    vi.mocked(loadPersistedOpenAiApiKey).mockResolvedValue("");
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toContain("Missing OpenAI API key");
    expect(result.rawJson).toBeNull();
  });
});
