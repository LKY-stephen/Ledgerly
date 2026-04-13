import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./parse-origin-data";

const originalFetch = global.fetch;

describe("POST /api/parse-origin-data", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("parses multipart uploads into the validated parser DTO", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
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
            model: "gpt-5",
            parser: "openai_gpt",
            rawSummary: "Apple Store receipt",
            rawText: "Apple Store 04/01/2026 $52.99",
            warnings: [],
          }),
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      ),
    );
    global.fetch = fetchMock as typeof global.fetch;

    const formData = new FormData();
    formData.append("filename", "receipt.jpg");
    formData.append("mimeType", "image/jpeg");
    formData.append("sourcePlatform", "ios");
    formData.append("file", new File(["image-bytes"], "receipt.jpg", { type: "image/jpeg" }));

    const request = new Request("http://localhost/api/parse-origin-data", {
      body: formData,
      headers: {
        Authorization: "Bearer sk-test",
      },
      method: "POST",
    });

    const response = await POST(request as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
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
      model: "gpt-5",
      parser: "openai_gpt",
      rawSummary: "Apple Store receipt",
      rawText: "Apple Store 04/01/2026 $52.99",
      warnings: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const providerRequest = JSON.parse(String(init?.body));
    expect(providerRequest.input[1].content[1]).toMatchObject({
      detail: "high",
      type: "input_image",
    });
    expect(providerRequest.input[1].content[1].image_url).toContain("data:image/jpeg;base64,");
  });

  it("surfaces OpenAI authentication failures as controlled JSON", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: "Incorrect API key provided.",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        },
      ),
    );

    const formData = new FormData();
    formData.append("filename", "receipt.jpg");
    formData.append("mimeType", "image/jpeg");
    formData.append("sourcePlatform", "ios");
    formData.append("file", new File(["image-bytes"], "receipt.jpg", { type: "image/jpeg" }));

    const request = new Request("http://localhost/api/parse-origin-data", {
      body: formData,
      headers: {
        Authorization: "Bearer sk-invalid",
      },
      method: "POST",
    });

    const response = await POST(request as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: {
        code: "invalid_openai_key",
        message: "Incorrect API key provided.",
      },
    });
  });
});
