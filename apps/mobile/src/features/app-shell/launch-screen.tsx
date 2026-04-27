import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppShell } from "./provider";

export function LaunchScreen() {
  const { copy, palette } = useAppShell();

  return (
    <View style={[styles.container, { backgroundColor: palette.shell }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.paper,
            borderColor: palette.border,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <ActivityIndicator color={palette.accent} />
        <Text style={[styles.title, { color: palette.ink }]}>{copy.common.appName}</Text>
        <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.common.loading}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    maxWidth: 320,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
});
