import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./parse-evidence";

const originalFetch = global.fetch;

describe("POST /api/parse-evidence compatibility route", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("keeps the legacy route returning the validated parser DTO", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            candidates: {
              amountCents: 124500,
              category: "income",
              date: "2026-03-31",
              description: "Platform payout",
              notes: null,
              source: "YouTube",
              target: "Business checking",
              taxCategory: null,
            },
            fields: {
              amountCents: 124500,
              category: "income",
              date: "2026-03-31",
              description: "Platform payout",
              notes: null,
              source: "YouTube",
              target: "Business checking",
              taxCategory: null,
            },
            model: "gpt-5",
            parser: "openai_gpt",
            rawSummary: "Monthly platform payout PDF.",
            rawText: "March payout statement",
            records: [
              {
                candidates: {
                  amountCents: 124500,
                  category: "income",
                  date: "2026-03-31",
                  description: "Platform payout",
                  notes: null,
                  source: "YouTube",
                  target: "Business checking",
                  taxCategory: null,
                },
                fields: {
                  amountCents: 124500,
                  category: "income",
                  date: "2026-03-31",
                  description: "Platform payout",
                  notes: null,
                  source: "YouTube",
                  target: "Business checking",
                  taxCategory: null,
                },
              },
            ],
            warnings: ["Target inferred from payout language."],
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
    formData.append("filename", "statement.pdf");
    formData.append("mimeType", "application/pdf");
    formData.append("sourcePlatform", "web");
    formData.append("file", new File(["pdf-bytes"], "statement.pdf", { type: "application/pdf" }));

    const request = new Request("http://localhost/api/parse-evidence", {
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
        amountCents: 124500,
        category: "income",
        date: "2026-03-31",
        description: "Platform payout",
        notes: null,
        source: "YouTube",
        target: "Business checking",
        taxCategory: null,
      },
      fields: {
        amountCents: 124500,
        category: "income",
        date: "2026-03-31",
        description: "Platform payout",
        notes: null,
        source: "YouTube",
        target: "Business checking",
        taxCategory: null,
      },
      model: "gpt-5",
      parser: "openai_gpt",
      rawSummary: "Monthly platform payout PDF.",
      rawText: "March payout statement",
      records: [
        {
          candidates: {
            amountCents: 124500,
            category: "income",
            date: "2026-03-31",
            description: "Platform payout",
            notes: null,
            source: "YouTube",
            target: "Business checking",
            taxCategory: null,
          },
          fields: {
            amountCents: 124500,
            category: "income",
            date: "2026-03-31",
            description: "Platform payout",
            notes: null,
            source: "YouTube",
            target: "Business checking",
            taxCategory: null,
          },
        },
      ],
      warnings: ["Target inferred from payout language."],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const providerRequest = JSON.parse(String(init?.body));
    expect(providerRequest.input[1].content[1]).toMatchObject({
      filename: "statement.pdf",
      type: "input_file",
    });
    expect(providerRequest.input[1].content[1].file_data).toContain("data:application/pdf;base64,");
  });
});
