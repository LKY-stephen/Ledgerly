import type { SurfaceTokens } from "@ledgerly/ui";
import type { CardId, StickmanMood } from "./game-context";

export const gameHomeButtonLabel = "HOME";
export const gameSettingsCardLabel = "SETTINGS";
export const maxStickmanEnergyPlays = 7;

export type GameCardVariant = "acid" | "hot" | "paper" | "system";
export type CharacterType = "stickman" | "cat";
export type StickmanSceneAnchorId =
  | "cat"
  | "discard"
  | "lane:left"
  | "lane:right"
  | "panel:left"
  | "panel:right"
  | "panel:right:top"
  | "panel:right:middle"
  | "panel:right:bottom"
  | `dock:${CardId}`;

export interface CenterPanelLayoutInput {
  dockHeight: number;
  safeAreaBottom: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface CenterPanelLayout {
  groundY: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface SceneRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface StickmanPanelEdgeAnchor {
  facing: "left";
  id: "panel:right:top" | "panel:right:middle" | "panel:right:bottom";
  pauseMs: number;
  weight: number;
  x: number;
  y: number;
}

export interface StickmanPanelEdgeLayout {
  anchors: StickmanPanelEdgeAnchor[];
  baseTop: number;
}

export interface CharacterMotionProfile {
  rangeX: number;
  lift: number;
  tilt: number;
  duration: number;
  reactionJump: number;
  reactionTwist: number;
}

export interface GameCardColors {
  bg: string;
  border: string;
  pipBg: string;
  pipText: string;
  text: string;
}

export interface GameCardPresentation {
  suit: string;
  label: string;
  sublabel: string;
  footer: string;
  variant: GameCardVariant;
}

const cardPresentation: Record<CardId, GameCardPresentation> = {
  new: {
    suit: "♠",
    label: "UPLOAD",
    sublabel: "UPLOAD",
    footer: "BUSINESS FILE INTAKE",
    variant: "acid",
  },
  report: {
    suit: "♥",
    label: "VIEW",
    sublabel: "REPORT",
    footer: "LOCAL LEDGER REPORT",
    variant: "hot",
  },
  show: {
    suit: "♣",
    label: "REQUEST",
    sublabel: "REQUEST",
    footer: "PERSONAL LEDGER CHAT",
    variant: "paper",
  },
  settings: {
    suit: "♦",
    label: "OPEN",
    sublabel: "SETTINGS",
    footer: "THEME · PROFILE",
    variant: "system",
  },
};

export function getNextQuickTheme(currentTheme: "light" | "dark"): "light" | "dark" {
  return currentTheme === "dark" ? "light" : "dark";
}

export function getGameCardPresentation(cardId: CardId): GameCardPresentation {
  return cardPresentation[cardId];
}

export function getSuitColor(input: {
  cardId?: CardId;
  suit?: GameCardPresentation["suit"];
  palette: SurfaceTokens;
}): string {
  const suit =
    input.suit ??
    (input.cardId ? cardPresentation[input.cardId].suit : "♠");

  switch (suit) {
    case "♦":
      return input.palette.suits.diamond;
    case "♥":
      return input.palette.suits.heart;
    case "♣":
      return input.palette.suits.club;
    case "♠":
    default:
      return input.palette.suits.spade;
  }
}

export function getGameCardColors(variant: GameCardVariant, palette: SurfaceTokens): GameCardColors {
  switch (variant) {
    case "acid":
      return {
        bg: palette.acid,
        border: palette.ink,
        pipBg: palette.ink,
        pipText: palette.inkOnAcid,
        text: palette.inkOnAcid,
      };
    case "hot":
      return {
        bg: palette.hot,
        border: palette.ink,
        pipBg: palette.ink,
        pipText: palette.inkOnHot,
        text: palette.inkOnHot,
      };
    case "system":
      return {
        bg: palette.system,
        border: palette.ink,
        pipBg: palette.paper,
        pipText: palette.system,
        text: palette.inkOnPlum,
      };
    case "paper":
    default:
      return {
        bg: palette.paper,
        border: palette.ink,
        pipBg: palette.ink,
        pipText: palette.paper,
        text: palette.ink,
      };
  }
}

export function getCenterPanelHeaderTextColor(palette: SurfaceTokens): string {
  return palette.ink;
}

export function getDiscardFace(cardId: CardId, palette: SurfaceTokens): { bg: string; text: string } {
  const presentation = getGameCardPresentation(cardId);
  const colors = getGameCardColors(presentation.variant, palette);
  return {
    bg: colors.bg,
    text: colors.text,
  };
}

export function getDockCardScale(input: {
  isActive: boolean;
  isNearby?: boolean;
  pressed: boolean;
  palette?: SurfaceTokens;
}): number {
  const { isActive, isNearby = false, pressed, palette } = input;

  if (pressed && isActive) {
    return 0.88;
  }

  if (pressed) {
    return 0.94;
  }

  if (isActive) {
    return 0.9;
  }

  if (isNearby) {
    return palette?.motion.nearbyScale ?? 1.04;
  }

  return 1;
}

export function getDockCardNearbyTransform(input: {
  cardId: CardId;
  isNearby: boolean;
  palette: SurfaceTokens;
}): { rotate: string; translateY: number } {
  if (!input.isNearby) {
    return { rotate: "0deg", translateY: 0 };
  }

  const rotate =
    input.cardId === "show"
      ? `${input.palette.motion.nearbyRotateDeg}deg`
      : `${-input.palette.motion.nearbyRotateDeg}deg`;

  return {
    rotate,
    translateY: input.palette.motion.nearbyLift,
  };
}

export function getStickmanEnergy(cardsPlayedThisSession: number): number {
  if (cardsPlayedThisSession <= 0) {
    return 0;
  }

  return Math.min(cardsPlayedThisSession / maxStickmanEnergyPlays, 1);
}

export function getCenterPanelLayout({
  dockHeight,
  safeAreaBottom,
  viewportHeight,
  viewportWidth,
}: CenterPanelLayoutInput): CenterPanelLayout {
  const groundY = viewportHeight - dockHeight - safeAreaBottom - 16;
  const width = Math.max(
    Math.min(Math.round(viewportWidth * 0.664), viewportWidth - 28),
    320,
  );
  const desiredHeight = Math.round(viewportHeight * 0.593);
  const maxHeightAboveHorizon = Math.max(groundY - 10 - 48, 240);
  const height = Math.max(Math.min(desiredHeight, maxHeightAboveHorizon), 240);
  const top = Math.max(groundY - height - 10, 48);
  const right = 16;

  return {
    groundY,
    height,
    left: viewportWidth - right - width,
    right,
    top,
    width,
  };
}

export function getStickmanPanelEdgeLayout(input: {
  panelFrame: SceneRect;
  speechBubbleHeight: number;
  stickmanHeight: number;
  stickmanWidth: number;
  viewportWidth: number;
}): StickmanPanelEdgeLayout {
  const {
    panelFrame,
    speechBubbleHeight,
    stickmanHeight,
    stickmanWidth,
    viewportWidth,
  } = input;
  const clampLane = (value: number) =>
    Math.max(12, Math.min(viewportWidth - stickmanWidth - 12, value));
  const panelEdgeX = clampLane(
    panelFrame.x + panelFrame.width - stickmanWidth + 8,
  );
  const maxPanelClimbY = Math.max(
    0,
    panelFrame.height - stickmanHeight - speechBubbleHeight - 18,
  );
  const getPanelClimbY = (ratio: number) =>
    Math.min(maxPanelClimbY, Math.max(0, panelFrame.height * ratio));

  return {
    baseTop: panelFrame.y,
    anchors: [
      {
        facing: "left",
        id: "panel:right:bottom",
        pauseMs: 420,
        weight: 1.1,
        x: panelEdgeX,
        y: getPanelClimbY(0.48),
      },
      {
        facing: "left",
        id: "panel:right:middle",
        pauseMs: 640,
        weight: 1.35,
        x: panelEdgeX,
        y: getPanelClimbY(0.28),
      },
      {
        facing: "left",
        id: "panel:right:top",
        pauseMs: 560,
        weight: 1.15,
        x: panelEdgeX,
        y: getPanelClimbY(0.08),
      },
    ],
  };
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

export function isStickmanPanelAnchor(
  anchorId: StickmanSceneAnchorId | null,
): boolean {
  return anchorId?.startsWith("panel:") ?? false;
}
