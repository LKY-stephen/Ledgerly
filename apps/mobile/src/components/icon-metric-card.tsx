import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { SurfaceTokens } from "@creator-cfo/ui";

import { AppIcon, type AppIconName } from "./app-icon";

interface IconMetricCardProps {
  icon: AppIconName;
  label: string;
  palette: SurfaceTokens;
  summary: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}

export function IconMetricCard({
  icon,
  label,
  palette,
  summary,
  value,
  style,
}: IconMetricCardProps) {
  return (
    <View
      style={[
        styles.card,
        style,
        {
          backgroundColor: palette.paper,
          borderColor: palette.border,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
        <AppIcon color={palette.accent} name={icon} size={20} />
      </View>
      <Text style={[styles.value, { color: palette.ink }]}>{value}</Text>
      <Text style={[styles.label, { color: palette.ink }]}>{label}</Text>
      <Text style={[styles.summary, { color: palette.inkMuted }]}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
});
