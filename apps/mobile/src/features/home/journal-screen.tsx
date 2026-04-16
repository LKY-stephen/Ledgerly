import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
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

  const debitHeader = journalCopy.debit;
  const creditHeader = journalCopy.credit;

  const renderItem = useCallback(
    ({ item }: { item: GeneralLedgerEntry }) => {
      const debitLine = item.lines.find((l) => l.side === "debit");
      const creditLine = item.lines.find((l) => l.side === "credit");

      if (isExpanded) {
        return (
          <View style={[styles.tableRow, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.cellDate, { color: palette.inkMuted }]} numberOfLines={1}>
              {item.dateLabel}
            </Text>
            <Text style={[styles.cellDescription, { color: palette.ink }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cellAccount, { color: palette.inkMuted }]} numberOfLines={1}>
              {debitLine?.accountName ?? ""}
            </Text>
            <Text style={[styles.cellAmount, { color: palette.ink }]} numberOfLines={1}>
              {debitLine?.amount ?? ""}
            </Text>
            <Text style={[styles.cellAccount, { color: palette.inkMuted }]} numberOfLines={1}>
              {creditLine?.accountName ?? ""}
            </Text>
            <Text style={[styles.cellAmount, { color: palette.ink }]} numberOfLines={1}>
              {creditLine?.amount ?? ""}
            </Text>
          </View>
        );
      }

      return (
        <View style={[styles.mobileCard, { backgroundColor: palette.shellElevated, borderColor: palette.border }]}>
          <View style={styles.mobileCardHeader}>
            <Text style={[styles.mobileDate, { color: palette.inkMuted }]}>{item.dateLabel}</Text>
            <Text style={[styles.mobileKind, { color: palette.accent }]}>{item.kindLabel}</Text>
          </View>
          <Text style={[styles.mobileTitle, { color: palette.ink }]}>{item.title}</Text>
          <View style={styles.mobilePostings}>
            {debitLine ? (
              <PostingRow label={debitHeader} line={debitLine} palette={palette} />
            ) : null}
            {creditLine ? (
              <PostingRow label={creditHeader} line={creditLine} palette={palette} />
            ) : null}
          </View>
        </View>
      );
    },
    [isExpanded, palette, debitHeader, creditHeader],
  );

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

      <View style={[styles.headerBlock, isExpanded && styles.headerBlockWide]}>
        <Text style={[styles.pageTitle, { color: palette.ink }]}>{journalCopy.title}</Text>
        <Text style={[styles.pageSubtitle, { color: palette.inkMuted }]}>{journalCopy.subtitle}</Text>
      </View>

      {isLoaded && entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.ink }]}>{journalCopy.emptyTitle}</Text>
          <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>{journalCopy.emptySummary}</Text>
        </View>
      ) : isExpanded ? (
        <View style={styles.tableContainer}>
          <View style={[styles.tableHeader, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.cellDate, styles.headerCell, { color: palette.inkMuted }]}>
              {journalCopy.date}
            </Text>
            <Text style={[styles.cellDescription, styles.headerCell, { color: palette.inkMuted }]}>
              {journalCopy.description}
            </Text>
            <Text style={[styles.cellAccount, styles.headerCell, { color: palette.inkMuted }]}>
              {debitHeader} - {journalCopy.account}
            </Text>
            <Text style={[styles.cellAmount, styles.headerCell, { color: palette.inkMuted }]}>
              {debitHeader} - {journalCopy.amount}
            </Text>
            <Text style={[styles.cellAccount, styles.headerCell, { color: palette.inkMuted }]}>
              {creditHeader} - {journalCopy.account}
            </Text>
            <Text style={[styles.cellAmount, styles.headerCell, { color: palette.inkMuted }]}>
              {creditHeader} - {journalCopy.amount}
            </Text>
          </View>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.mobileList}
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

function PostingRow({
  label,
  line,
  palette,
}: {
  label: string;
  line: GeneralLedgerPostingLine;
  palette: { ink: string; inkMuted: string };
}) {
  return (
    <View style={styles.mobilePosting}>
      <Text style={[styles.mobilePostingLabel, { color: palette.inkMuted }]}>{label}</Text>
      <Text style={[styles.mobilePostingAccount, { color: palette.inkMuted }]}>{line.accountName}</Text>
      <Text style={[styles.mobilePostingAmount, { color: palette.ink }]}>{line.amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  cellAccount: {
    flex: 2,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  cellAmount: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 12,
    textAlign: "right",
  },
  cellDate: {
    flex: 1.2,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  cellDescription: {
    flex: 2.5,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 12,
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
  headerBlock: {
    gap: 4,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerBlockWide: {
    paddingHorizontal: 24,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  mobileCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  mobileCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mobileDate: {
    fontSize: 12,
  },
  mobileKind: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  mobileList: {
    gap: 10,
    padding: 18,
    paddingBottom: 32,
  },
  mobilePosting: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  mobilePostingAccount: {
    flex: 1,
    fontSize: 13,
  },
  mobilePostingAmount: {
    fontSize: 13,
    fontWeight: "600",
  },
  mobilePostingLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    width: 40,
  },
  mobilePostings: {
    borderTopColor: "rgba(0, 32, 69, 0.06)",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 8,
  },
  mobileTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  safeArea: {
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tableHeader: {
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  tableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
});
