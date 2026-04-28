import { Animated, StyleSheet, View } from "react-native";

import { useAppShell } from "../app-shell/provider";
import { CardDockItem } from "./card-dock-item";
import { useDealIn } from "./animations/use-deal-in";
import type { CardId } from "./game-context";

const cards: { id: CardId; suit: string; label: string }[] = [
  { id: "new", suit: "♦", label: "New" },
  { id: "report", suit: "♣", label: "Report" },
  { id: "show", suit: "♠", label: "Show" },
];

export function CardDock() {
  const { palette } = useAppShell();
  const dealStyles = useDealIn(cards.length);

  return (
    <View style={styles.dock}>
      {cards.map((card, i) => (
        <Animated.View key={card.id} style={dealStyles[i]}>
          <CardDockItem
            cardId={card.id}
            suit={card.suit}
            label={card.label}
            palette={palette}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 16,
  },
});
