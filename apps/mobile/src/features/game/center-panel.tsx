import { useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppShell } from "../app-shell/provider";
import { useGame, type CardId } from "./game-context";
import { gameHomeButtonLabel, gameSettingsCardLabel } from "./game-ui";
import { useCardFlip } from "./animations/use-card-flip";
import { useDragPhysics } from "./animations/use-drag-physics";
import { usePocketAnimation } from "./animations/use-pocket";
import { CenterPanelContent } from "./center-panel-content";
import { getGameCardColors } from "./game-ui";
import { withAlpha } from "../app-shell/theme-utils";
import { useCardDimensions } from "./card-dock-item";

const suitMap: Record<CardId, string> = {
  new: "♠",
  report: "♥",
  show: "♣",
  settings: "♦",
};

const labelMap: Record<CardId, string> = {
  new: "Upload",
  report: "Report",
  show: "Request",
  settings: gameSettingsCardLabel,
};

interface Props {
  isStickmanNearby?: boolean;
}

export function CenterPanel({ isStickmanNearby = false }: Props) {
  const { palette } = useAppShell();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { cardHeight } = useCardDimensions();
  const { state, deactivateCard, discardCard, pocketCard, setMood, setSpeech, setAnimation } = useGame();
  const isVisible = state.activeCard !== null;
  const { panelStyle, slashOpacity, slashTranslateX } = useCardFlip(isVisible);
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

  const handleReturnHome = () => {
    setSpeech(null);
    setMood("idle");
    setAnimation("idle");
    deactivateCard();
  };

  if (!state.activeCard) return null;

  const card = state.activeCard;
  const isSettingsCard = card === "settings";
  const panelVariant =
    card === "new" ? "black" : card === "report" ? "flash" : card === "show" ? "white" : "system";
  const panelColors = getGameCardColors(panelVariant, palette);
  const dockHeight = cardHeight + 40;
  const groundY = viewportHeight - dockHeight - insets.bottom - 16;
  const panelWidth = Math.max(Math.min(Math.round(viewportWidth * 0.664), viewportWidth - 28), 320);
  const desiredPanelHeight = Math.round(viewportHeight * 0.593);
  const maxHeightAboveHorizon = Math.max(groundY - 10 - 48, 240);
  const panelHeight = Math.max(Math.min(desiredPanelHeight, maxHeightAboveHorizon), 240);
  const horizonAlignedTop = Math.max(groundY - panelHeight - 10, 48);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Cut-in slash overlay */}
      <Animated.View
        style={[styles.slashOverlay, { opacity: slashOpacity }]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.slashStripe, styles.slashHot, { backgroundColor: palette.accent, transform: [{ rotate: "115deg" }, { translateX: slashTranslateX }, { translateY: -40 }] }]} />
        <Animated.View style={[styles.slashStripe, styles.slashAcid, { backgroundColor: palette.success, transform: [{ rotate: "115deg" }, { translateX: slashTranslateX }, { translateY: 40 }] }]} />
      </Animated.View>

      {/* Panel with pocket animation wrapper */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.overlay,
          {
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingTop: horizonAlignedTop,
            paddingRight: 16,
          },
          panelStyle,
          dragStyle,
          isPocketing ? { transform: pocketStyle.transform, opacity: pocketStyle.opacity } : {},
        ]}
      >
        <View
          {...(isPocketing ? {} : panHandlers)}
          style={[
            styles.panel,
            {
              backgroundColor: withAlpha(panelColors.bg, 0.5),
              borderColor: isStickmanNearby ? palette.accent : panelColors.border,
              borderRadius: palette.panelRadius,
              height: panelHeight,
              shadowColor: isStickmanNearby ? palette.accent : panelColors.border,
              width: panelWidth,
            },
          ]}
        >
          {/* Panel header */}
          <View style={[styles.header, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.headerSuit, { color: panelColors.text }]}>
              {suitMap[card]}
            </Text>
            <Text style={[styles.headerLabel, { color: panelColors.text }]}>
              {labelMap[card]}
            </Text>

            <Pressable
              accessibilityLabel="Return to home"
              onPress={handleReturnHome}
              hitSlop={8}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.actionBtnText, { color: palette.ink }]}>
                {gameHomeButtonLabel}
              </Text>
            </Pressable>

            {isSettingsCard ? null : (
              <>
                <Pressable
                  onPress={handlePocket}
                  hitSlop={8}
                  style={[styles.actionBtn, { backgroundColor: palette.success, borderColor: palette.border }]}
                >
                  <Text style={[styles.actionBtnText, { color: palette.inkOnAccent }]}>POCKET</Text>
                </Pressable>

                <Pressable
                  onPress={handleSpike}
                  hitSlop={8}
                  style={[styles.actionBtn, { backgroundColor: palette.accent, borderColor: palette.border }]}
                >
                  <Text style={[styles.actionBtnText, { color: palette.inkOnAccent }]}>SPIKE</Text>
                </Pressable>
              </>
            )}

            {/* Close */}
            <Pressable onPress={deactivateCard} hitSlop={12}>
              <Text style={[styles.closeBtn, { color: panelColors.text }]}>✕</Text>
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
    justifyContent: "center",
    alignItems: "center",
  },
  slashStripe: {
    position: "absolute",
    width: "150%",
    height: 24,
  },
  slashHot: {
  },
  slashAcid: {
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  panel: {
    width: "100%",
    borderWidth: 3,
    overflow: "hidden",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: Platform.OS === "web" ? 0.55 : 0.75,
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
