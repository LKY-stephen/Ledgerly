import type { SurfaceTokens } from "@ledgerly/ui";
import type { CardId, StickmanMood } from "./game-context";

export const gameHomeButtonLabel = "HOME";
export const gameSettingsCardLabel = "SETTINGS";
export const maxStickmanEnergyPlays = 7;

export type GameCardVariant = "black" | "white" | "flash";
export type CharacterType = "stickman" | "cat";
export type StickmanSceneAnchorId =
  | "cat"
  | "discard"
  | "lane:left"
  | "lane:right"
  | "panel:left"
  | "panel:right"
  | `dock:${CardId}`;

export interface CharacterMotionProfile {
  rangeX: number;
  lift: number;
  tilt: number;
  duration: number;
  reactionJump: number;
  reactionTwist: number;
}

export function getNextQuickTheme(currentTheme: "light" | "dark"): "light" | "dark" {
  return currentTheme === "dark" ? "light" : "dark";
}

export function getGameCardColors(variant: GameCardVariant, palette: SurfaceTokens) {
  switch (variant) {
    case "black":
      return { bg: palette.ink, text: palette.paper };
    case "white":
      return { bg: palette.paper, text: palette.ink };
    case "flash":
      return {
        bg: palette.accent,
        text: palette.name === "dark" ? "#000000" : palette.ink,
      };
  }
}

export function getDockCardScale(input: {
  isActive: boolean;
  pressed: boolean;
}): number {
  const { isActive, pressed } = input;

  if (pressed && isActive) {
    return 0.88;
  }

  if (pressed) {
    return 0.94;
  }

  if (isActive) {
    return 0.9;
  }

  return 1;
}

export function getStickmanEnergy(cardsPlayedThisSession: number): number {
  if (cardsPlayedThisSession <= 0) {
    return 0;
  }

  return Math.min(cardsPlayedThisSession / maxStickmanEnergyPlays, 1);
}

export function getCharacterMotionProfile(input: {
  character: CharacterType;
  energy: number;
  isPanelOpen: boolean;
}): CharacterMotionProfile {
  const { character, isPanelOpen } = input;
  const energy = Math.max(0, Math.min(input.energy, 1));
  const damp = isPanelOpen ? 0.45 : 1;

  if (character === "stickman") {
    return {
      rangeX: (10 + energy * 18) * damp,
      lift: (4 + energy * 7) * damp,
      tilt: (2.5 + energy * 3) * damp,
      duration: Math.round(4400 - energy * 1400 + (isPanelOpen ? 900 : 0)),
      reactionJump: 14 + energy * 12,
      reactionTwist: 7 + energy * 4,
    };
  }

  return {
    rangeX: (6 + energy * 8) * damp,
    lift: (3 + energy * 4) * damp,
    tilt: (2 + energy * 2.5) * damp,
    duration: Math.round(5600 - energy * 900 + (isPanelOpen ? 700 : 0)),
    reactionJump: 9 + energy * 6,
    reactionTwist: 5 + energy * 3,
  };
}

export function getStickmanTouchReaction(input: {
  energy: number;
  touchCount: number;
}): { mood: StickmanMood; speech: string } {
  const { energy, touchCount } = input;
  const phase = touchCount % 3;

  if (energy >= 0.67) {
    return {
      mood: phase === 1 ? "got_it" : "spike_prep",
      speech: ["AMPED!", "AGAIN!", "DEAL ME IN!"][phase],
    };
  }

  if (energy >= 0.34) {
    return {
      mood: phase === 2 ? "think" : "got_it",
      speech: ["HEY!", "READY?", "LET'S GO!"][phase],
    };
  }

  return {
    mood: phase === 1 ? "think" : "idle",
    speech: ["HI.", "OH?", "OKAY."][phase],
  };
}

export function getStickmanNearbyCardId(
  anchorId: StickmanSceneAnchorId | null,
): CardId | null {
  if (!anchorId?.startsWith("dock:")) {
    return null;
  }

  return anchorId.slice(5) as CardId;
}
