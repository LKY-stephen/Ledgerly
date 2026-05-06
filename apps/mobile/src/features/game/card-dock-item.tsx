import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "./game-context";

const CARD_COUNT = 3;
const DOCK_PAD_H = 16;
const DOCK_GAP = 24;
const MAX_CARD_W = 150;
const ASPECT = 4.2 / 3;

export function useCardDimensions() {
  const { width } = useWindowDimensions();
  const available = width - DOCK_PAD_H * 2 - DOCK_GAP * (CARD_COUNT - 1);
  const cardWidth = Math.min(MAX_CARD_W, Math.floor(available / CARD_COUNT));
  const cardHeight = Math.round(cardWidth * ASPECT);
  return { cardWidth, cardHeight };
}

type CardVariant = "black" | "white" | "flash";

const cardConfig: Record<CardId, { suit: string; label: string; sublabel: string; variant: CardVariant; footer: string }> = {
  new: { suit: "♦", label: "NEW", sublabel: "RECORD", variant: "black", footer: "INCOME / EXPENSE" },
  report: { suit: "♣", label: "ASK", sublabel: "REPORT", variant: "white", footer: "NATURAL Q&A" },
  show: { suit: "♠", label: "SHOW", sublabel: "LEDGER", variant: "flash", footer: "TABLE · EXPORT" },
};

interface Props {
  cardId: CardId;
  suit: string;
  label: string;
  palette: SurfaceTokens;
}

export function CardDockItem({ cardId, palette }: Props) {
  const { activateCard, state } = useGame();
  const isActive = state.activeCard === cardId;
  const { cardWidth, cardHeight } = useCardDimensions();
  const config = cardConfig[cardId];
  const isDark = palette.name === "dark";

  const variantStyles = getVariantColors(config.variant, palette, isDark);

  return (
    <Pressable
      onPress={() => activateCard(cardId)}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: variantStyles.bg,
          borderColor: isActive ? palette.accent : palette.cardBorder,
          borderRadius: palette.cardRadius,
          opacity: pressed ? 0.88 : 1,
          shadowColor: palette.shadow,
          shadowOffset: { width: 5, height: 5 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 6,
        },
      ]}
    >
      {/* Top row: suit + date */}
      <View style={styles.topRow}>
        <Text style={[styles.topLabel, { color: variantStyles.text }]}>
          {config.suit} {config.label}
        </Text>
        <View style={[styles.pip, { backgroundColor: variantStyles.text }]}>
          <Text style={[styles.pipText, { color: variantStyles.bg }]}>
            {config.suit}
          </Text>
        </View>
      </View>

      {/* Center label */}
      <View style={styles.centerArea}>
        <Text style={[styles.mainLabel, { color: variantStyles.text }]}>
          {config.sublabel}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: variantStyles.text }]}>
          {config.footer}
        </Text>
        <Text style={[styles.footerText, { color: variantStyles.text }]}>
          LDGR
        </Text>
      </View>
    </Pressable>
  );
}

function getVariantColors(variant: CardVariant, palette: SurfaceTokens, isDark: boolean) {
  switch (variant) {
    case "black":
      return { bg: palette.ink, text: palette.paper };
    case "white":
      return { bg: palette.paper, text: palette.ink };
    case "flash":
      return { bg: palette.accent, text: palette.ink };
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  centerArea: {
    alignItems: "flex-start",
  },
  mainLabel: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
    lineHeight: 24,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.7,
  },
});
