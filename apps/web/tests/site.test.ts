import { describe, expect, it } from "vitest";
import { moduleCount, platformCount } from "../src/lib/platforms";
import { siteMetadata } from "../src/lib/site";

describe("site metadata", () => {
  it("keeps the product positioning visible", () => {
    expect(siteMetadata.headline).toContain("Finance control");
    expect(siteMetadata.guardrails).toHaveLength(3);
  });

  it("reflects the shared package counts", () => {
    expect(moduleCount).toBeGreaterThanOrEqual(5);
    expect(platformCount).toBeGreaterThanOrEqual(6);
  });
});
