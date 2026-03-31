import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppShell } from "../app-shell/provider";
import { getLedgerCardsForFilter, ledgerFilters, type LedgerFilter } from "./ledger-mocks";

export function LedgerScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const [activeFilter, setActiveFilter] = useState<LedgerFilter>("income");
  const cards = useMemo(() => getLedgerCardsForFilter(activeFilter), [activeFilter]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="ledger-screen"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={[styles.avatar, { backgroundColor: palette.heroEnd, borderColor: palette.border }]}>
              <Text style={[styles.avatarLabel, { color: palette.inkOnAccent }]}>YC</Text>
            </View>
            <Text style={[styles.brand, { color: palette.ink }]}>{copy.common.appName}</Text>
          </View>
          <View style={[styles.navDot, { backgroundColor: palette.heroEnd }]} />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>Financial records</Text>
          <Text style={[styles.title, { color: palette.ink }]}>Ledger</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/ledger/upload")}
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: pressed ? palette.heroEnd : palette.ink,
                shadowColor: palette.shadow,
              },
            ]}
            testID="ledger-upload-button"
          >
            <View style={styles.primaryActionContent}>
              <Feather color={palette.inkOnAccent} name="file-plus" size={16} />
              <Text style={[styles.primaryActionLabel, { color: palette.inkOnAccent }]}>Upload Document</Text>
            </View>
          </Pressable>
        </View>

        <View
          style={[
            styles.filterRail,
            {
              backgroundColor: palette.paperMuted,
              borderColor: "transparent",
            },
          ]}
        >
          {ledgerFilters.map((filter) => {
            const active = filter.id === activeFilter;

            return (
              <Pressable
                key={filter.id}
                accessibilityRole="button"
                onPress={() => setActiveFilter(filter.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.paper : pressed ? palette.paper : "transparent",
                    borderColor: active ? palette.border : "transparent",
                    shadowColor: active ? palette.shadow : "transparent",
                  },
                ]}
                testID={`ledger-filter-${filter.id}`}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? palette.ink : palette.inkMuted },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.cardStack}>
          {cards.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              onPress={() => router.push("/ledger/parse")}
              style={({ pressed }) => [
                styles.recordCard,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.shellElevated,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <View style={[styles.recordAccent, { backgroundColor: palette.accent }]} />
              <View style={[styles.recordBadge, { backgroundColor: palette.accentSoft }]}>
                {card.kind === "income" ? (
                  <MaterialCommunityIcons color={palette.accent} name="cash-multiple" size={18} />
                ) : card.kind === "expenses" ? (
                  <MaterialCommunityIcons color={palette.accent} name="bag-suitcase-outline" size={18} />
                ) : (
                  <Feather color={palette.accent} name="briefcase" size={16} />
                )}
              </View>
              <View style={styles.recordContent}>
                <Text style={[styles.rowTitle, { color: palette.ink }]}>{card.title}</Text>
                <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{card.dateLabel}</Text>
                <Text style={[styles.recordAmount, { color: palette.ink }]}>{card.amountLabel}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/ledger/parse")}
          style={styles.pastRecordsButton}
          testID="ledger-parse-button"
        >
          <View style={styles.pastRecordsContent}>
            <Text style={[styles.pastRecordsLabel, { color: palette.inkMuted }]}>View Past Records</Text>
            <Feather color={palette.inkMuted} name="chevron-down" size={18} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  cardStack: {
    gap: 14,
  },
  container: {
    gap: 18,
    padding: 18,
    paddingBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  filterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  filterRail: {
    borderRadius: 999,
    borderWidth: 0,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  hero: {
    gap: 14,
  },
  navDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  pastRecordsButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  pastRecordsContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  pastRecordsLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  primaryActionContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  recordAccent: {
    borderRadius: 999,
    height: 42,
    left: 0,
    position: "absolute",
    top: 32,
    width: 3,
  },
  recordAmount: {
    alignSelf: "flex-end",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },
  recordBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  recordCard: {
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: "relative",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  recordContent: {
    flex: 1,
    gap: 2,
  },
  rowSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: 44,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
