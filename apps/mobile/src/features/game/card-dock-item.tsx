import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "./game-context";

const suitColorKey: Record<string, keyof SurfaceTokens> = {
  "♦": "cardDiamond",
  "♣": "cardClub",
  "♠": "cardSpade",
};

interface Props {
  cardId: CardId;
  suit: string;
  label: string;
  palette: SurfaceTokens;
}

export function CardDockItem({ cardId, suit, label, palette }: Props) {
  const { activateCard, state } = useGame();
  const isActive = state.activeCard === cardId;
  const suitColor = String(palette[suitColorKey[suit] ?? "ink"]);

  return (
    <Pressable
      onPress={() => activateCard(cardId)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.cardSurface,
          borderColor: isActive ? suitColor : palette.cardBorder,
          borderRadius: palette.cardRadius,
          borderWidth: 6,
          opacity: pressed ? 0.85 : 1,
          ...(palette.name === "light"
            ? {
                shadowColor: palette.cardShadow,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.95,
                shadowRadius: 0,
                elevation: 12,
              }
            : {}),
        },
      ]}
    >
      {/* Top-left corner suit */}
      <Text style={[styles.cornerSuit, styles.cornerTop, { color: suitColor }]}>
        {suit}
      </Text>
      {/* Center content */}
      <Text style={[styles.title, { color: palette.ink }]}>{label}</Text>
      {/* Large watermark suit */}
      <Text style={[styles.watermarkSuit, { color: suitColor }]}>{suit}</Text>
      {/* Bottom-right corner suit (rotated) */}
      <Text style={[styles.cornerSuit, styles.cornerBottom, { color: suitColor }]}>
        {suit}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cornerSuit: {
    position: "absolute",
    fontSize: 24,
    fontWeight: "900",
  },
  cornerTop: {
    top: 12,
    left: 12,
  },
  cornerBottom: {
    bottom: 12,
    right: 12,
    transform: [{ rotate: "180deg" }],
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  watermarkSuit: {
    position: "absolute",
    fontSize: 36,
    opacity: 0.15,
    top: 112,
  },
});
