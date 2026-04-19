import { describe, expect, it } from "vitest";

import { GET } from "./health";

describe("GET /api/health", () => {
  it("returns the current service contract", async () => {
    const response = await GET();
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      model: expect.any(String),
      parser: "openai_gpt",
      requiresUserApiKey: true,
      service: "ledgerly-parse-api",
      status: "ok",
      version: 1,
    });
  });
});
