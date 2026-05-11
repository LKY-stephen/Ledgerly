import { StyleSheet, Text, View } from "react-native";

import { surfaceTokens, type SurfaceTokens } from "./tokens";

interface StatPillProps {
  label: string;
  value: string;
  palette?: SurfaceTokens;
}

export function StatPill({ label, palette = surfaceTokens, value }: StatPillProps) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: palette.paperMuted,
          borderColor: palette.border,
          shadowColor: palette.cardShadow,
        },
      ]}
    >
      <Text style={[styles.value, { color: palette.accent }]}>{value}</Text>
      <Text style={[styles.label, { color: palette.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pill: {
    minWidth: 132,
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
});
