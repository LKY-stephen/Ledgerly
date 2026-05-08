import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

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
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 16,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
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
