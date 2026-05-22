import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame } from "./game-context";
import { getDiscardFace, getGameCardPresentation, getSuitColor } from "./game-ui";

const suitMap: Record<string, string> = {
  new: "♠",
  report: "♥",
  show: "♣",
  settings: "♦",
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
        {discardPile.length === 0 ? (
          <View
            style={[
              styles.emptyAnchor,
              {
                backgroundColor: palette.scene.emptyDiscardFill,
                borderColor: palette.scene.emptyDiscardOutline,
              },
            ]}
          >
            <Text style={[styles.emptyGlyph, { color: palette.scene.emptyDiscardOutline }]}>
              ⌦
            </Text>
          </View>
        ) : (
          discardPile.slice(-3).map((entry, i, topCards) => {
            const offset = (topCards.length - 1 - i) * 4;
            const face = getDiscardFace(entry.card, palette);
            const presentation = getGameCardPresentation(entry.card);
            const suitColor = getSuitColor({ suit: presentation.suit, palette });
            return (
              <Animated.View
                key={entry.timestamp}
                style={[
                  styles.card,
                  {
                    backgroundColor: face.bg,
                    borderColor: palette.cardBorder,
                    borderRadius: palette.radius.cardMini,
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
                <Text style={[styles.suit, { color: suitColor }]}>
                  {suitMap[entry.card] ?? "?"}
                </Text>
              </Animated.View>
            );
          })
        )}
      </View>

      <Pressable disabled={discardPile.length === 0} onPress={clearDiscard} hitSlop={8}>
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
    width: 60,
    height: 76,
  },
  emptyAnchor: {
    width: 56,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGlyph: {
    fontSize: 20,
    fontWeight: "800",
  },
  card: {
    position: "absolute",
    width: 56,
    height: 72,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  suit: {
    fontSize: 18,
    fontWeight: "900",
  },
  count: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
