import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "../game-context";
import { StickmanSvg } from "./stickman-svg";
import { SpeechBubble } from "./speech-bubble";

const cardSpeech: Record<CardId, string> = {
  new: "New entry!",
  report: "Let's see...",
  show: "Here you go!",
};

interface Props {
  height: number;
  palette: SurfaceTokens;
}

export function Stickman({ height, palette }: Props) {
  const { state, setMood, setSpeech } = useGame();

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
  }, [state.activeCard]);

  useEffect(() => {
    if (state.animationPhase === "spikeThrow") {
      setMood("spike_prep");
      const t1 = setTimeout(() => setMood("spike_air"), 200);
      const t2 = setTimeout(() => setMood("idle"), 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [state.animationPhase]);

  return (
    <View style={styles.root}>
      {state.speechBubble && (
        <View style={styles.speechArea}>
          <SpeechBubble text={state.speechBubble} palette={palette} />
        </View>
      )}
      <StickmanSvg
        mood={state.stickmanMood}
        height={height}
        stroke={palette.stickmanStroke}
        glowFilter={palette.stickmanGlow}
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
