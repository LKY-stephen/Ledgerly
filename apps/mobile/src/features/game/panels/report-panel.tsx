import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppShell } from "../../app-shell/provider";
import { useHomeScreenData } from "../../home/use-home-screen-data";
import { formatCurrencyFromCents } from "../../ledger/ledger-domain";
import { AgentChat } from "../../agent/agent-chat";
import { useAgentContext } from "../../agent/agent-provider";
import { withAlpha } from "../../app-shell/theme-utils";

export function ReportPanel({ variant = "report" }: { variant?: "report" | "request" }) {
  const { palette, resolvedLocale } = useAppShell();
  const { snapshot, isLoaded } = useHomeScreenData();
  const agent = useAgentContext();
  const locale = resolvedLocale === "zh-CN" ? "zh-CN" : "en";
  const isRequest = variant === "request";

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);

  return (
    <View style={styles.root}>
      {/* Metrics summary */}
      {!isRequest ? (
        <View
          style={[
            styles.metricsRow,
            {
              backgroundColor: withAlpha(palette.paperMuted, palette.name === "dark" ? 0.86 : 0.92),
              borderBottomColor: palette.divider,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.ink }]}>
              {locale === "zh-CN" ? "报告" : "Report"}
            </Text>
          </View>
          {!isLoaded ? (
            <ActivityIndicator color={palette.inkMuted} />
          ) : (
            <View style={styles.metricRow}>
              <MetricCell
                label={locale === "zh-CN" ? "收入" : "Income"}
                value={incomeLabel}
                color={palette.success}
                ink={palette.ink}
              />
              <MetricCell
                label={locale === "zh-CN" ? "支出" : "Outflow"}
                value={outflowLabel}
                color={palette.destructive}
                ink={palette.ink}
              />
              <MetricCell
                label={locale === "zh-CN" ? "净额" : "Net"}
                value={netLabel}
                color={palette.info}
                ink={palette.ink}
              />
            </View>
          )}
        </View>
      ) : null}

      {/* AI chat for report questions */}
      <View style={styles.chatArea}>
        <AgentChat
          messages={agent.messages}
          isProcessing={agent.isProcessing}
          error={agent.error}
          onSend={agent.sendMessage}
          onClear={agent.clearChat}
          locale={locale}
        />
      </View>
    </View>
  );
}

function MetricCell({
  label,
  value,
  color,
  ink,
}: {
  label: string;
  value: string;
  color: string;
  ink: string;
}) {
  return (
    <View
      style={[
        styles.metricCell,
        {
          backgroundColor: withAlpha(ink, 0.04),
          borderColor: withAlpha(ink, 0.12),
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: ink }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCopy: {
    gap: 6,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  root: {
    flex: 1,
    gap: 10,
  },
  metricsRow: {
    borderRadius: 16,
    borderWidth: 3,
    gap: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  metricCell: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  chatArea: {
    flex: 1,
    minHeight: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
