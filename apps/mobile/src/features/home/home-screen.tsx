import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useResponsive } from "../../hooks/use-responsive";
import {
  formatCurrencyFromCents,
  formatDisplayDate,
  type HomeTrendPoint,
} from "../ledger/ledger-domain";
import { useHomeScreenData } from "./use-home-screen-data";
import { useAppShell } from "../app-shell/provider";
import { getButtonColors, withAlpha } from "../app-shell/theme-utils";
import { AgentChat } from "../agent/agent-chat";
import { useAgentContext } from "../agent/agent-provider";
import { pickDocumentUploadCandidates } from "../ledger/ledger-runtime";
import {
  parseFileWithOpenAiFromBlob,
  type ParseResult,
} from "../ledger/remote-parse";
import { getReceiptParseRecords } from "@ledgerly/schemas";

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
  const { isExpanded } = useResponsive();
  const {
    error,
    isLoaded,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    snapshot,
  } = useHomeScreenData();
  const agent = useAgentContext();
  const [chatExpanded, setChatExpanded] = useState(false);
  const screenCopy = copy.homeScreen;

  const handleAttachFile = async () => {
    try {
      const candidates = await pickDocumentUploadCandidates();
      if (candidates.length === 0) return;

      const file = candidates[0];
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const result: ParseResult = await parseFileWithOpenAiFromBlob({
        fileName: file.originalFileName,
        blob,
        mimeType: file.mimeType,
      });

      if (result.error || !result.rawJson) {
        const errorText = result.error ?? "Failed to parse file.";
        await agent.sendMessage(
          `[Uploaded: ${file.originalFileName}]\nParse error: ${errorText}\nPlease try again or add the record manually.`,
        );
        return;
      }

      const records = getReceiptParseRecords(result.rawJson);
      const lines: string[] = [`[Uploaded: ${file.originalFileName}]`, "Parsed receipt data:"];

      for (const rec of records) {
        const f = rec.fields;
        if (f.amountCents != null) lines.push(`- Amount: $${(Math.abs(f.amountCents) / 100).toFixed(2)}`);
        if (f.target) lines.push(`- Vendor/Payee: ${f.target}`);
        if (f.source) lines.push(`- Payer/Source: ${f.source}`);
        if (f.date) lines.push(`- Date: ${f.date}`);
        if (f.description) lines.push(`- Description: ${f.description}`);
        if (f.category) lines.push(`- Category: ${f.category}`);
        if (f.taxCategory) lines.push(`- Tax category: ${f.taxCategory}`);
        if (f.notes) lines.push(`- Notes: ${f.notes}`);
        if (records.length > 1) lines.push("---");
      }

      lines.push("", "Please create this record or let me know if you'd like to adjust anything.");

      await agent.sendMessage(lines.join("\n"));
      await agent.refreshContext();
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed";
      await agent.sendMessage(`File upload error: ${msg}`);
    }
  };
  const primaryButton = getButtonColors(palette, "primary");
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(
    null,
  );
  const isAssistantInitializing = agent.isConfigured && !agent.isReady;
  const assistantCollapsedLabel = !agent.isConfigured
    ? resolvedLocale === "zh-CN"
      ? "配置 AI 助手"
      : "Set Up AI Assistant"
    : resolvedLocale === "zh-CN"
      ? "打开 AI 助手"
      : "Open AI Assistant";
  const assistantPromptTitle = isAssistantInitializing
    ? resolvedLocale === "zh-CN"
      ? "正在准备助手"
      : "Preparing Assistant"
    : resolvedLocale === "zh-CN"
      ? "未检测到 API Key"
      : "No API Key Found";
  const assistantPromptBody = isAssistantInitializing
    ? resolvedLocale === "zh-CN"
      ? "本地账本和 AI 会话正在初始化，几秒后就可以直接提问。"
      : "The local ledger and AI session are initializing. You can ask questions in a moment."
    : resolvedLocale === "zh-CN"
      ? "请在 .env 文件中填入至少一个 AI API Key（OpenAI / Infer / Gemini），然后重启应用即可使用助手。"
      : "Add at least one AI API key (OpenAI / Infer / Gemini) to your .env file, then restart the app to use the assistant.";

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);
  const chartPeak = Math.max(
    ...snapshot.trend.map((point) => point.amountCents),
    1,
  );
  const defaultTrendDate = useMemo(() => {
    const latestWithActivity = [...snapshot.trend]
      .reverse()
      .find((point) => point.amountCents > 0);

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
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: palette.shell }]}
        refreshControl={
          Platform.OS !== "web" ? <RefreshControl onRefresh={refresh} refreshing={isRefreshing} /> : undefined
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
                  { backgroundColor: pressed ? palette.shellMuted : palette.shell, opacity: isRefreshing ? 0.5 : 1 },
                ]}
              >
                <Ionicons color={palette.ink} name="refresh-outline" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ---------- Two-column body on expanded, single-column on compact ---------- */}
        <View style={isExpanded ? styles.wideBody : undefined}>
          <View style={isExpanded ? styles.wideLeft : undefined}>
            <View style={[styles.heroBlock, { backgroundColor: palette.shellElevated, borderColor: palette.divider }]}>
              <View style={styles.heroHeader}>
                <View style={styles.heroHeaderCopy}>
                  <Text
                    style={[styles.heroTitle, { color: palette.inkMuted }]}
                  >
                    {screenCopy.monthlyProfit}
                  </Text>
                  <Text style={[styles.heroAmount, { color: palette.ink }]}>
                    {netLabel}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/ledger/upload")}
                  style={({ pressed }) => [
                    styles.heroAction,
                    {
                      backgroundColor: pressed
                        ? primaryButton.pressedBackground
                        : primaryButton.background,
                    },
                  ]}
                >
                  <View style={styles.heroActionContent}>
                    <AppIcon color={primaryButton.text} name="add" size={11} />
                    <Text style={[styles.heroActionLabel, { color: primaryButton.text }]}>
                      {screenCopy.newRecords}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={styles.metricStrip}>
                <View style={[styles.metricItem, { backgroundColor: palette.shell }]}>
                  <Text style={[styles.metricLabel, { color: palette.inkMuted }]}>{screenCopy.income}</Text>
                  <Text style={[styles.metricValue, { color: palette.ink }]}>{incomeLabel}</Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: palette.shell }]}>
                  <Text style={[styles.metricLabel, { color: palette.inkMuted }]}>{screenCopy.outflow}</Text>
                  <Text style={[styles.metricValue, { color: palette.ink }]}>{outflowLabel}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.profitCard, isExpanded ? styles.wideGapTop : null, { backgroundColor: palette.shellElevated, borderColor: palette.divider }]}>
              <View style={styles.profitHeader}>
                <View>
                  <Text style={[styles.profitTitle, { color: palette.ink }]}>{screenCopy.trendTitle}</Text>
                  <Text style={[styles.profitSubtitle, { color: palette.inkMuted }]}>
                    {screenCopy.trendSubtitle}
                  </Text>
                </View>
              </View>

              <View style={styles.trendPanel}>
                  {selectedTrendPoint ? (
                    <View style={[styles.trendTooltip, { backgroundColor: palette.shell, borderColor: palette.divider }]}>
                      <View style={styles.trendTooltipHeader}>
                        <Text style={[styles.trendTooltipDate, { color: palette.ink }]}>
                          {formatDisplayDate(
                            selectedTrendPoint.date,
                            resolvedLocale,
                          )}
                        </Text>
                        <Text
                          style={[
                            styles.trendTooltipNet,
                            { color: palette.success },
                          ]}
                        >
                          {screenCopy.net}:{" "}
                          {formatSignedCurrencyFromCents(
                            selectedTrendPoint.amountCents,
                          )}
                        </Text>
                      </View>
                      <View style={styles.trendTooltipMetrics}>
                        <View style={[styles.trendTooltipMetric, { backgroundColor: palette.shellElevated }]}>
                          <Text style={[styles.trendTooltipMetricLabel, { color: palette.inkMuted }]}>
                            {screenCopy.income}
                          </Text>
                          <Text
                            style={[
                              styles.trendTooltipMetricValue,
                              { color: palette.success },
                            ]}
                          >
                            {formatCurrencyFromCents(
                              selectedTrendPoint.amountCents,
                            )}
                          </Text>
                        </View>
                        <View style={[styles.trendTooltipMetric, { backgroundColor: palette.shellElevated }]}>
                          <Text style={[styles.trendTooltipMetricLabel, { color: palette.inkMuted }]}>
                            {screenCopy.outflow}
                          </Text>
                          <Text
                            style={[
                              styles.trendTooltipMetricValue,
                              { color: palette.destructive },
                            ]}
                          >
                            {formatCurrencyFromCents(0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.chartShell}>
                    <View style={styles.chartAxis}>
                      <Text style={[styles.axisLabel, { color: palette.inkMuted }]}>
                        {formatCompactCurrency(chartPeak)}
                      </Text>
                      <Text style={[styles.axisLabel, { color: palette.inkMuted }]}>
                        {formatCompactCurrency(Math.round(chartPeak / 2))}
                      </Text>
                      <Text style={[styles.axisLabel, { color: palette.inkMuted }]}>$0</Text>
                    </View>
                    {Platform.OS === "web" ? (
                      <View
                        style={[
                          styles.chartScroll,
                          // @ts-expect-error: web-only CSS – overflowX lets content scroll horizontally without capturing vertical wheel events
                          { overflowX: "auto", overflowY: "hidden" },
                        ]}
                      >
                        <View style={[styles.barRow, styles.chartScrollContent]}>
                          {snapshot.trend.map((bar, index) => (
                            <TrendBar
                              key={bar.date}
                              bar={bar}
                              isAnchor={
                                index % 5 === 0 || index === snapshot.trend.length - 1
                              }
                              isSelected={bar.date === selectedTrendPoint?.date}
                              onPress={() => setSelectedTrendDate(bar.date)}
                              palette={palette}
                              peak={chartPeak}
                            />
                          ))}
                        </View>
                      </View>
                    ) : (
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
                              palette={palette}
                              peak={chartPeak}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                </View>
            </View>
          </View>

          <View style={[styles.activitySection, isExpanded ? styles.wideRight : null]}>
            <View style={styles.activityHeader}>
              <View style={styles.activityHeaderCopy}>
                <Text style={[styles.activityTitle, { color: palette.ink }]}>
                  {screenCopy.recentActivityTitle}
                </Text>
                <Text style={[styles.activitySubtitle, { color: palette.inkMuted }]}>
                  {screenCopy.recentActivitySubtitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/ledger/journals")}
              >
                <Text style={[styles.seeAllLink, { color: palette.accent }]}>{screenCopy.seeAll}</Text>
              </Pressable>
            </View>

            <View style={[styles.activityCard, { backgroundColor: palette.shellElevated, borderColor: palette.divider }]}>
              {snapshot.recentRecords.length === 0 ? (
                <View style={styles.emptyCardState}>
                  <Text style={[styles.emptyCardTitle, { color: palette.ink }]}>
                    {isLoaded ? screenCopy.emptyTitle : screenCopy.loadingTitle}
                  </Text>
                  <Text style={[styles.emptyCardSummary, { color: palette.inkMuted }]}>
                    {screenCopy.emptySummary}
                  </Text>
                  {isLoaded ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/ledger/upload")}
                      style={({ pressed }) => [
                        styles.secondaryActionButton,
                        { backgroundColor: pressed ? palette.shellMuted : palette.shell },
                      ]}
                    >
                      <Text style={[styles.secondaryActionLabel, { color: palette.ink }]}>
                        {screenCopy.newRecords}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                snapshot.recentRecords.map((item, index) => {
                  const income = item.recordKind === "income";
                  const accent = income ? palette.success : palette.destructive;
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
                                ? palette.accentSoft
                                : `${palette.destructive}20`,
                            },
                          ]}
                        >
                          <ActivityIcon color={accent} icon={icon} />
                        </View>
                        <View style={styles.activityCopy}>
                          <Text
                            numberOfLines={2}
                            style={[styles.activityItemTitle, { color: palette.ink }]}
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
                        <Text style={[styles.activityAmount, { color: palette.ink }]}>
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
              >
                <Text style={[styles.loadMoreLabel, { color: palette.ink }]}>
                  {isLoadingMore ? screenCopy.loadingMore : screenCopy.loadMore}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* ── Agent Chat Panel ── */}
      <View
        style={[
          chatExpanded ? styles.chatExpanded : styles.chatCollapsed,
          { backgroundColor: palette.paper, borderColor: palette.divider },
        ]}
      >
        {chatExpanded ? (
          <>
            <Pressable
              onPress={() => setChatExpanded(false)}
              style={[styles.chatToggle, { borderBottomColor: palette.divider }]}
            >
              <Ionicons name="chevron-down" size={18} color={palette.inkMuted} />
              <Text style={[styles.chatToggleLabel, { color: palette.ink }]}>
                {resolvedLocale === "zh-CN" ? "收起助手" : "Collapse Assistant"}
              </Text>
            </Pressable>
            {agent.isReady ? (
              <AgentChat
                messages={agent.messages}
                isProcessing={agent.isProcessing}
                error={agent.error}
                onSend={async (text) => {
                  await agent.sendMessage(text);
                  await agent.refreshContext();
                  refresh();
                }}
                onClear={agent.clearChat}
                onAttachFile={handleAttachFile}
                locale={resolvedLocale === "zh-CN" ? "zh-CN" : "en"}
              />
            ) : (
              <View style={styles.chatPrompt}>
                {isAssistantInitializing ? (
                  <ActivityIndicator color={palette.accent} size="small" />
                ) : (
                  <Ionicons
                    name="settings-outline"
                    size={28}
                    color={palette.accent}
                  />
                )}
                <Text style={[styles.chatPromptTitle, { color: palette.ink }]}>
                  {assistantPromptTitle}
                </Text>
                <Text style={[styles.chatPromptBody, { color: palette.inkMuted }]}>
                  {assistantPromptBody}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Pressable
            onPress={() => setChatExpanded(true)}
            style={[styles.chatToggle, { borderTopColor: palette.divider }]}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={palette.accent} />
            <Text style={[styles.chatToggleLabel, { color: palette.ink }]}>
              {assistantCollapsedLabel}
            </Text>
            <Ionicons name="chevron-up" size={18} color={palette.inkMuted} />
          </Pressable>
        )}
      </View>

    </SafeAreaView>
  );
}

function TrendBar({
  bar,
  isAnchor,
  isSelected,
  onPress,
  peak,
  palette,
}: {
  bar: HomeTrendPoint;
  isAnchor: boolean;
  isSelected: boolean;
  onPress: () => void;
  peak: number;
  palette: ReturnType<typeof useAppShell>["palette"];
}) {
  const chartHeight = 148;
  const incomeHeight =
    peak > 0 && bar.amountCents > 0
      ? Math.max(12, Math.round((bar.amountCents / peak) * chartHeight))
      : 0;
  const expenseHeight = 0;
  const hasIncome = bar.amountCents > 0;
  const hasExpense = false;
  const hasActivity = hasIncome || hasExpense;

  return (
    <Pressable
      accessibilityLabel={bar.date}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.barColumn,
        isSelected
          ? { backgroundColor: withAlpha(palette.ink, palette.name === "dark" ? 0.12 : 0.05) }
          : null,
        pressed ? styles.barColumnPressed : null,
      ]}
    >
      <View style={styles.barTrack}>
        {hasActivity ? (
          <View style={styles.barGroup}>
            {hasIncome ? (
              <View
                style={[
                  styles.bar,
                  { backgroundColor: palette.success, height: incomeHeight },
                ]}
              />
            ) : null}
            {hasExpense ? (
              <View
                style={[
                  styles.bar,
                  { backgroundColor: palette.destructive, height: expenseHeight },
                ]}
              />
            ) : null}
          </View>
        ) : (
          <View style={[styles.barZeroLine, { backgroundColor: withAlpha(palette.inkMuted, 0.3) }]} />
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
  barGroup: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    width: "100%",
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
  wideBody: {
    flexDirection: "row",
    gap: 20,
  },
  wideGapTop: {
    marginTop: 16,
  },
  wideLeft: {
    flex: 55,
    gap: 0,
  },
  wideRight: {
    flex: 45,
  },
  chatExpanded: {
    height: 420,
    borderTopWidth: 1,
    borderRadius: 0,
  },
  chatCollapsed: {
    borderTopWidth: 1,
  },
  chatToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatToggleLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  chatPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  chatPromptTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  chatPromptBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  chatPromptButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chatPromptButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
