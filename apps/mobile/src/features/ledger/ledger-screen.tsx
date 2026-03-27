import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionCard } from "@creator-cfo/ui";

import { useAppShell } from "../app-shell/provider";

export function LedgerScreen() {
  const { copy, palette } = useAppShell();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.ledger.eyebrow}</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{copy.ledger.title}</Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.ledger.summary}</Text>
        </View>

        <SectionCard
          eyebrow={copy.tabs.ledger}
          palette={palette}
          title={copy.home.moduleTitle}
        >
          {copy.ledger.cards.map((card) => (
            <View key={card.title} style={[styles.listRow, { borderTopColor: palette.divider }]}>
              <Text style={[styles.rowTitle, { color: palette.ink }]}>{card.title}</Text>
              <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{card.summary}</Text>
            </View>
          ))}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hero: {
    gap: 12,
  },
  listRow: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  rowSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
