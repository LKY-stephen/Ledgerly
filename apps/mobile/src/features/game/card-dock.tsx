import { Animated, StyleSheet, View } from "react-native";

import { useAppShell } from "../app-shell/provider";
import { CardDockItem } from "./card-dock-item";
import { useDealIn } from "./animations/use-deal-in";
import type { CardId } from "./game-context";

const cards: readonly CardId[] = ["new", "report", "show", "settings"];

interface Props {
  stickmanNearbyCardId?: CardId | null;
}

export function CardDock({ stickmanNearbyCardId = null }: Props) {
  const { palette } = useAppShell();
  const dealStyles = useDealIn(cards.length);

  return (
    <View style={styles.dock}>
      {cards.map((card, i) => (
        <Animated.View key={card} style={dealStyles[i]}>
          <CardDockItem
            cardId={card}
            isStickmanNearby={stickmanNearbyCardId === card}
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
