import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAppShell } from "../app-shell/provider";
import { CardDock } from "./card-dock";
import { CenterPanel } from "./center-panel";
import { DiscardPile } from "./discard-pile";
import { Stickman } from "./stickman/stickman";
import { useGame } from "./game-context";

export function GameShell() {
  const { palette } = useAppShell();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { state } = useGame();
  const isDark = palette.name === "dark";

  const sunPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isDark) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sunPulse, {
          toValue: 1.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sunPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isDark, sunPulse]);

  const goProfile = () => router.push("/profile" as never);

  const dockHeight = 230;
  const groundY = height - dockHeight - insets.bottom - 16;
  const stickmanHeight = Math.min(140, height * 0.18);
  const stickmanY = groundY - stickmanHeight - 8;

  return (
    <View style={[styles.root, { backgroundColor: palette.gameSkyStart }]}>
      {/* Sky gradient (simplified with two-tone) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: palette.gameSkyStart,
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            top: "50%",
            backgroundColor: palette.gameSkyEnd,
            opacity: isDark ? 1 : 0.5,
          } as any,
        ]}
      />

      {/* Grid overlay (dark only) */}
      {isDark && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: palette.gameGridOverlay,
            },
          ]}
        />
      )}

      {/* Sun / Hacker Eye */}
      <View style={[styles.sunArea, { top: insets.top + 24 }]}>
        {isDark ? (
          <Animated.View
            style={[
              styles.hackerEye,
              {
                borderColor: palette.border,
                transform: [{ scale: sunPulse }],
              },
            ]}
          >
            <View
              style={[
                styles.hackerEyeInner,
                { backgroundColor: palette.gameHackerEye },
              ]}
            />
          </Animated.View>
        ) : (
          <View style={styles.sunContainer}>
            <View
              style={[
                styles.sunGlow,
                { backgroundColor: palette.gameSunGlow },
              ]}
            />
            <View
              style={[
                styles.sun,
                { backgroundColor: palette.gameSunColor },
              ]}
            />
          </View>
        )}
      </View>

      {/* Profile button */}
      <Pressable
        onPress={goProfile}
        style={[
          styles.profileBtn,
          {
            top: insets.top + 12,
            borderColor: palette.border,
            backgroundColor: isDark ? "#000" : "#fff",
          },
        ]}
      >
        <Text
          style={[
            styles.profileBtnText,
            { color: palette.ink },
          ]}
        >
          P
        </Text>
      </Pressable>

      {/* White cat (light only) */}
      {!isDark && palette.showCat && (
        <View style={[styles.catArea, { top: stickmanY - 20 }]}>
          <Text style={styles.catEmoji}>🐱</Text>
        </View>
      )}

      {/* Stickman (orchestrated with mood + speech) */}
      <View
        style={[
          styles.stickmanArea,
          {
            top: stickmanY - (state.speechBubble ? 56 : 0),
          },
        ]}
      >
        <Stickman height={stickmanHeight} palette={palette} />
      </View>

      {/* Ground line */}
      <View
        style={[
          styles.groundLine,
          {
            top: groundY,
            backgroundColor: palette.gameGround,
          },
        ]}
      />

      {/* Card dock */}
      <View
        style={[
          styles.dockArea,
          {
            bottom: insets.bottom + 16,
          },
        ]}
      >
        <CardDock />
      </View>

      {/* Discard pile */}
      <View
        style={[
          styles.discardArea,
          {
            top: groundY + 8,
            right: 16,
          },
        ]}
      >
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
  sunArea: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sunContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  sun: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sunGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.35,
  },
  hackerEye: {
    width: 40,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hackerEyeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  profileBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  catArea: {
    position: "absolute",
    left: 24,
  },
  catEmoji: {
    fontSize: 28,
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
    height: 230,
  },
  discardArea: {
    position: "absolute",
  },
});
