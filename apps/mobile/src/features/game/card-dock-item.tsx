import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { useGame, type CardId } from "./game-context";
import {
  getDockCardNearbyTransform,
  getDockCardScale,
  getGameCardColors,
  getGameCardPresentation,
  getSuitColor,
} from "./game-ui";

const CARD_COUNT = 4;
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

interface Props {
  cardId: CardId;
  isStickmanNearby?: boolean;
  palette: SurfaceTokens;
}

export function CardDockItem({
  cardId,
  isStickmanNearby = false,
  palette,
}: Props) {
  const router = useRouter();
  const { activateCard, state } = useGame();
  const isActive = state.activeCard === cardId;
  const { cardWidth, cardHeight } = useCardDimensions();
  const config = getGameCardPresentation(cardId);
  const nearbyTransform = getDockCardNearbyTransform({
    cardId,
    isNearby: isStickmanNearby,
    palette,
  });

  const variantStyles = getGameCardColors(config.variant, palette);
  const suitColor = getSuitColor({ cardId, palette });

  return (
    <Pressable
      onPress={() => {
        if (cardId === "report") {
          router.push("/ledger");
          return;
        }

        activateCard(cardId);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: variantStyles.bg,
          borderColor:
            isActive || isStickmanNearby ? palette.accent : variantStyles.border,
          borderRadius: palette.cardRadius,
          opacity: pressed ? 0.88 : isStickmanNearby ? 0.96 : 1,
          shadowColor: palette.shadow,
          shadowOffset: { width: 5, height: 5 },
          shadowOpacity: 1,
          shadowRadius: 0,
          transform: [
            { translateY: isStickmanNearby && !pressed ? nearbyTransform.translateY : 0 },
            { rotate: isStickmanNearby && !isActive ? nearbyTransform.rotate : "0deg" },
            {
              scale:
                getDockCardScale({ isActive, isNearby: isStickmanNearby, palette, pressed }),
            },
          ],
          elevation: 6,
        },
      ]}
    >
      {/* Top row: suit + date */}
      <View style={styles.topRow}>
        <Text style={[styles.topLabel, { color: variantStyles.text }]}>
          <Text style={{ color: suitColor }}>{config.suit}</Text> {config.label}
        </Text>
        <View style={[styles.pip, { backgroundColor: variantStyles.pipBg }]}>
          <Text style={[styles.pipText, { color: suitColor }]}>
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    letterSpacing: 0.9,
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
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
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
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.7,
  },
});
