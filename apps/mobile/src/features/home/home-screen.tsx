import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
    (point) => point.incomeCents > 0 || point.expenseCents > 0,
  );
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(
    null,
  );

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);
  const chartPeak = Math.max(
    ...snapshot.trend.flatMap((point) => [
      point.incomeCents,
      point.expenseCents,
    ]),
    1,
  );
  const defaultTrendDate = useMemo(() => {
    const latestWithActivity = [...snapshot.trend]
      .reverse()
      .find((point) => point.incomeCents > 0 || point.expenseCents > 0);

    return (
      latestWithActivity?.date ??
      snapshot.trend[snapshot.trend.length - 1]?.date ??
      null
    );
  }, [snapshot.trend]);
  const selectedTrendPoint = useMemo(
    () =>
      snapshot.trend.find((point) => point.date === selectedTrendDate) ??
      snapshot.trend.find((point) => point.date === defaultTrendDate) ??
      snapshot.trend[snapshot.trend.length - 1] ??
      null,
    [defaultTrendDate, selectedTrendDate, snapshot.trend],
  );

  useEffect(() => {
    if (!snapshot.trend.length) {
      if (selectedTrendDate !== null) {
        setSelectedTrendDate(null);
      }
      return;
    }

    if (
      !selectedTrendDate ||
      !snapshot.trend.some((point) => point.date === selectedTrendDate)
    ) {
      setSelectedTrendDate(defaultTrendDate);
    }
  }, [defaultTrendDate, selectedTrendDate, snapshot.trend]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl onRefresh={refresh} refreshing={isRefreshing} />
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
          <Pressable
            accessibilityLabel={screenCopy.notificationsLabel}
            accessibilityRole="button"
            onPress={() => router.push("/discover")}
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
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderCopy}>
              <Text
                style={[styles.heroTitle, { color: "rgba(0, 32, 69, 0.6)" }]}
              >
                {screenCopy.monthlyProfit}
              </Text>
              <Text style={[styles.heroAmount, { color: "#002045" }]}>
                {netLabel}
              </Text>
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
                <Text style={styles.heroActionLabel}>
                  {screenCopy.newRecords}
                </Text>
              </View>
            </Pressable>
          </View>

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
            <View style={styles.trendPanel}>
              {selectedTrendPoint ? (
                <View style={styles.trendTooltip}>
                  <View style={styles.trendTooltipHeader}>
                    <Text style={styles.trendTooltipDate}>
                      {formatDisplayDate(
                        selectedTrendPoint.date,
                        resolvedLocale,
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.trendTooltipNet,
                        selectedTrendPoint.netCents >= 0
                          ? styles.trendTooltipNetPositive
                          : styles.trendTooltipNetNegative,
                      ]}
                    >
                      {screenCopy.net}:{" "}
                      {formatSignedCurrencyFromCents(
                        selectedTrendPoint.netCents,
                      )}
                    </Text>
                  </View>
                  <View style={styles.trendTooltipMetrics}>
                    <View style={styles.trendTooltipMetric}>
                      <Text style={styles.trendTooltipMetricLabel}>
                        {screenCopy.income}
                      </Text>
                      <Text
                        style={[
                          styles.trendTooltipMetricValue,
                          styles.trendTooltipMetricIncome,
                        ]}
                      >
                        {formatCurrencyFromCents(
                          selectedTrendPoint.incomeCents,
                        )}
                      </Text>
                    </View>
                    <View style={styles.trendTooltipMetric}>
                      <Text style={styles.trendTooltipMetricLabel}>
                        {screenCopy.outflow}
                      </Text>
                      <Text
                        style={[
                          styles.trendTooltipMetricValue,
                          styles.trendTooltipMetricExpense,
                        ]}
                      >
                        {formatCurrencyFromCents(
                          selectedTrendPoint.expenseCents,
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

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
                  contentContainerStyle={styles.chartScrollContent}
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
                        isSelected={bar.date === selectedTrendPoint?.date}
                        onPress={() => setSelectedTrendDate(bar.date)}
                        peak={chartPeak}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
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
                const accent = income ? "#45664A" : "#BA1A1A";
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
                      <Text style={styles.activityAmount}>
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
  isSelected,
  onPress,
  peak,
}: {
  bar: HomeTrendPoint;
  isAnchor: boolean;
  isSelected: boolean;
  onPress: () => void;
  peak: number;
}) {
  const chartHeight = 148;
  const incomeHeight =
    peak > 0 && bar.incomeCents > 0
      ? Math.max(12, Math.round((bar.incomeCents / peak) * chartHeight))
      : 0;
  const expenseHeight =
    peak > 0 && bar.expenseCents > 0
      ? Math.max(12, Math.round((bar.expenseCents / peak) * chartHeight))
      : 0;
  const hasIncome = bar.incomeCents > 0;
  const hasExpense = bar.expenseCents > 0;
  const hasActivity = hasIncome || hasExpense;

  return (
    <Pressable
      accessibilityLabel={bar.date}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.barColumn,
        isSelected ? styles.barColumnSelected : null,
        pressed ? styles.barColumnPressed : null,
      ]}
    >
      <View style={styles.barTrack}>
        {hasActivity ? (
          <View style={styles.barGroup}>
            {hasIncome ? (
              <View
                style={[styles.bar, styles.barIncome, { height: incomeHeight }]}
              />
            ) : null}
            {hasExpense ? (
              <View
                style={[
                  styles.bar,
                  styles.barExpense,
                  { height: expenseHeight },
                ]}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.barZeroLine} />
        )}
      </View>
      <Text
        style={[
          styles.barLabel,
          { opacity: isAnchor || isSelected ? 1 : 0.35 },
        ]}
      >
        {isAnchor || isSelected ? bar.label : "·"}
      </Text>
    </Pressable>
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

function formatSignedCurrencyFromCents(amountCents: number): string {
  if (amountCents === 0) {
    return formatCurrencyFromCents(0);
  }

  return `${amountCents > 0 ? "+" : "-"}${formatCurrencyFromCents(Math.abs(amountCents))}`;
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
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 22,
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
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  activityItemTitle: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
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
    fontSize: 12,
    lineHeight: 17,
  },
  activityTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
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
  barColumnPressed: {
    opacity: 0.8,
  },
  barColumn: {
    alignItems: "center",
    borderRadius: 16,
    gap: 8,
    justifyContent: "flex-end",
    paddingHorizontal: 4,
    paddingVertical: 6,
    width: 28,
  },
  barColumnSelected: {
    backgroundColor: "rgba(0, 32, 69, 0.05)",
  },
  barExpense: {
    backgroundColor: "#C94B4B",
  },
  barGroup: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    width: "100%",
  },
  barIncome: {
    backgroundColor: "#3F7A4D",
  },
  barLabel: {
    color: "#74777F",
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 12,
    textAlign: "center",
    width: 36,
  },
  barRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    minHeight: 188,
    paddingBottom: 8,
  },
  barTrack: {
    alignItems: "center",
    height: 148,
    justifyContent: "flex-end",
    width: "100%",
  },
  barZeroLine: {
    backgroundColor: "#D6DBE3",
    borderRadius: 999,
    height: 3,
    width: 14,
  },
  brand: {
    fontSize: 18,
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
  chartScrollContent: {
    paddingRight: 12,
  },
  chartShell: {
    flexDirection: "row",
    minHeight: 204,
  },
  container: {
    backgroundColor: "#F5F6F8",
    gap: 16,
    paddingBottom: 140,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    minWidth: 118,
    paddingHorizontal: 14,
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
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  heroBlock: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  heroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  heroHeaderCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 12,
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
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    gap: 10,
  },
  metricValue: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  notificationButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 36,
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
    borderRadius: 22,
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
    color: "#74777F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  profitTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  trendPanel: {
    gap: 12,
  },
  trendTooltip: {
    backgroundColor: "#F7F8FA",
    borderColor: "rgba(0, 32, 69, 0.06)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  trendTooltipDate: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  trendEmptyCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  trendEmptyIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0, 32, 69, 0.06)",
    borderRadius: 18,
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
  trendTooltipHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trendTooltipMetric: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trendTooltipMetricExpense: {
    color: "#BA1A1A",
  },
  trendTooltipMetricIncome: {
    color: "#3F7A4D",
  },
  trendTooltipMetricLabel: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  trendTooltipMetrics: {
    flexDirection: "row",
    gap: 10,
  },
  trendTooltipMetricValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  trendTooltipNet: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  trendTooltipNetNegative: {
    color: "#BA1A1A",
  },
  trendTooltipNetPositive: {
    color: "#3F7A4D",
  },
  trendEmptySummary: {
    color: "#74777F",
    fontSize: 13,
    lineHeight: 18,
  },
  trendEmptyTitle: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  safeArea: {
    backgroundColor: "#F5F6F8",
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
    marginBottom: 2,
  },
});
