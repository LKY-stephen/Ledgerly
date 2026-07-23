import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "../game-context";
import {
  getStickmanTouchReaction,
  type StickmanSceneAnchorId,
} from "../game-ui";
import { AlanStickmanSprite } from "./alan-stickman-sprite";
import {
  getAlanActionForAnchor,
  getAlanActionForGamePhase,
} from "./alan-stickman-actions";
import { SpeechBubble } from "./speech-bubble";

const cardSpeech: Record<CardId, string> = {
  new: "Upload file!",
  report: "Let's see...",
  show: "Make a request!",
  settings: "Tune it.",
};

interface Props {
  activeAnchorId: StickmanSceneAnchorId | null;
  height: number;
  facing: "left" | "right";
  isWalking: boolean;
  palette: SurfaceTokens;
  energy: number;
  interactionCount: number;
  isReducedMotionEnabled: boolean;
}

export function Stickman({
  activeAnchorId,
  height,
  facing,
  isWalking,
  palette,
  energy,
  interactionCount,
  isReducedMotionEnabled,
}: Props) {
  const { state, setAnimation, setMood, setSpeech } = useGame();
  const [isNudging, setIsNudging] = useState(false);
  const [isRecoveringFromFloor, setIsRecoveringFromFloor] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionBlocked =
    state.activeCard !== null ||
    state.animationPhase === "spikeThrow" ||
    state.animationPhase === "pocketShrink" ||
    state.animationPhase === "dragging";

  useEffect(() => {
    if (!state.activeCard) {
      setMood("idle");
      setSpeech(null);
      return;
    }

    setSpeech(cardSpeech[state.activeCard] ?? null);

    switch (state.activeCard) {
      case "new":
        setMood("got_it");
        break;
      case "report":
        setMood("think");
        break;
      case "show":
        setMood("pocket");
        break;
      default:
        setMood("idle");
    }
  }, [state.activeCard, setMood, setSpeech]);

  // Spike anticipation sequence
  useEffect(() => {
    if (state.animationPhase !== "spikeThrow") {
      setIsRecoveringFromFloor(false);
      return;
    }

    setIsRecoveringFromFloor(false);
    setMood("spike_prep");

    const fallTimer = setTimeout(() => {
      setMood("spike_air");
      setSpeech("SPIKE!");
    }, 200);
    const recoveryTimer = setTimeout(() => {
      setIsRecoveringFromFloor(true);
      setMood("got_it");
    }, 420);
    const resetTimer = setTimeout(() => {
      setIsRecoveringFromFloor(false);
      setMood("idle");
      setSpeech(null);
      setAnimation("idle");
    }, 780);

    return () => {
      clearTimeout(fallTimer);
      clearTimeout(recoveryTimer);
      clearTimeout(resetTimer);
    };
  }, [state.animationPhase, setAnimation, setMood, setSpeech]);

  // Pocket animation sequence
  useEffect(() => {
    if (state.animationPhase === "pocketShrink") {
      setMood("pocket");
      setSpeech("GOT IT.");
      const t = setTimeout(() => {
        setMood("idle");
        setSpeech(null);
        setAnimation("idle");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [state.animationPhase, setAnimation, setMood, setSpeech]);

  useEffect(() => {
    if (interactionCount === 0 || interactionBlocked) {
      setIsNudging(false);
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const reaction = getStickmanTouchReaction({
      energy,
      touchCount: interactionCount,
    });

    setMood(reaction.mood);
    setSpeech(reaction.speech);
    setIsNudging(true);

    if (nudgeTimerRef.current) {
      clearTimeout(nudgeTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setMood("idle");
      setSpeech(null);
    }, 850);

    nudgeTimerRef.current = setTimeout(() => {
      setIsNudging(false);
    }, 480);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (nudgeTimerRef.current) {
        clearTimeout(nudgeTimerRef.current);
      }
    };
  }, [
    energy,
    interactionCount,
    interactionBlocked,
    setMood,
    setSpeech,
  ]);

  const spriteActionId =
    getAlanActionForGamePhase({
      animationPhase: state.animationPhase,
      isRecoveringFromFloor,
      isNudging,
      isReducedMotionEnabled,
      stickmanMood: state.stickmanMood,
    }) ??
    getAlanActionForAnchor({
      activeAnchorId,
      energy,
      isReducedMotionEnabled,
      isWalking,
    });

  return (
    <View style={styles.root}>
      {state.speechBubble && (
        <View style={styles.speechArea}>
          <SpeechBubble text={state.speechBubble} palette={palette} />
        </View>
      )}
      <AlanStickmanSprite
        actionId={spriteActionId}
        energy={energy}
        facing={facing}
        height={height}
        isReducedMotionEnabled={isReducedMotionEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
  },
  speechArea: {
    marginBottom: 8,
  },
});
