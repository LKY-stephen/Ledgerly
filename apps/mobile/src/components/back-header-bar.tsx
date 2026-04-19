import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

import { AppIcon } from "./app-icon";

interface BackHeaderBarProps {
  onBack: () => void;
  palette: SurfaceTokens;
  rightAccessory?: ReactNode;
  title: string;
}

export function BackHeaderBar({ onBack, palette, rightAccessory, title }: BackHeaderBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? palette.paperMuted : "transparent",
            },
          ]}
        >
          <AppIcon color={palette.ink} name="back" size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Text numberOfLines={1} style={[styles.title, { color: palette.ink }]}>
        {title}
      </Text>

      <View style={styles.side}>{rightAccessory ?? <View style={styles.sideSpacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    marginHorizontal: -10,
    minHeight: 40,
  },
  side: {
    alignItems: "flex-start",
    justifyContent: "center",
    width: 40,
  },
  sideSpacer: {
    height: 36,
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
});
