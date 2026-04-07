import { describe, expect, it } from "vitest";

import { getAppCopy } from "../src/features/app-shell/copy";
import { createGuestSession } from "../src/features/app-shell/model";
import { buildHomeSections } from "../src/features/home/sections";

describe("home sections", () => {
  it("summarizes the local-first architecture for a guest session", () => {
    const sections = buildHomeSections(getAppCopy("en"), createGuestSession());

    expect(sections.modules).toHaveLength(5);
    expect(sections.heroMetrics).toHaveLength(3);
    expect(sections.heroMetrics[0]).toMatchObject({
      icon: "modules",
      label: "Modules",
      value: "5",
    });
    expect(sections.storageCards).toHaveLength(4);
    expect(sections.storageCards[0]).toMatchObject({
      icon: "bootstrap",
      label: "Storage contract pulse",
      value: "15",
    });
    expect(sections.storageCards[1]).toMatchObject({
      icon: "workflow",
      label: "Derived views",
      value: "0",
    });
    expect(sections.storageCards[3]).toMatchObject({
      icon: "device",
      label: "Device state",
      value: "7",
    });
    expect(sections.storageCollections.map((collection) => collection.slug)).toContain(
      "evidence-objects",
    );
    expect(sections.sessionTitle).toBe("Exploring in guest mode");
  });
});
