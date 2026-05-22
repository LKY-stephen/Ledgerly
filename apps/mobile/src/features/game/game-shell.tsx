import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAppShell } from "../app-shell/provider";
import { CardDock } from "./card-dock";
import { CenterPanel } from "./center-panel";
import { DiscardPile } from "./discard-pile";
import { useCharacterMotion } from "./animations/use-character-motion";
import { useStickmanRoam } from "./animations/use-stickman-roam";
import { Stickman } from "./stickman/stickman";
import { CatSvg } from "./cat-svg";
import { useGame } from "./game-context";
import { useCardDimensions } from "./card-dock-item";
import {
  getNextQuickTheme,
  getStickmanEnergy,
  getStickmanNearbyCardId,
} from "./game-ui";

export function GameShell() {
  const { palette, setThemePreference } = useAppShell();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { state } = useGame();
  const isDark = palette.name === "dark";
  const quickTheme = getNextQuickTheme(isDark ? "dark" : "light");
  const [stickmanTouchCount, setStickmanTouchCount] = useState(0);
  const [catTouchCount, setCatTouchCount] = useState(0);

  const handleQuickThemeToggle = () => {
    void setThemePreference(quickTheme);
  };

  const { cardHeight, cardWidth } = useCardDimensions();
  const stickmanWidth = Math.min(180, Math.max(124, width * 0.28));
  const dockHeight = cardHeight + 40;
  const groundY = height - dockHeight - insets.bottom - 16;
  const stickmanHeight = Math.min(140, height * 0.18);
  const stickmanY = groundY - stickmanHeight - 8;
  const stickmanBaseTop = stickmanY - (state.speechBubble ? 56 : 0);
  const stickmanEnergy = getStickmanEnergy(state.cardsPlayedThisSession);
  const catEnergy = Math.min(0.35 + stickmanEnergy * 0.3, 0.8);
  const dockStart = (width - cardWidth * 4 - 24 * 3) / 2;
  const roamAnchors = useMemo(() => {
    const clampLane = (value: number) =>
      Math.max(12, Math.min(width - stickmanWidth - 12, value));
    const leftLane = clampLane(width * 0.18 - stickmanWidth / 2);
    const rightLane = clampLane(width * 0.82 - stickmanWidth / 2);
    const catLane = clampLane(34);
    const discardLane = clampLane(width - 96);
    const dockIds = ["new", "report", "show", "settings"] as const;
    const dockAnchors = dockIds.map((cardId, index) => ({
      id: `dock:${cardId}` as const,
      pauseMs: 560,
      weight: 1.25,
      x: clampLane(
        dockStart +
          index * (cardWidth + 24) +
          cardWidth / 2 -
          stickmanWidth / 2,
      ),
    }));

    if (state.activeCard) {
      return [
        { id: "panel:left" as const, pauseMs: 520, weight: 1.35, x: leftLane },
        { id: "panel:right" as const, pauseMs: 520, weight: 1.35, x: rightLane },
        { id: "discard" as const, pauseMs: 620, weight: 1.1, x: discardLane },
        { id: "cat" as const, pauseMs: 620, weight: 1.1, x: catLane },
      ];
    }

    return [
      { id: "lane:left" as const, pauseMs: 280, weight: 0.9, x: leftLane },
      { id: "cat" as const, pauseMs: 620, weight: 1.1, x: catLane },
      ...dockAnchors,
      { id: "discard" as const, pauseMs: 620, weight: 1.1, x: discardLane },
      { id: "lane:right" as const, pauseMs: 280, weight: 0.9, x: rightLane },
    ];
  }, [cardWidth, dockStart, state.activeCard, stickmanWidth, width]);
  const { activeAnchorId, facing, isWalking, travelStyle } = useStickmanRoam({
    anchors: roamAnchors,
    energy: stickmanEnergy,
    isPanelOpen: state.activeCard !== null,
  });
  const stickmanMotion = useCharacterMotion({
    character: "stickman",
    energy: stickmanEnergy,
    isPanelOpen: state.activeCard !== null,
    reactionKey: stickmanTouchCount,
    boostKey: state.cardsPlayedThisSession,
  });
  const catMotion = useCharacterMotion({
    character: "cat",
    energy: catEnergy,
    isPanelOpen: state.activeCard !== null,
    reactionKey: catTouchCount,
    boostKey: catTouchCount,
  });
  const stickmanNearbyCardId = getStickmanNearbyCardId(activeAnchorId);
  const stickmanNearDiscard = activeAnchorId === "discard";
  const stickmanNearPanel =
    activeAnchorId === "panel:left" || activeAnchorId === "panel:right";

  useEffect(() => {
    if (activeAnchorId === "cat") {
      setCatTouchCount((count) => count + 1);
    }
  }, [activeAnchorId]);

  return (
    <View style={[styles.root, { backgroundColor: palette.paper }]}>
      {/* Paper background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.paper }]} />

      {/* Halftone dot texture overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.scene.halftone },
        ]}
      />

      {/* Title badge top-left */}
      <View
        style={[
          styles.titleBadge,
          {
            top: insets.top + 12,
            backgroundColor: palette.paper,
            borderColor: palette.border,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <Text style={[styles.titleText, { color: palette.ink }]}>LEDGERLY</Text>
        <Text style={[styles.titleSub, { color: palette.inkMuted }]}>// bookkeeping, weaponized</Text>
      </View>

      {/* Theme quick switch */}
      <Pressable
        accessibilityLabel={`Switch to ${quickTheme} mode`}
        onPress={handleQuickThemeToggle}
        style={[
          styles.profileBtn,
          {
            top: insets.top + 12,
            borderColor: palette.border,
            backgroundColor: palette.paper,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <Feather
          color={palette.ink}
          name={isDark ? "sun" : "moon"}
          size={16}
        />
      </Pressable>

      {/* Ground shadow follows the stickman across the scene */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickmanTravel,
          {
            top: groundY + 10,
            width: stickmanWidth,
          },
          travelStyle,
        ]}
      >
        <View style={[styles.groundShadow, { backgroundColor: palette.scene.groundShadow }]} />
      </Animated.View>

      {/* Cat — SVG line-art */}
      {palette.showCat && (
        <Pressable
          accessibilityLabel="Nudge the cat"
          onPress={() => setCatTouchCount((count) => count + 1)}
          style={({ pressed }) => [
            styles.catArea,
            {
              top: stickmanY + stickmanHeight - 44,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Animated.View style={[styles.characterMotion, catMotion]}>
            <CatSvg palette={palette} interactionCount={catTouchCount} />
          </Animated.View>
        </Pressable>
      )}

      {/* Stickman */}
      <Animated.View
        style={[
          styles.stickmanTravel,
          {
            top: stickmanBaseTop,
            width: stickmanWidth,
          },
          travelStyle,
        ]}
      >
        <Pressable
          accessibilityLabel="Nudge the stickman"
          onPress={() => setStickmanTouchCount((count) => count + 1)}
          style={({ pressed }) => [
            styles.stickmanPressable,
            { opacity: pressed ? 0.94 : 1 },
          ]}
        >
          <Animated.View
            style={[
              styles.characterMotion,
              {
                width: stickmanWidth,
              },
              stickmanMotion,
            ]}
          >
            <Stickman
              activeAnchorId={activeAnchorId}
              facing={facing}
              height={stickmanHeight}
              isWalking={isWalking}
              palette={palette}
              energy={stickmanEnergy}
              interactionCount={stickmanTouchCount}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Ground line */}
      <View
        style={[
          styles.groundLine,
          { top: groundY, backgroundColor: palette.gameGround },
        ]}
      />

      {/* Card dock */}
      <View
        style={[
          styles.dockArea,
          { bottom: insets.bottom + 16, height: dockHeight },
        ]}
      >
        <CardDock stickmanNearbyCardId={state.activeCard ? null : stickmanNearbyCardId} />
      </View>

      {/* Discard pile */}
      <View style={[styles.discardArea, { top: groundY + 8, right: 16 }]}>
        <DiscardPile isStickmanNearby={stickmanNearDiscard} palette={palette} />
      </View>

      {/* Center panel (active card content) */}
      {state.activeCard && <CenterPanel isStickmanNearby={stickmanNearPanel} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  titleBadge: {
    position: "absolute",
    left: 16,
    borderWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  titleSub: {
    fontSize: 9,
    fontWeight: "400",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  profileBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  catArea: {
    position: "absolute",
    left: 16,
    width: 120,
    height: 84,
    justifyContent: "center",
    alignItems: "center",
  },
  stickmanPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  stickmanTravel: {
    position: "absolute",
    left: 0,
    alignItems: "center",
  },
  characterMotion: {
    alignItems: "center",
    justifyContent: "center",
  },
  groundShadow: {
    width: 108,
    height: 16,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  groundLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
  },
  dockArea: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  discardArea: {
    position: "absolute",
  },
});
