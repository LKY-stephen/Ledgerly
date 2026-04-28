import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppShell } from "../app-shell/provider";
import { useGame, type CardId } from "./game-context";
import { useCardFlip } from "./animations/use-card-flip";
import { useDragPhysics } from "./animations/use-drag-physics";
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
  const { state, deactivateCard, discardCard, setAnimation } = useGame();
  const isVisible = state.activeCard !== null;
  const flipStyle = useCardFlip(isVisible);

  const { panHandlers, animatedStyle: dragStyle } = useDragPhysics({
    onFling: () => {
      if (state.activeCard) {
        discardCard(state.activeCard);
      }
    },
    onDragStart: () => setAnimation("dragging"),
    onDragEnd: () => setAnimation("idle"),
  });

  if (!state.activeCard) return null;

  const card = state.activeCard;

  return (
    <Animated.View
      style={[
        styles.overlay,
        flipStyle,
        dragStyle,
      ]}
      {...panHandlers}
    >
      <View
        style={[
          styles.panel,
          {
            backgroundColor: palette.panelSurface,
            borderColor: palette.cardBorder,
            borderRadius: palette.panelRadius,
          },
        ]}
      >
        {/* Panel header */}
        <View style={[styles.header, { borderBottomColor: palette.divider }]}>
          <Text style={[styles.headerSuit, { color: palette.ink }]}>
            {suitMap[card]}
          </Text>
          <Text style={[styles.headerLabel, { color: palette.ink }]}>
            {labelMap[card]}
          </Text>
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
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerSuit: {
    fontSize: 20,
  },
  headerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
});
