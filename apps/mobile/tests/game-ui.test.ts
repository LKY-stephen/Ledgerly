import { describe, expect, it } from "vitest";

import { gameHomeButtonLabel, getDockCardScale } from "../src/features/game/game-ui";

describe("game UI helpers", () => {
  it("shrinks an active card after it is selected", () => {
    expect(getDockCardScale({ isActive: false, pressed: false })).toBe(1);
    expect(getDockCardScale({ isActive: true, pressed: false })).toBe(0.9);
  });

  it("shrinks a pressed card even before it becomes active", () => {
    expect(getDockCardScale({ isActive: false, pressed: true })).toBe(0.94);
    expect(getDockCardScale({ isActive: true, pressed: true })).toBe(0.88);
  });

  it("uses a dedicated home label for the return control", () => {
    expect(gameHomeButtonLabel).toBe("HOME");
  });
});
