import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAppShell } from "../app-shell/provider";
import { CardDock } from "./card-dock";
import { CenterPanel } from "./center-panel";
import { DiscardPile } from "./discard-pile";
import { Stickman } from "./stickman/stickman";
import { CatSvg } from "./cat-svg";
import { useGame } from "./game-context";
import { useCardDimensions } from "./card-dock-item";

export function GameShell() {
  const { palette } = useAppShell();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { state } = useGame();
  const isDark = palette.name === "dark";

  const goProfile = () => router.push("/profile" as never);

  const { cardHeight } = useCardDimensions();
  const dockHeight = cardHeight + 40;
  const groundY = height - dockHeight - insets.bottom - 16;
  const stickmanHeight = Math.min(140, height * 0.18);
  const stickmanY = groundY - stickmanHeight - 8;

  return (
    <View style={[styles.root, { backgroundColor: palette.paper }]}>
      {/* Paper background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.paper }]} />

      {/* Halftone dot texture overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? "rgba(244,239,230,0.02)" : "rgba(10,10,10,0.02)" },
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

      {/* Profile button */}
      <Pressable
        onPress={goProfile}
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
        <Text style={[styles.profileBtnText, { color: palette.ink }]}>P</Text>
      </Pressable>

      {/* Cat (light only) — SVG line-art */}
      {!isDark && palette.showCat && (
        <View style={[styles.catArea, { top: stickmanY + stickmanHeight - 40 }]}>
          <CatSvg palette={palette} />
        </View>
      )}

      {/* Stickman */}
      <View
        style={[
          styles.stickmanArea,
          { top: stickmanY - (state.speechBubble ? 56 : 0) },
        ]}
      >
        <Stickman height={stickmanHeight} palette={palette} />
      </View>

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
        <CardDock />
      </View>

      {/* Discard pile */}
      <View style={[styles.discardArea, { top: groundY + 8, right: 16 }]}>
        <DiscardPile palette={palette} />
      </View>

      {/* Center panel (active card content) */}
      {state.activeCard && <CenterPanel />}
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
  profileBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  catArea: {
    position: "absolute",
    left: 24,
  },
  stickmanArea: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
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
