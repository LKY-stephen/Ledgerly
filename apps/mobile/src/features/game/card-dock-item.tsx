import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "./game-context";

const suitColorKey: Record<string, keyof SurfaceTokens> = {
  "♦": "cardDiamond",
  "♣": "cardClub",
  "♠": "cardSpade",
};

const CARD_COUNT = 3;
const DOCK_PAD_H = 16;
const DOCK_GAP = 24;
const MAX_CARD_W = 150;
const ASPECT = 190 / 150;

export function useCardDimensions() {
  const { width } = useWindowDimensions();
  const available = width - DOCK_PAD_H * 2 - DOCK_GAP * (CARD_COUNT - 1);
  const cardWidth = Math.min(MAX_CARD_W, Math.floor(available / CARD_COUNT));
  const cardHeight = Math.round(cardWidth * ASPECT);
  return { cardWidth, cardHeight };
}

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
  const { cardWidth, cardHeight } = useCardDimensions();

  const scale = cardWidth / MAX_CARD_W;

  return (
    <Pressable
      onPress={() => activateCard(cardId)}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: palette.cardSurface,
          borderColor: isActive ? suitColor : palette.cardBorder,
          borderRadius: palette.cardRadius,
          borderWidth: Math.max(4, Math.round(6 * scale)),
          opacity: pressed ? 0.85 : 1,
          ...(palette.name === "light"
            ? {
                shadowColor: palette.cardShadow,
                shadowOffset: { width: 0, height: Math.round(12 * scale) },
                shadowOpacity: 0.95,
                shadowRadius: 0,
                elevation: 12,
              }
            : {}),
        },
      ]}
    >
      <Text style={[styles.cornerSuit, styles.cornerTop, { color: suitColor, fontSize: Math.round(24 * scale) }]}>
        {suit}
      </Text>
      <Text style={[styles.title, { color: palette.ink, fontSize: Math.round(26 * scale) }]}>{label}</Text>
      <Text style={[styles.watermarkSuit, { color: suitColor, fontSize: Math.round(36 * scale), top: Math.round(112 * scale) }]}>{suit}</Text>
      <Text style={[styles.cornerSuit, styles.cornerBottom, { color: suitColor, fontSize: Math.round(24 * scale) }]}>
        {suit}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cornerSuit: {
    position: "absolute",
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
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  watermarkSuit: {
    position: "absolute",
    opacity: 0.15,
  },
});
