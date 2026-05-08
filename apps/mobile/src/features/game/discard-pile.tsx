import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame } from "./game-context";

const suitMap: Record<string, string> = {
  new: "♦",
  report: "♣",
  show: "♠",
};

interface Props {
  isStickmanNearby?: boolean;
  palette: SurfaceTokens;
}

export function DiscardPile({ isStickmanNearby = false, palette }: Props) {
  const { state, clearDiscard } = useGame();
  const { discardPile, animationPhase } = state;
  const slideIn = useRef(new Animated.Value(0)).current;
  const spikeOpacity = useRef(new Animated.Value(0)).current;
  const spikeScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (discardPile.length === 0) {
      slideIn.setValue(0);
      return;
    }
    slideIn.setValue(0);
    Animated.timing(slideIn, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [discardPile.length, slideIn]);

  useEffect(() => {
    if (animationPhase === "spikeThrow") {
      spikeOpacity.setValue(1);
      spikeScale.setValue(0.5);
      Animated.parallel([
        Animated.spring(spikeScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(spikeOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [animationPhase, spikeOpacity, spikeScale]);

  if (discardPile.length === 0) return null;

  const topCards = discardPile.slice(-3);

  return (
    <View style={styles.root}>
      {/* SPIKE! burst */}
      <Animated.View
        style={[
          styles.spikeBurst,
          {
            opacity: spikeOpacity,
            transform: [{ scale: spikeScale }, { rotate: "-6deg" }],
          },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.spikeText, { color: palette.accent }]}>
          SPIKE!
        </Text>
      </Animated.View>

      <View style={styles.stack}>
        {topCards.map((entry, i) => {
          const offset = (topCards.length - 1 - i) * 4;
          return (
            <Animated.View
              key={entry.timestamp}
              style={[
                styles.card,
                {
                  backgroundColor: palette.paper,
                  borderColor: palette.cardBorder,
                  borderRadius: palette.cardRadius / 2,
                  top: offset,
                  left: offset,
                  shadowColor: palette.shadow,
                  opacity: i === topCards.length - 1 ? slideIn : 0.6,
                  transform:
                    i === topCards.length - 1
                      ? [
                          { translateY: isStickmanNearby ? -5 : 0 },
                          { rotate: isStickmanNearby ? "-4deg" : "0deg" },
                          {
                            scale: slideIn.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, isStickmanNearby ? 1.06 : 1],
                            }),
                          },
                        ]
                      : [],
                },
              ]}
            >
              <Text style={[styles.suit, { color: palette.inkMuted }]}>
                {suitMap[entry.card] ?? "?"}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <Pressable onPress={clearDiscard} hitSlop={8}>
        <Text style={[styles.count, { color: palette.inkMuted }]}>
          {discardPile.length}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: 4,
  },
  spikeBurst: {
    position: "absolute",
    top: -36,
    left: -20,
    zIndex: 10,
  },
  spikeText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  stack: {
    width: 44,
    height: 56,
  },
  card: {
    position: "absolute",
    width: 40,
    height: 52,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  suit: {
    fontSize: 16,
    fontWeight: "900",
  },
  count: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
