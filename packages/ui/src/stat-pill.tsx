import { StyleSheet, Text, View } from "react-native";

import { surfaceTokens, type SurfaceTokens } from "./tokens";

interface StatPillProps {
  label: string;
  value: string;
  palette?: SurfaceTokens;
}

export function StatPill({ label, palette = surfaceTokens, value }: StatPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
      <Text style={[styles.value, { color: palette.accent }]}>{value}</Text>
      <Text style={[styles.label, { color: palette.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
  },
  pill: {
    minWidth: 132,
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
});
