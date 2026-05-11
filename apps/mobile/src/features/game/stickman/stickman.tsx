import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "../game-context";
import {
  getStickmanTouchReaction,
  type StickmanSceneAnchorId,
} from "../game-ui";
import { StickmanSvg } from "./stickman-svg";
import type { StickmanPoseId } from "./stickman-poses";
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
}

export function Stickman({
  activeAnchorId,
  height,
  facing,
  isWalking,
  palette,
  energy,
  interactionCount,
}: Props) {
  const { state, setAnimation, setMood, setSpeech } = useGame();
  const [idleBeat, setIdleBeat] = useState(0);
  const [walkBeat, setWalkBeat] = useState(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionBlocked =
    state.activeCard !== null ||
    state.animationPhase === "spikeThrow" ||
    state.animationPhase === "pocketShrink" ||
    state.animationPhase === "dragging";

  useEffect(() => {
    if (state.stickmanMood !== "idle" || !isWalking) {
      return;
    }

    const intervalMs = Math.max(120, Math.round(220 - energy * 65));
    const timer = setInterval(() => {
      setWalkBeat((value) => value + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [energy, isWalking, state.stickmanMood]);

  useEffect(() => {
    if (state.stickmanMood !== "idle" || isWalking) {
      return;
    }

    const intervalMs = Math.max(320, Math.round(560 - energy * 120));
    const timer = setInterval(() => {
      setIdleBeat((value) => value + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [energy, isWalking, state.stickmanMood]);

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
    if (state.animationPhase === "spikeThrow") {
      setMood("spike_prep");
      const t1 = setTimeout(() => {
        setMood("spike_air");
        setSpeech("SPIKE!");
      }, 200);
      const t2 = setTimeout(() => {
        setMood("idle");
        setSpeech(null);
        setAnimation("idle");
      }, 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
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

    resetTimerRef.current = setTimeout(() => {
      setMood("idle");
      setSpeech(null);
    }, 850);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [
    energy,
    interactionCount,
    interactionBlocked,
    setMood,
    setSpeech,
  ]);

  const poseId: StickmanPoseId = useMemo(() => {
    if (state.stickmanMood !== "idle") {
      return state.stickmanMood;
    }

    if (isWalking) {
      const walkCycle: StickmanPoseId[] = ["walk_a", "walk_b", "walk_c", "walk_d"];
      return walkCycle[walkBeat % walkCycle.length] ?? "walk_a";
    }

    if (activeAnchorId === "cat") {
      return idleBeat % 2 === 0 ? "think" : "idle_shift";
    }

    if (activeAnchorId?.startsWith("dock:")) {
      return idleBeat % 2 === 0 ? "got_it" : "idle_shift";
    }

    if (activeAnchorId === "discard") {
      return idleBeat % 2 === 0 ? "pocket" : "idle_shift";
    }

    if (activeAnchorId === "panel:left" || activeAnchorId === "panel:right") {
      return idleBeat % 2 === 0 ? "think" : "got_it";
    }

    const idleCycle: StickmanPoseId[] = ["idle", "idle_breathe", "idle_shift", "idle_breathe"];
    return idleCycle[idleBeat % idleCycle.length] ?? "idle";
  }, [activeAnchorId, idleBeat, isWalking, state.stickmanMood, walkBeat]);

  return (
    <View style={styles.root}>
      {state.speechBubble && (
        <View style={styles.speechArea}>
          <SpeechBubble text={state.speechBubble} palette={palette} />
        </View>
      )}
      <StickmanSvg
        facing={facing}
        isWalking={isWalking}
        mood={state.stickmanMood}
        height={height}
        poseId={poseId}
        energy={energy}
        accent={palette.accent}
        accentSoft={palette.accentSoft}
        stroke={palette.stickmanStroke}
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
