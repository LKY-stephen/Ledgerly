import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  alanBlueFrameInventory,
  alanBlueSpriteSequences,
  alanBlueSpriteSource,
} from "../src/features/game/stickman/alan-blue-sprite-manifest.generated";
import {
  getAlanActionForAnchor,
  getAlanActionForGamePhase,
  getAlanMotionTiming,
} from "../src/features/game/stickman/alan-stickman-actions";
import { resolveAlanBlueSourceDir } from "./alan-stickman-test-paths";

describe("Alan Blue stickman sprite manifest", () => {
  it("maps all 177 source PNG frames exactly once in the unique inventory", () => {
    const sourceFiles = readdirSync(resolveAlanBlueSourceDir())
      .filter((filename) => filename.endsWith(".png"))
      .sort();
    const inventorySources = alanBlueFrameInventory
      .map((frame) => frame.source)
      .sort();

    expect(sourceFiles).toHaveLength(177);
    expect(inventorySources).toHaveLength(177);
    expect(new Set(inventorySources).size).toBe(177);
    expect(inventorySources).toEqual(sourceFiles);
    expect(alanBlueSpriteSource.totalSourceFrames).toBe(177);
  });

  it("preserves the requested Alan action frame counts and reserved run terminal", () => {
    expect(alanBlueSpriteSequences.stand.frameCount).toBe(1);
    expect(alanBlueSpriteSequences.walkFloor.frameCount).toBe(6);
    expect(alanBlueSpriteSequences.runFloor.frameCount).toBe(11);
    expect(alanBlueSpriteSequences.runFloorTerminal.frames[0]?.source).toBe(
      "run12.png",
    );
    expect(alanBlueSpriteSequences.celebrateDance.frameCount).toBe(89);
  });
});

describe("Alan stickman action selection", () => {
  it("selects idle and proximity actions from the current game anchor", () => {
    expect(
      getAlanActionForAnchor({
        activeAnchorId: null,
        energy: 0,
        isWalking: false,
      }),
    ).toBe("stand");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "dock:report",
        energy: 0.2,
        isWalking: false,
      }),
    ).toBe("look");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "panel:left",
        energy: 0.2,
        isWalking: false,
      }),
    ).toBe("holdWall");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "panel:right:middle",
        energy: 0.2,
        isWalking: false,
      }),
    ).toBe("holdWall");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "discard",
        energy: 0.2,
        isWalking: false,
      }),
    ).toBe("sit");
  });

  it("uses walk/run movement actions without changing the existing roam transform", () => {
    expect(
      getAlanActionForAnchor({
        activeAnchorId: null,
        energy: 0.2,
        isWalking: true,
      }),
    ).toBe("walkFloor");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: null,
        energy: 0.9,
        isWalking: true,
      }),
    ).toBe("runFloor");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "panel:right:top",
        energy: 0.9,
        isWalking: true,
      }),
    ).toBe("climbWall");
  });

  it("uses quieter static-friendly choices when reduced motion is enabled", () => {
    expect(
      getAlanActionForAnchor({
        activeAnchorId: null,
        energy: 0.9,
        isReducedMotionEnabled: true,
        isWalking: true,
      }),
    ).toBe("walkFloor");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "panel:right",
        energy: 0.4,
        isReducedMotionEnabled: true,
        isWalking: false,
      }),
    ).toBe("holdWall");
    expect(
      getAlanActionForAnchor({
        activeAnchorId: "panel:right:bottom",
        energy: 0.9,
        isReducedMotionEnabled: true,
        isWalking: true,
      }),
    ).toBe("holdWall");
  });

  it("lets direct interactions and game phases override anchor idle actions", () => {
    expect(
      getAlanActionForGamePhase({
        animationPhase: "idle",
        isNudging: true,
        stickmanMood: "idle",
      }),
    ).toBe("nudge");
    expect(
      getAlanActionForGamePhase({
        animationPhase: "dragging",
        stickmanMood: "idle",
      }),
    ).toBe("dragged");
    expect(
      getAlanActionForGamePhase({
        animationPhase: "spikeThrow",
        stickmanMood: "spike_air",
      }),
    ).toBe("falling");
    expect(
      getAlanActionForGamePhase({
        animationPhase: "spikeThrow",
        isRecoveringFromFloor: true,
        stickmanMood: "got_it",
      }),
    ).toBe("recoverFromFloor");
    expect(
      getAlanActionForGamePhase({
        animationPhase: "pocketShrink",
        stickmanMood: "pocket",
      }),
    ).toBe("recoverFromFloor");
  });
});

describe("Alan stickman motion timing", () => {
  it("scales Alan velocity to the displayed sprite height", () => {
    const timing = getAlanMotionTiming("walkFloor", {
      energy: 0,
      spriteHeight: 64,
    });

    expect(timing.velocityX).toBe(-4);
    expect(timing.scaledVelocityX).toBe(-2);
    expect(timing.shouldAnimate).toBe(true);
  });

  it("turns continuous frame motion off for reduced-motion users", () => {
    const timing = getAlanMotionTiming("celebrateDance", {
      isReducedMotionEnabled: true,
      spriteHeight: 128,
    });

    expect(timing.shouldAnimate).toBe(false);
    expect(timing.frameIntervalMs).toBe(0);
    expect(timing.reducedMotionFrame).toBe(0);
  });
});
