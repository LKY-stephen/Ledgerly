import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "../../components/app-icon";
import { CfoAvatar } from "../../components/cfo-avatar";
import {
  formatCurrencyFromCents,
  formatDisplayDate,
  type HomeTrendPoint,
} from "../ledger/ledger-domain";
import { useHomeScreenData } from "./use-home-screen-data";
import { useAppShell } from "../app-shell/provider";

function ActivityIcon({ color, icon }: { color: string; icon: string }) {
  if (icon === "cash-plus") {
    return <MaterialCommunityIcons color={color} name="cash-plus" size={18} />;
  }

  return <Ionicons color={color} name={icon as React.ComponentProps<typeof Ionicons>["name"]} size={18} />;
}

export function HomeScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const { error, isLoaded, isLoadingMore, isRefreshing, loadMore, refresh, snapshot } = useHomeScreenData();

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);
  const chartPeak = Math.max(...snapshot.trend.map((point) => point.amountCents), 1);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={isRefreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <CfoAvatar />
            <Text style={[styles.brand, { color: palette.ink }]}>{copy.common.appName}</Text>
          </View>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.notificationButton,
              { backgroundColor: pressed ? "#ECECE8" : "#F4F4F2" },
            ]}
          >
            <Ionicons color="#002045" name="notifications-outline" size={18} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        <View style={styles.heroBlock}>
          <Text style={[styles.heroTitle, { color: "rgba(0, 32, 69, 0.6)" }]}>Monthly Profit</Text>
          <Text style={[styles.heroAmount, { color: "#002045" }]}>{netLabel}</Text>

          <View style={styles.metricStrip}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Income</Text>
              <Text style={styles.metricValue}>{incomeLabel}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Outflow</Text>
              <Text style={styles.metricValue}>{outflowLabel}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Net</Text>
              <Text style={styles.metricValue}>{netLabel}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/ledger/upload")}
            style={({ pressed }) => [
              styles.heroAction,
              {
                backgroundColor: pressed ? "#173761" : "#002045",
              },
            ]}
          >
            <View style={styles.heroActionContent}>
              <AppIcon color="#FFFFFF" name="add" size={11} />
              <Text style={styles.heroActionLabel}>New Records</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.profitCard}>
          <View style={styles.profitHeader}>
            <View>
              <Text style={styles.profitTitle}>30-Day Income Trend</Text>
              <Text style={styles.profitSubtitle}>Pulled from local SQLite records</Text>
            </View>
          </View>

          <View style={styles.chartShell}>
            <View style={styles.chartAxis}>
              <Text style={styles.axisLabel}>{formatCompactCurrency(chartPeak)}</Text>
              <Text style={styles.axisLabel}>{formatCompactCurrency(Math.round(chartPeak / 2))}</Text>
              <Text style={styles.axisLabel}>$0</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
              <View style={styles.barRow}>
                {snapshot.trend.map((bar, index) => (
                  <TrendBar
                    key={bar.date}
                    bar={bar}
                    isAnchor={index % 5 === 0 || index === snapshot.trend.length - 1}
                    peak={chartPeak}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <View style={styles.activityHeaderCopy}>
              <Text style={styles.activityTitle}>Recent Activity</Text>
              <Text style={styles.activitySubtitle}>Newest records synced from the local ledger</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/ledger")}>
              <Text style={styles.seeAllLink}>See All</Text>
            </Pressable>
          </View>

          <View style={styles.activityCard}>
            {snapshot.recentRecords.length === 0 ? (
              <View style={styles.emptyCardState}>
                <Text style={styles.emptyCardTitle}>{isLoaded ? "No records yet" : "Loading records..."}</Text>
                <Text style={styles.emptyCardSummary}>
                  Upload and confirm a receipt to populate Home with real totals and activity.
                </Text>
              </View>
            ) : (
              snapshot.recentRecords.map((item, index) => {
                const income = item.recordKind === "income";
                const accent = income ? "#45664A" : "#BA1A1A";
                const icon = income ? "cash-plus" : item.recordKind === "expense" ? "receipt-outline" : "wallet-outline";

                return (
                  <View key={item.recordId} style={[styles.activityRow, index > 0 ? styles.activityRowBorder : null]}>
                    <View style={styles.activityLeft}>
                      <View
                        style={[
                          styles.activityIconWrap,
                          { backgroundColor: income ? "#C3E9C5" : "rgba(255, 218, 214, 0.3)" },
                        ]}
                      >
                        <ActivityIcon color={accent} icon={icon} />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text style={styles.activityItemTitle}>{item.description}</Text>
                        <Text style={[styles.activityItemType, { color: accent }]}>
                          {income ? item.sourceLabel : item.targetLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={styles.activityAmount}>
                        {income ? "+" : "-"}
                        {formatCurrencyFromCents(item.amountCents)}
                      </Text>
                      <Text style={styles.activityDate}>{formatDisplayDate(item.occurredOn)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          {snapshot.hasMore ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => loadMore()}
              style={({ pressed }) => [
                styles.loadMoreButton,
                { backgroundColor: pressed ? "#ECECE8" : "#F4F4F2" },
              ]}
            >
              <Text style={styles.loadMoreLabel}>{isLoadingMore ? "Loading..." : "Load More"}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrendBar({
  bar,
  isAnchor,
  peak,
}: {
  bar: HomeTrendPoint;
  isAnchor: boolean;
  peak: number;
}) {
  const height = Math.max(14, Math.round((bar.amountCents / peak) * 148));

  return (
    <View style={styles.barColumn}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: bar.amountCents > 0 ? "#002045" : "#E4E6EA",
            height,
          },
        ]}
      />
      <Text style={[styles.barLabel, { opacity: isAnchor ? 1 : 0.25 }]}>{isAnchor ? bar.label : "·"}</Text>
    </View>
  );
}

function formatCompactCurrency(amountCents: number): string {
  if (amountCents <= 0) {
    return "$0";
  }

  const amount = amountCents / 100;

  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }

  return `$${Math.round(amount)}`;
}

const styles = StyleSheet.create({
  activityAmount: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "right",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(196, 198, 207, 0.1)",
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityCopy: {
    flex: 1,
    gap: 3,
  },
  activityDate: {
    color: "#74777F",
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    textAlign: "right",
  },
  activityHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activityHeaderCopy: {
    gap: 4,
  },
  activityIconWrap: {
    alignItems: "center",
    borderRadius: 20,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  activityItemTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  activityItemType: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  activityLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  activityRight: {
    gap: 4,
    marginLeft: 12,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  activityRowBorder: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  activitySection: {
    gap: 14,
  },
  activitySubtitle: {
    color: "#74777F",
    fontSize: 13,
    lineHeight: 18,
  },
  activityTitle: {
    color: "#002045",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  axisLabel: {
    color: "#74777F",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 16,
  },
  bar: {
    borderRadius: 999,
    width: 6,
  },
  barColumn: {
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
    width: 12,
  },
  barLabel: {
    color: "#74777F",
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 12,
    transform: [{ rotate: "-45deg" }],
    width: 34,
  },
  barRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    minHeight: 188,
    paddingBottom: 8,
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
  chartAxis: {
    justifyContent: "space-between",
    minHeight: 188,
    paddingBottom: 28,
    paddingRight: 12,
  },
  chartScroll: {
    flex: 1,
  },
  chartShell: {
    flexDirection: "row",
    minHeight: 204,
  },
  container: {
    backgroundColor: "#F9F9F7",
    gap: 18,
    paddingBottom: 140,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyCardState: {
    gap: 8,
    padding: 24,
  },
  emptyCardSummary: {
    color: "#74777F",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCardTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "700",
  },
  heroAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    marginTop: 8,
    minWidth: 144,
    paddingHorizontal: 18,
  },
  heroActionContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  heroActionLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  heroBlock: {
    gap: 10,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inlineError: {
    color: "#BA1A1A",
    fontSize: 14,
    lineHeight: 20,
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
  },
  loadMoreLabel: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
  },
  metricItem: {
    gap: 4,
    minWidth: 86,
  },
  metricLabel: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricStrip: {
    flexDirection: "row",
    gap: 18,
    marginTop: 2,
  },
  metricValue: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  notificationButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    position: "relative",
    width: 38,
  },
  notificationDot: {
    backgroundColor: "#BA1A1A",
    borderRadius: 999,
    height: 7,
    position: "absolute",
    right: 10,
    top: 10,
    width: 7,
  },
  profitCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(196, 198, 207, 0.18)",
    borderRadius: 32,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  profitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profitSubtitle: {
    color: "#74777F",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  profitTitle: {
    color: "#002045",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  safeArea: {
    backgroundColor: "#F9F9F7",
    flex: 1,
  },
  seeAllLink: {
    color: "#002045",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
