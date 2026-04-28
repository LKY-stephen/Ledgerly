import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type DiscardEntry } from "./game-context";

const suitMap: Record<string, string> = {
  new: "♦",
  report: "♣",
  show: "♠",
};

interface Props {
  palette: SurfaceTokens;
}

export function DiscardPile({ palette }: Props) {
  const { state, clearDiscard } = useGame();
  const { discardPile } = state;
  const slideIn = useRef(new Animated.Value(0)).current;

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

  if (discardPile.length === 0) return null;

  const topCards = discardPile.slice(-3);

  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        {topCards.map((entry, i) => {
          const offset = (topCards.length - 1 - i) * 4;
          return (
            <Animated.View
              key={entry.timestamp}
              style={[
                styles.card,
                {
                  backgroundColor: palette.discardSurface,
                  borderColor: palette.cardBorder,
                  borderRadius: palette.cardRadius / 2,
                  top: offset,
                  left: offset,
                  opacity: i === topCards.length - 1 ? slideIn : 0.6,
                  transform:
                    i === topCards.length - 1
                      ? [
                          {
                            scale: slideIn.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1],
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
  stack: {
    width: 44,
    height: 56,
  },
  card: {
    position: "absolute",
    width: 40,
    height: 52,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  suit: {
    fontSize: 16,
  },
  count: {
    fontSize: 11,
    fontWeight: "700",
  },
});
