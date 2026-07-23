import { describe, expect, it } from "vitest";

import {
  gameHomeButtonLabel,
  getCenterPanelLayout,
  getCenterPanelHeaderTextColor,
  getCharacterMotionProfile,
  getDockCardNearbyTransform,
  getDockCardScale,
  getGameCardPresentation,
  getStickmanEnergy,
  getStickmanNearbyCardId,
  getStickmanPanelEdgeLayout,
  getStickmanTouchReaction,
  isStickmanPanelAnchor,
} from "../src/features/game/game-ui";
import { surfaceThemes } from "../../../packages/ui/src/tokens";

describe("game UI helpers", () => {
  it("shrinks an active card after it is selected", () => {
    expect(getDockCardScale({ isActive: false, pressed: false })).toBe(1);
    expect(getDockCardScale({ isActive: true, pressed: false })).toBe(0.9);
  });

  it("shrinks a pressed card even before it becomes active", () => {
    expect(getDockCardScale({ isActive: false, pressed: true })).toBe(0.94);
    expect(getDockCardScale({ isActive: true, pressed: true })).toBe(0.88);
  });

  it("uses the scene nudge scale for a nearby dock card", () => {
    expect(
      getDockCardScale({
        isActive: false,
        isNearby: true,
        palette: surfaceThemes.light,
        pressed: false,
      }),
    ).toBe(surfaceThemes.light.motion.nearbyScale);
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

  it("identifies every panel-edge anchor as a panel proximity anchor", () => {
    expect(isStickmanPanelAnchor("panel:left")).toBe(true);
    expect(isStickmanPanelAnchor("panel:right")).toBe(true);
    expect(isStickmanPanelAnchor("panel:right:top")).toBe(true);
    expect(isStickmanPanelAnchor("panel:right:middle")).toBe(true);
    expect(isStickmanPanelAnchor("panel:right:bottom")).toBe(true);
    expect(isStickmanPanelAnchor("discard")).toBe(false);
  });

  it("derives the opened center-panel geometry from the shared scene layout", () => {
    const layout = getCenterPanelLayout({
      dockHeight: 180,
      safeAreaBottom: 20,
      viewportHeight: 844,
      viewportWidth: 390,
    });

    expect(layout).toMatchObject({
      groundY: 628,
      height: 500,
      left: 54,
      right: 16,
      top: 118,
      width: 320,
    });
  });

  it("uses theme ink for center-panel chrome text in dark mode", () => {
    expect(getCenterPanelHeaderTextColor(surfaceThemes.dark)).toBe(
      surfaceThemes.dark.ink,
    );
    expect(getCenterPanelHeaderTextColor(surfaceThemes.dark)).not.toBe(
      surfaceThemes.dark.inkOnAcid,
    );
  });

  it("places panel climb anchors against the measured rendered panel border", () => {
    const layout = getStickmanPanelEdgeLayout({
      panelFrame: {
        height: 400,
        width: 360,
        x: 200,
        y: 88,
      },
      speechBubbleHeight: 64,
      stickmanHeight: 140,
      stickmanWidth: 120,
      viewportWidth: 700,
    });

    expect(layout.baseTop).toBe(88);
    expect(layout.anchors.map((anchor) => anchor.id)).toEqual([
      "panel:right:bottom",
      "panel:right:middle",
      "panel:right:top",
    ]);
    expect(layout.anchors.every((anchor) => anchor.x === 448)).toBe(true);
    expect(layout.anchors[0]?.y).toBeCloseTo(178);
    expect(layout.anchors[1]?.y).toBeCloseTo(112);
    expect(layout.anchors[2]?.y).toBeCloseTo(32);
  });

  it("updates panel climb anchors when the measured panel frame moves", () => {
    const common = {
      speechBubbleHeight: 0,
      stickmanHeight: 120,
      stickmanWidth: 124,
      viewportWidth: 500,
    };
    const first = getStickmanPanelEdgeLayout({
      ...common,
      panelFrame: {
        height: 300,
        width: 320,
        x: 40,
        y: 72,
      },
    });
    const moved = getStickmanPanelEdgeLayout({
      ...common,
      panelFrame: {
        height: 300,
        width: 320,
        x: 96,
        y: 110,
      },
    });

    expect(first.baseTop).toBe(72);
    expect(moved.baseTop).toBe(110);
    expect(first.anchors[0]?.x).toBe(244);
    expect(moved.anchors[0]?.x).toBe(300);
  });

  it("exposes semantic card presentation for the request card", () => {
    expect(getGameCardPresentation("show")).toMatchObject({
      label: "REQUEST",
      variant: "paper",
    });
  });

  it("keeps the report card copy aligned with the ledger report surface", () => {
    expect(getGameCardPresentation("report")).toMatchObject({
      label: "VIEW",
      sublabel: "REPORT",
      footer: "LOCAL LEDGER REPORT",
    });
  });

  it("tilts nearby cards using the shared motion grammar", () => {
    expect(
      getDockCardNearbyTransform({
        cardId: "show",
        isNearby: true,
        palette: surfaceThemes.light,
      }),
    ).toMatchObject({
      rotate: `${surfaceThemes.light.motion.nearbyRotateDeg}deg`,
      translateY: surfaceThemes.light.motion.nearbyLift,
    });
  });
});
