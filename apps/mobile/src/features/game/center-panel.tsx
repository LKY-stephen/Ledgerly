import { useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppShell } from "../app-shell/provider";
import { useGame, type CardId } from "./game-context";
import { useCardFlip } from "./animations/use-card-flip";
import { useDragPhysics } from "./animations/use-drag-physics";
import { usePocketAnimation } from "./animations/use-pocket";
import { CenterPanelContent } from "./center-panel-content";

const suitMap: Record<CardId, string> = {
  new: "♦",
  report: "♣",
  show: "♠",
};

const labelMap: Record<CardId, string> = {
  new: "New",
  report: "Report",
  show: "Show",
};

export function CenterPanel() {
  const { palette } = useAppShell();
  const { state, deactivateCard, discardCard, pocketCard, setMood, setSpeech, setAnimation } = useGame();
  const isVisible = state.activeCard !== null;
  const { panelStyle, slashOpacity } = useCardFlip(isVisible);
  const [isPocketing, setIsPocketing] = useState(false);
  const pocketStyle = usePocketAnimation(isPocketing);

  const { panHandlers, animatedStyle: dragStyle } = useDragPhysics({
    onFling: () => {
      if (state.activeCard) {
        discardCard(state.activeCard);
      }
    },
    onDragStart: () => setAnimation("dragging"),
    onDragEnd: () => setAnimation("idle"),
  });

  const handlePocket = () => {
    if (!state.activeCard) return;
    const card = state.activeCard;
    setIsPocketing(true);
    setMood("pocket");
    setSpeech("GOT IT.");
    setTimeout(() => {
      pocketCard(card);
      setIsPocketing(false);
      setSpeech(null);
      setMood("idle");
    }, 450);
  };

  const handleSpike = () => {
    if (!state.activeCard) return;
    discardCard(state.activeCard);
  };

  if (!state.activeCard) return null;

  const card = state.activeCard;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Cut-in slash overlay */}
      <Animated.View
        style={[styles.slashOverlay, { opacity: slashOpacity }]}
        pointerEvents="none"
      >
        <View style={[styles.slashStripe, styles.slashHot, { backgroundColor: palette.accent }]} />
        <View style={[styles.slashStripe, styles.slashAcid, { backgroundColor: palette.success }]} />
      </Animated.View>

      {/* Panel with pocket animation wrapper */}
      <Animated.View
        style={[
          styles.overlay,
          panelStyle,
          dragStyle,
          isPocketing ? { transform: pocketStyle.transform, opacity: pocketStyle.opacity } : {},
        ]}
        {...(isPocketing ? {} : panHandlers)}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.panelSurface,
              borderColor: palette.cardBorder,
              borderRadius: palette.panelRadius,
              shadowColor: palette.shadow,
            },
          ]}
        >
          {/* Panel header */}
          <View style={[styles.header, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.headerSuit, { color: palette.accent }]}>
              {suitMap[card]}
            </Text>
            <Text style={[styles.headerLabel, { color: palette.ink }]}>
              {labelMap[card]}
            </Text>

            {/* Pocket button */}
            <Pressable
              onPress={handlePocket}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: palette.success, borderColor: palette.border }]}
            >
              <Text style={[styles.actionBtnText, { color: palette.inkOnAccent }]}>POCKET</Text>
            </Pressable>

            {/* Spike button */}
            <Pressable
              onPress={handleSpike}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: palette.accent, borderColor: palette.border }]}
            >
              <Text style={[styles.actionBtnText, { color: palette.inkOnAccent }]}>SPIKE</Text>
            </Pressable>

            {/* Close */}
            <Pressable onPress={deactivateCard} hitSlop={12}>
              <Text style={[styles.closeBtn, { color: palette.inkMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Panel body */}
          <View style={styles.body}>
            <CenterPanelContent card={card} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  slashStripe: {
    position: "absolute",
    width: "150%",
    height: 24,
  },
  slashHot: {
    transform: [{ rotate: "115deg" }, { translateY: -40 }],
  },
  slashAcid: {
    transform: [{ rotate: "115deg" }, { translateY: 40 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  panel: {
    flex: 1,
    width: "100%",
    borderWidth: 3,
    overflow: "hidden",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  headerSuit: {
    fontSize: 18,
    fontWeight: "900",
  },
  headerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 4,
  },
  body: {
    flex: 1,
  },
});
