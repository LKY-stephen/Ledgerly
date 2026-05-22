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
    ...surfaceTokens.type.label,
  },
  pill: {
    minWidth: 132,
    gap: surfaceTokens.spacing.xxs,
    paddingHorizontal: surfaceTokens.spacing.lg,
    paddingVertical: surfaceTokens.spacing.xs,
    borderRadius: surfaceTokens.radius.pill,
    borderWidth: surfaceTokens.stroke.hair,
    shadowOffset: { width: 0, height: surfaceTokens.stroke.shadowOffset },
    shadowOpacity: 0.14,
    shadowRadius: 0,
  },
  value: {
    ...surfaceTokens.type.heading,
  },
});
