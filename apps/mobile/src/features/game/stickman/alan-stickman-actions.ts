import type { AnimationPhase, StickmanMood } from "../game-context";
import {
  isStickmanPanelAnchor,
  type StickmanSceneAnchorId,
} from "../game-ui";
import {
  alanBlueSpriteSequences,
  type StickmanMovementProfile,
  type StickmanSpriteActionId,
  type StickmanSpriteSequence,
} from "./alan-blue-sprite-manifest.generated";

export type {
  StickmanMovementProfile,
  StickmanSpriteActionId,
  StickmanSpriteFrame,
  StickmanSpriteSequence,
} from "./alan-blue-sprite-manifest.generated";

interface AlanActionForAnchorInput {
  activeAnchorId: StickmanSceneAnchorId | null;
  energy: number;
  isWalking: boolean;
  isReducedMotionEnabled?: boolean;
}

interface AlanActionForGamePhaseInput {
  animationPhase: AnimationPhase;
  isRecoveringFromFloor?: boolean;
  stickmanMood: StickmanMood;
  isNudging?: boolean;
  isReducedMotionEnabled?: boolean;
}

interface AlanMotionTimingInput {
  energy?: number;
  isReducedMotionEnabled?: boolean;
  spriteHeight?: number;
}

const runEnergyThreshold = 0.72;

export function getAlanActionForAnchor({
  activeAnchorId,
  energy,
  isWalking,
  isReducedMotionEnabled = false,
}: AlanActionForAnchorInput): StickmanSpriteActionId {
  if (isStickmanPanelAnchor(activeAnchorId)) {
    if (isWalking && !isReducedMotionEnabled) {
      return "climbWall";
    }

    return "holdWall";
  }

  if (isWalking) {
    return !isReducedMotionEnabled && energy >= runEnergyThreshold
      ? "runFloor"
      : "walkFloor";
  }

  if (!activeAnchorId) {
    return "stand";
  }

  if (activeAnchorId.startsWith("dock:")) {
    return "look";
  }

  switch (activeAnchorId) {
    case "discard":
      return "sit";
    case "cat":
    case "lane:left":
    case "lane:right":
    default:
      return "stand";
  }
}

export function getAlanActionForGamePhase({
  animationPhase,
  isRecoveringFromFloor = false,
  stickmanMood,
  isNudging = false,
}: AlanActionForGamePhaseInput): StickmanSpriteActionId | null {
  if (isNudging) {
    return "nudge";
  }

  if (isRecoveringFromFloor) {
    return "recoverFromFloor";
  }

  switch (animationPhase) {
    case "dragging":
      return "dragged";
    case "spikeThrow":
      return "falling";
    case "pocketShrink":
    case "pocketDone":
      return "recoverFromFloor";
    default:
      break;
  }

  if (stickmanMood === "spike_air" || stickmanMood === "spike_prep") {
    return "falling";
  }

  return null;
}

export function getAlanMotionTiming(
  actionId: StickmanSpriteActionId,
  {
    energy = 0,
    isReducedMotionEnabled = false,
    spriteHeight,
  }: AlanMotionTimingInput = {},
): StickmanMovementProfile {
  const sequence = getAlanSpriteSequence(actionId);
  const clampedEnergy = Math.max(0, Math.min(energy, 1));
  const displayScale = spriteHeight
    ? spriteHeight / sequence.frameSize.height
    : 1;
  const shouldAnimate =
    !isReducedMotionEnabled &&
    sequence.frameCount > 1 &&
    sequence.loop !== "hold" &&
    sequence.loop !== "reserved";
  const durationMs = shouldAnimate
    ? getEnergyAdjustedDuration(sequence, clampedEnergy)
    : 0;
  const frameIntervalMs = shouldAnimate
    ? Math.max(16, Math.round(durationMs / sequence.frameCount))
    : 0;

  return {
    actionId,
    durationMs,
    frameIntervalMs,
    velocityX: sequence.velocity.x,
    velocityY: sequence.velocity.y,
    scaledVelocityX: sequence.velocity.x * displayScale,
    scaledVelocityY: sequence.velocity.y * displayScale,
    loop: sequence.loop,
    shouldAnimate,
    reducedMotionFrame: sequence.reducedMotionFrame,
  };
}

export function getAlanSpriteSequence(
  actionId: StickmanSpriteActionId,
): StickmanSpriteSequence {
  return alanBlueSpriteSequences[actionId];
}

function getEnergyAdjustedDuration(
  sequence: StickmanSpriteSequence,
  energy: number,
): number {
  if (sequence.id === "runFloor") {
    return Math.max(320, Math.round(sequence.durationMs - energy * 90));
  }

  if (sequence.id === "walkFloor") {
    return Math.max(380, Math.round(sequence.durationMs - energy * 110));
  }

  return sequence.durationMs;
}
