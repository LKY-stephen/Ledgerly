import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import type {
  GeneralLedgerEntry,
  GeneralLedgerPostingLine,
} from "../ledger/ledger-reporting";
import { loadJournalScreenEntries } from "../ledger/ledger-runtime";

export function JournalScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const { isExpanded } = useResponsive();
  const journalCopy = copy.journalScreen;
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const result = await loadJournalScreenEntries({ locale: resolvedLocale });
      setEntries(result);
    } catch {
      // silently handle
    } finally {
      setIsLoaded(true);
    }
  }, [resolvedLocale]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const renderItem = useCallback(
    ({ item }: { item: GeneralLedgerEntry }) => {
      const debitLine = item.lines.find((l) => l.side === "debit");
      const creditLine = item.lines.find((l) => l.side === "credit");
      const isIncome = item.kind === "income";

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.shellElevated,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.kindIcon,
                {
                  backgroundColor: isIncome
                    ? "rgba(195, 233, 197, 0.5)"
                    : "rgba(255, 218, 214, 0.3)",
                },
              ]}
            >
              <Ionicons
                color={isIncome ? "#45664A" : "#BA1A1A"}
                name={isIncome ? "arrow-down" : "arrow-up"}
                size={16}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: palette.ink }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: palette.inkMuted }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <Text style={[styles.cardAmount, { color: palette.ink }]}>
                {item.amount}
              </Text>
              <Text style={[styles.cardDate, { color: palette.inkMuted }]}>
                {item.dateLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.postingsCard, { borderColor: palette.border }]}>
            {debitLine ? (
              <PostingLineRow line={debitLine} palette={palette} side={journalCopy.debit} />
            ) : null}
            {debitLine && creditLine ? (
              <View style={[styles.postingDivider, { backgroundColor: palette.divider }]} />
            ) : null}
            {creditLine ? (
              <PostingLineRow line={creditLine} palette={palette} side={journalCopy.credit} />
            ) : null}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>
                {journalCopy.debit}
              </Text>
              <Text style={[styles.summaryValue, { color: palette.ink }]}>
                {debitLine?.amount ?? "-"}
              </Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>
                {journalCopy.credit}
              </Text>
              <Text style={[styles.summaryValue, { color: palette.ink }]}>
                {creditLine?.amount ?? "-"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [palette, journalCopy],
  );

  const countLabel = `${entries.length} records`;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: "#F5F6F8" }]}
    >
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: "#F5F6F8",
            borderBottomColor: palette.divider,
          },
        ]}
      >
        <BackHeaderBar
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>

      <View style={[styles.sectionHeader, isExpanded && styles.sectionHeaderWide]}>
        <Text style={[styles.sectionTitle, { color: palette.ink }]}>
          {journalCopy.title}
        </Text>
        {entries.length > 0 ? (
          <Text style={[styles.sectionCount, { color: palette.inkMuted }]}>
            {countLabel}
          </Text>
        ) : null}
      </View>

      {isLoaded && entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.ink }]}>
            {journalCopy.emptyTitle}
          </Text>
          <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>
            {journalCopy.emptySummary}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, isExpanded && styles.listWide]}
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

function PostingLineRow({
  line,
  palette,
  side,
}: {
  line: GeneralLedgerPostingLine;
  palette: { ink: string; inkMuted: string };
  side: string;
}) {
  return (
    <View style={styles.postingLine}>
      <View style={styles.postingLineTop}>
        <Text style={[styles.postingSide, { color: palette.ink }]}>
          {side} · {line.accountName}
        </Text>
        <Text style={[styles.postingAmount, { color: palette.ink }]}>
          {line.amount}
        </Text>
      </View>
      {line.detail ? (
        <Text style={[styles.postingDetail, { color: palette.inkMuted }]} numberOfLines={1}>
          {line.detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
  },
  cardDate: {
    fontSize: 12,
    textAlign: "right",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  cardHeaderRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptySummary: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  kindIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
    flexShrink: 0,
  },
  list: {
    gap: 12,
    padding: 18,
    paddingBottom: 32,
  },
  listWide: {
    paddingHorizontal: 24,
  },
  postingAmount: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 0,
  },
  postingDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  postingDivider: {
    height: StyleSheet.hairlineWidth,
  },
  postingLine: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postingLineTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  postingSide: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 0,
  },
  postingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sectionHeaderWide: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  summaryCol: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  summaryRow: {
    borderTopColor: "rgba(0, 32, 69, 0.06)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingTop: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
  },
});
