import { describe, expect, it } from "vitest";

import { buildHomeSections } from "../src/features/home/sections";

describe("home sections", () => {
  it("summarizes the local-first architecture", () => {
    const sections = buildHomeSections();

    expect(sections.modules).toHaveLength(5);
    expect(sections.storageCards[0]?.title).toBe("Structured Store");
    expect(sections.storageCollections.map((collection) => collection.slug)).toContain("receipts");
  });
});
