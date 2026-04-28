import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppShell } from "../../app-shell/provider";
import { useHomeScreenData } from "../../home/use-home-screen-data";
import { formatCurrencyFromCents } from "../../ledger/ledger-domain";
import { AgentChat } from "../../agent/agent-chat";
import { useAgentContext } from "../../agent/agent-provider";

export function ReportPanel() {
  const { palette, resolvedLocale } = useAppShell();
  const { snapshot, isLoaded } = useHomeScreenData();
  const agent = useAgentContext();
  const locale = resolvedLocale === "zh-CN" ? "zh-CN" : "en";

  const incomeLabel = formatCurrencyFromCents(snapshot.metrics.incomeCents);
  const outflowLabel = formatCurrencyFromCents(snapshot.metrics.outflowCents);
  const netLabel = formatCurrencyFromCents(snapshot.metrics.netCents);

  return (
    <View style={styles.root}>
      {/* Metrics summary */}
      <View style={[styles.metricsRow, { borderBottomColor: palette.divider }]}>
        {!isLoaded ? (
          <ActivityIndicator color={palette.inkMuted} />
        ) : (
          <>
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
              color={palette.accent}
              ink={palette.ink}
            />
          </>
        )}
      </View>

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
    <View style={styles.metricCell}>
      <Text style={[styles.metricLabel, { color: ink }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  metricCell: {
    alignItems: "center",
    gap: 2,
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
  },
});
