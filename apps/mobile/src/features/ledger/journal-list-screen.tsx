import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { useAppShell } from "../app-shell/provider";
import { getButtonColors, withAlpha } from "../app-shell/theme-utils";
import { formatCurrencyFromCents, formatDisplayDate } from "./ledger-domain";
import { useJournalListScreen } from "./use-journal-list-screen";

function ActivityIcon({ color, icon }: { color: string; icon: string }) {
  if (icon === "cash-plus") {
    return <MaterialCommunityIcons color={color} name="cash-plus" size={18} />;
  }

  return (
    <Ionicons
      color={color}
      name={icon as React.ComponentProps<typeof Ionicons>["name"]}
      size={18}
    />
  );
}

export function JournalListScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");
  const {
    error,
    isLoaded,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    snapshot,
  } = useJournalListScreen();
  const journalCopy = copy.ledgerScreen.journalList;
  const homeCopy = copy.homeScreen;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="journal-list-screen"
    >
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: palette.shell,
            borderBottomColor: palette.divider,
          },
        ]}
      >
        <BackHeaderBar
          onBack={() => router.back()}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: palette.shell }]}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl onRefresh={refresh} refreshing={isRefreshing} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: palette.paper, borderColor: palette.border }]}>
          <Text style={[styles.heroEyebrow, { color: palette.inkMuted }]}>{journalCopy.eyebrow}</Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>{journalCopy.title}</Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>{journalCopy.summary}</Text>
        </View>

        <View style={[styles.listCard, { backgroundColor: palette.paper, borderColor: palette.border }]}>
          {!isLoaded ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>{journalCopy.loadingTitle}</Text>
              <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>{journalCopy.loadingSummary}</Text>
            </View>
          ) : snapshot.records.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>{journalCopy.emptyTitle}</Text>
              <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>{journalCopy.emptySummary}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/ledger/upload")}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  {
                    backgroundColor: pressed
                      ? primaryButton.pressedBackground
                      : primaryButton.background,
                  },
                ]}
              >
                <Text style={[styles.secondaryActionLabel, { color: primaryButton.text }]}>{homeCopy.newRecords}</Text>
              </Pressable>
            </View>
          ) : (
            snapshot.records.map((item, index) => {
              const income =
                item.recordKind === "income" ||
                item.recordKind === "non_business_income";
              const accent = income
                ? palette.success
                : item.recordKind === "personal_spending"
                  ? palette.accent
                  : palette.destructive;
              const icon = income
                ? "cash-plus"
                : item.recordKind === "expense"
                  ? "receipt-outline"
                  : "wallet-outline";

              return (
                <View
                  key={item.recordId}
                  style={[
                    styles.activityRow,
                    index > 0 ? [styles.activityRowBorder, { borderTopColor: palette.divider }] : null,
                  ]}
                >
                  <View style={styles.activityLeft}>
                    <View
                      style={[
                        styles.activityIconWrap,
                        {
                          backgroundColor: income
                            ? withAlpha(palette.success, palette.name === "dark" ? 0.2 : 0.16)
                            : item.recordKind === "personal_spending"
                              ? withAlpha(palette.accent, palette.name === "dark" ? 0.18 : 0.12)
                              : withAlpha(palette.destructive, palette.name === "dark" ? 0.2 : 0.14),
                        },
                      ]}
                    >
                      <ActivityIcon color={accent} icon={icon} />
                    </View>
                    <View style={styles.activityCopy}>
                      <Text numberOfLines={2} style={[styles.activityItemTitle, { color: palette.ink }]}>
                        {item.description}
                      </Text>
                      <Text numberOfLines={1} style={[styles.activityItemType, { color: accent }]}>
                        {income ? item.sourceLabel : item.targetLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activityRight}>
                    <Text
                      style={[styles.activityAmount, { color: accent }]}
                    >
                      {income ? "+" : "-"}
                      {formatCurrencyFromCents(item.amountCents)}
                    </Text>
                    <Text style={[styles.activityDate, { color: palette.inkMuted }]}>
                      {formatDisplayDate(item.occurredOn, resolvedLocale)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {error ? <Text style={[styles.inlineError, { color: palette.destructive }]}>{error}</Text> : null}

        {snapshot.hasMore ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => loadMore()}
            style={({ pressed }) => [
              styles.loadMoreButton,
              {
                backgroundColor: pressed ? palette.shellMuted : palette.paperMuted,
              },
            ]}
            testID="journal-list-load-more-button"
          >
            <Text style={[styles.loadMoreLabel, { color: palette.ink }]}>
              {isLoadingMore ? homeCopy.loadingMore : homeCopy.loadMore}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activityAmount: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  appBar: {
    borderBottomWidth: 2,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  activityAmountExpense: {
    color: "#BA1A1A",
  },
  activityAmountIncome: {
    color: "#45664A",
  },
  activityAmountPersonal: {
    color: "#8A4B14",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
  },
  activityCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  activityDate: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 12,
    fontWeight: "500",
  },
  activityIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  activityItemTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  activityItemType: {
    fontSize: 12,
    fontWeight: "800",
  },
  activityLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  activityRowBorder: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: 2,
  },
  container: {
    backgroundColor: "#F9F9F7",
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  emptyState: {
    alignItems: "flex-start",
    gap: 8,
    padding: 20,
  },
  emptySummary: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 20,
  },
  heroEyebrow: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroSummary: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 14,
    lineHeight: 20,
  },
  heroTitle: {
    color: "#002045",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  inlineError: {
    color: "#BA1A1A",
    fontSize: 13,
    lineHeight: 19,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: "#F4F4F2",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  loadMoreButtonPressed: {
    backgroundColor: "#ECECE8",
  },
  loadMoreLabel: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#F9F9F7",
    flex: 1,
  },
  secondaryActionButton: {
    alignItems: "center",
    backgroundColor: "#F4F4F2",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryActionButtonPressed: {
    opacity: 0.82,
  },
  secondaryActionLabel: {
    color: "#002045",
    fontSize: 13,
    fontWeight: "800",
  },
});
