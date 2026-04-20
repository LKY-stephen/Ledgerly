import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./map-evidence-scheme";

const originalFetch = global.fetch;

describe("POST /api/map-evidence-scheme", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("maps scheme keys while preserving the records template shape", async () => {
    const request = new Request("http://localhost/api/map-evidence-scheme", {
      body: JSON.stringify({
        originData: {
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
          records: [
            {
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
            },
          ],
          warnings: [],
        },
        scheme: {
          amount_cents: "",
          created_at: "",
          description: "",
          occurred_on: "",
          record_kind: "",
          source_label: "",
          target_label: "",
          tax_category_code: "",
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      scheme: {
        amount_cents: 5299,
        created_at: "",
        description: "Apple Store receipt",
        occurred_on: "2026-04-01",
        record_kind: "expense",
        source_label: "Business card",
        target_label: "Apple Store",
        tax_category_code: "office",
      },
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns controlled JSON when originData is missing", async () => {
    const request = new Request("http://localhost/api/map-evidence-scheme", {
      body: JSON.stringify({
        scheme: {
          amount_cents: "",
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: {
        code: "missing_originData",
        message: "originData is required.",
      },
    });
  });
});
