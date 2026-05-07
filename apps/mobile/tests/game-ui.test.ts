import { describe, expect, it } from "vitest";

import {
  gameHomeButtonLabel,
  getCharacterMotionProfile,
  getDockCardScale,
  getStickmanEnergy,
  getStickmanNearbyCardId,
  getStickmanTouchReaction,
} from "../src/features/game/game-ui";

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

  it("scales stickman energy from the current session card-play count", () => {
    expect(getStickmanEnergy(0)).toBe(0);
    expect(getStickmanEnergy(4)).toBeCloseTo(4 / 7);
    expect(getStickmanEnergy(20)).toBe(1);
  });

  it("increases motion intensity when the stickman is energized and the panel is closed", () => {
    const calm = getCharacterMotionProfile({
      character: "stickman",
      energy: 0,
      isPanelOpen: true,
    });
    const charged = getCharacterMotionProfile({
      character: "stickman",
      energy: 1,
      isPanelOpen: false,
    });

    expect(charged.rangeX).toBeGreaterThan(calm.rangeX);
    expect(charged.reactionJump).toBeGreaterThan(calm.reactionJump);
    expect(charged.duration).toBeLessThan(calm.duration);
  });

  it("picks a more energetic touch reaction as the stickman energy rises", () => {
    expect(getStickmanTouchReaction({ energy: 0.1, touchCount: 1 })).toMatchObject({
      mood: "think",
    });
    expect(getStickmanTouchReaction({ energy: 0.9, touchCount: 2 })).toMatchObject({
      mood: "spike_prep",
    });
  });

  it("maps roaming dock anchors back to the matching card id", () => {
    expect(getStickmanNearbyCardId("dock:show")).toBe("show");
    expect(getStickmanNearbyCardId("discard")).toBeNull();
  });
});
