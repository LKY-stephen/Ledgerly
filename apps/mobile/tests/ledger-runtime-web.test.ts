import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-document-picker", () => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: vi.fn(),
}));

import * as ImagePicker from "expo-image-picker";

import {
  parseFile,
  pickPhotoUploadCandidates,
  resetLedgerWebRuntimeStateForTests,
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
              amountCents: 5299,
              date: "2026-04-02",
              description: "Apple accessories",
              source: "Business card",
              target: "Apple Store",
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
      amountCents: 5299,
      description: "Apple accessories",
    });
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
});
