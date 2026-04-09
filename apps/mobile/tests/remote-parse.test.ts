import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/app-shell/storage", () => ({
  loadPersistedAiProvider: vi.fn(async () => "openai"),
  loadPersistedGeminiApiKey: vi.fn(async () => ""),
  loadPersistedOpenAiApiKey: vi.fn(async () => ""),
}));

import {
  parseFileWithOpenAiFromBlob,
} from "../src/features/ledger/remote-parse";

const originalBaseUrl = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const originalModel = process.env.EXPO_PUBLIC_OPENAI_MODEL;
const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

afterEach(() => {
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL = originalBaseUrl;
  process.env.EXPO_PUBLIC_OPENAI_MODEL = originalModel;
  process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("remote parse client", () => {
  it("calls OpenAI and returns parsed JSON", async () => {
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1/";
    process.env.EXPO_PUBLIC_OPENAI_MODEL = "gpt-4o";
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-test";

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.openai.com/v1/responses");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer sk-test",
        "Content-Type": "application/json",
      });

      const payload = JSON.parse(String(init?.body));
      expect(payload.model).toBe("gpt-4o");
      expect(payload.store).toBe(false);

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            amountCents: 5299,
            date: "2026-04-01",
            description: "Apple Store",
            source: "Business card",
            target: "Apple Store",
          }),
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
    expect(result.model).toBe("gpt-4o");
    expect(result.rawJson).toMatchObject({
      amountCents: 5299,
      description: "Apple Store",
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

  it("returns error when API key is missing", async () => {
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    process.env.EXPO_PUBLIC_OPENAI_BASE_URL = "https://api.openai.com/v1";

    const result = await parseFileWithOpenAiFromBlob({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    expect(result.error).toContain("Missing OpenAI API key");
    expect(result.rawJson).toBeNull();
  });
});
