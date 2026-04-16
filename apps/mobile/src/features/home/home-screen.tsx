import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "../../components/app-icon";
import { CfoAvatar } from "../../components/cfo-avatar";
import {
  beginDemoAutoplayStep,
  isUploadParsePersistDemoEnabled,
} from "../demo/demo-autoplay";
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

  return (
    <Ionicons
      color={color}
      name={icon as React.ComponentProps<typeof Ionicons>["name"]}
      size={18}
    />
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const {
    error,
    isLoaded,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    snapshot,
  } = useHomeScreenData();
  const screenCopy = copy.homeScreen;
  const hasTrendActivity = snapshot.trend.some(
    (point) => point.amountCents > 0,
  );

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);
  const chartPeak = Math.max(
    ...snapshot.trend.map((point) => point.amountCents),
    1,
  );

  useEffect(() => {
    if (!isLoaded || !isUploadParsePersistDemoEnabled()) {
      return;
    }

    if (!beginDemoAutoplayStep("home")) {
      return;
    }

    const timeout = setTimeout(() => {
      router.push("/ledger/upload");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isLoaded, router]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={styles.safeArea}
      testID="home-screen"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl onRefresh={refresh} refreshing={isRefreshing} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <CfoAvatar />
            <Text style={[styles.brand, { color: palette.ink }]}>
              {copy.common.appName}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {Platform.OS === "web" ? (
              <Pressable
                accessibilityLabel="Refresh"
                accessibilityRole="button"
                onPress={refresh}
                style={({ pressed }) => [
                  styles.notificationButton,
                  {
                    backgroundColor: pressed ? "#ECECE8" : "#F4F4F2",
                    opacity: isRefreshing ? 0.5 : 1,
                  },
                ]}
              >
                <Ionicons color="#002045" name="refresh-outline" size={18} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={screenCopy.notificationsLabel}
              accessibilityRole="button"
              onPress={() => router.push("/discover")}
              style={({ pressed }) => [
                styles.notificationButton,
                { backgroundColor: pressed ? "#ECECE8" : "#F4F4F2" },
              ]}
              testID="home-notifications-button"
            >
              <Ionicons
                color="#002045"
                name="notifications-outline"
                size={18}
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Text style={[styles.heroTitle, { color: "rgba(0, 32, 69, 0.6)" }]}>
            {screenCopy.monthlyProfit}
          </Text>
          <Text style={[styles.heroAmount, { color: "#002045" }]}>
            {netLabel}
          </Text>

          <View style={styles.metricStrip}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{screenCopy.income}</Text>
              <Text style={styles.metricValue}>{incomeLabel}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{screenCopy.outflow}</Text>
              <Text style={styles.metricValue}>{outflowLabel}</Text>
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
            testID="home-new-records-button"
          >
            <View style={styles.heroActionContent}>
              <AppIcon color="#FFFFFF" name="add" size={11} />
              <Text style={styles.heroActionLabel}>
                {screenCopy.newRecords}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.profitCard}>
          <View style={styles.profitHeader}>
            <View>
              <Text style={styles.profitTitle}>{screenCopy.trendTitle}</Text>
              <Text style={styles.profitSubtitle}>
                {screenCopy.trendSubtitle}
              </Text>
            </View>
          </View>

          {hasTrendActivity ? (
            <View style={styles.chartShell}>
              <View style={styles.chartAxis}>
                <Text style={styles.axisLabel}>
                  {formatCompactCurrency(chartPeak)}
                </Text>
                <Text style={styles.axisLabel}>
                  {formatCompactCurrency(Math.round(chartPeak / 2))}
                </Text>
                <Text style={styles.axisLabel}>$0</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chartScroll}
              >
                <View style={styles.barRow}>
                  {snapshot.trend.map((bar, index) => (
                    <TrendBar
                      key={bar.date}
                      bar={bar}
                      isAnchor={
                        index % 5 === 0 || index === snapshot.trend.length - 1
                      }
                      peak={chartPeak}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.trendEmptyState}>
              <View style={styles.trendEmptyIconWrap}>
                <Ionicons color="#002045" name="bar-chart-outline" size={18} />
              </View>
              <View style={styles.trendEmptyCopy}>
                <Text style={styles.trendEmptyTitle}>
                  {screenCopy.trendEmptyTitle}
                </Text>
                <Text style={styles.trendEmptySummary}>
                  {screenCopy.trendEmptySummary}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/ledger/upload")}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  pressed ? styles.secondaryActionButtonPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>
                  {screenCopy.newRecords}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <View style={styles.activityHeaderCopy}>
              <Text style={styles.activityTitle}>
                {screenCopy.recentActivityTitle}
              </Text>
              <Text style={styles.activitySubtitle}>
                {screenCopy.recentActivitySubtitle}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/ledger")}
            >
              <Text style={styles.seeAllLink}>{screenCopy.seeAll}</Text>
            </Pressable>
          </View>

          <View style={styles.activityCard}>
            {snapshot.recentRecords.length === 0 ? (
              <View style={styles.emptyCardState}>
                <Text style={styles.emptyCardTitle}>
                  {isLoaded ? screenCopy.emptyTitle : screenCopy.loadingTitle}
                </Text>
                <Text style={styles.emptyCardSummary}>
                  {screenCopy.emptySummary}
                </Text>
                {isLoaded ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/ledger/upload")}
                    style={({ pressed }) => [
                      styles.secondaryActionButton,
                      pressed ? styles.secondaryActionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryActionLabel}>
                      {screenCopy.newRecords}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              snapshot.recentRecords.map((item, index) => {
                const income = item.recordKind === "income";
                const accent = income
                  ? "#45664A"
                  : item.recordKind === "personal_spending"
                    ? "#8A4B14"
                    : "#BA1A1A";
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
                      index > 0 ? styles.activityRowBorder : null,
                    ]}
                  >
                    <View style={styles.activityLeft}>
                      <View
                        style={[
                          styles.activityIconWrap,
                          {
                            backgroundColor: income
                              ? "#C3E9C5"
                              : "rgba(255, 218, 214, 0.3)",
                          },
                        ]}
                      >
                        <ActivityIcon color={accent} icon={icon} />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text
                          numberOfLines={2}
                          style={styles.activityItemTitle}
                        >
                          {item.description}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.activityItemType, { color: accent }]}
                        >
                          {income ? item.sourceLabel : item.targetLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <Text
                        style={[
                          styles.activityAmount,
                          income
                            ? styles.activityAmountIncome
                            : item.recordKind === "personal_spending"
                              ? styles.activityAmountPersonal
                              : styles.activityAmountExpense,
                        ]}
                      >
                        {income ? "+" : "-"}
                        {formatCurrencyFromCents(item.amountCents)}
                      </Text>
                      <Text style={styles.activityDate}>
                        {formatDisplayDate(item.occurredOn, resolvedLocale)}
                      </Text>
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
              <Text style={styles.loadMoreLabel}>
                {isLoadingMore ? screenCopy.loadingMore : screenCopy.loadMore}
              </Text>
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
  const height = Math.max(16, Math.round((bar.amountCents / peak) * 136));

  return (
    <View style={styles.barColumn}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: bar.amountCents > 0 ? "#45664A" : "#E8EBE5",
            height,
          },
        ]}
      />
      <Text style={[styles.barLabel, { opacity: isAnchor ? 1 : 0.25 }]}>
        {isAnchor ? bar.label : "·"}
      </Text>
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
    fontVariant: ["tabular-nums"],
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "right",
  },
  activityAmountExpense: {
    color: "#002045",
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  activityDate: {
    color: "rgba(0, 32, 69, 0.45)",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "right",
  },
  activityHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activityHeaderCopy: {
    flex: 1,
    gap: 4,
    marginRight: 12,
    minWidth: 0,
  },
  activityIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  activityItemTitle: {
    color: "#002045",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  activityItemType: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  activityLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  activityRight: {
    gap: 4,
    marginLeft: 12,
    maxWidth: "34%",
    minWidth: 88,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityRowBorder: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  activitySection: {
    gap: 12,
  },
  activitySubtitle: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    lineHeight: 17,
  },
  activityTitle: {
    color: "#002045",
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  axisLabel: {
    color: "rgba(0, 32, 69, 0.45)",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 16,
  },
  bar: {
    borderRadius: 999,
    width: 8,
  },
  barColumn: {
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    width: 14,
  },
  barLabel: {
    color: "rgba(0, 32, 69, 0.45)",
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 12,
    transform: [{ rotate: "-35deg" }],
    width: 30,
  },
  barRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 7,
    minHeight: 172,
    paddingBottom: 6,
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
    minHeight: 172,
    paddingBottom: 22,
    paddingRight: 10,
  },
  chartScroll: {
    flex: 1,
  },
  chartShell: {
    flexDirection: "row",
    minHeight: 184,
  },
  container: {
    backgroundColor: "#F9F9F7",
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  emptyCardState: {
    gap: 8,
    padding: 24,
  },
  emptyCardSummary: {
    color: "rgba(0, 32, 69, 0.55)",
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
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    minWidth: 136,
    paddingHorizontal: 16,
  },
  heroActionContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  heroActionLabel: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  heroAmount: {
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  heroBlock: {
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  heroTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  inlineError: {
    color: "#BA1A1A",
    fontSize: 14,
    lineHeight: 20,
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
  },
  loadMoreLabel: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
  },
  metricItem: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricLabel: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  metricStrip: {
    flexDirection: "row",
    gap: 10,
  },
  metricValue: {
    color: "#002045",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    lineHeight: 24,
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
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
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  profitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryActionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 32, 69, 0.06)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    marginTop: 6,
    minWidth: 116,
    paddingHorizontal: 16,
  },
  secondaryActionButtonPressed: {
    opacity: 0.8,
  },
  secondaryActionLabel: {
    color: "#002045",
    fontSize: 13,
    fontWeight: "700",
  },
  profitSubtitle: {
    color: "rgba(0, 32, 69, 0.55)",
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  profitTitle: {
    color: "#002045",
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  trendEmptyCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  trendEmptyIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0, 32, 69, 0.06)",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  trendEmptyState: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
  },
  trendEmptySummary: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    lineHeight: 17,
  },
  trendEmptyTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
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
