import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

import { useAppShell } from "../app-shell/provider";

export function HomeScreen() {
  const { copy, palette } = useAppShell();
  const chartWidth = Dimensions.get("window").width - 88;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={[styles.avatar, { backgroundColor: palette.heroEnd, borderColor: palette.border }]}>
              <Text style={[styles.avatarLabel, { color: palette.inkOnAccent }]}>YC</Text>
            </View>
            <Text style={[styles.brand, { color: palette.ink }]}>{copy.common.appName}</Text>
          </View>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.notificationButton,
              {
                backgroundColor: pressed ? palette.paperMuted : palette.paper,
                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons color={palette.ink} name="notifications-outline" size={18} />
            <View style={[styles.notificationDot, { backgroundColor: palette.accent }]} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>Available capital</Text>
          <Text style={[styles.heroValue, { color: palette.ink }]}>$142,850.42</Text>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: pressed ? palette.heroEnd : palette.ink },
              ]}
            >
              <Text style={[styles.primaryActionLabel, { color: palette.inkOnAccent }]}>Transfer Funds</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryAction,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.secondaryActionLabel, { color: palette.inkMuted }]}>Download Report</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.cardStack}>
          {[
            {
              id: "income",
              label: "Income",
              amount: "$54,200.00",
              note: "+12%",
            },
            {
              id: "expenses",
              label: "Expenses",
              amount: "$12,840.15",
              note: "-4%",
            },
            {
              id: "invoices",
              label: "Invoices",
              amount: "$8,900.00",
              note: "3 Pending",
            },
          ].map((card) => (
            <View
              key={card.id}
              style={[
                styles.metricCard,
                {
                  backgroundColor: palette.shellElevated,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <View style={[styles.metricAccent, { backgroundColor: palette.accent }]} />
              <View style={styles.metricHeader}>
                <View style={[styles.metricBadge, { backgroundColor: palette.accentSoft }]}>
                  {card.id === "income" ? (
                    <MaterialCommunityIcons color={palette.accent} name="arrow-down" size={18} />
                  ) : card.id === "expenses" ? (
                    <MaterialCommunityIcons color={palette.ink} name="arrow-up" size={18} />
                  ) : (
                    <Ionicons color={palette.ink} name="document-text-outline" size={16} />
                  )}
                </View>
                <Text style={[styles.metricNote, { color: palette.accent }]}>{card.note}</Text>
              </View>
              <Text style={[styles.metricLabel, { color: palette.inkMuted }]}>{card.label}</Text>
              <Text style={[styles.metricValue, { color: palette.ink }]}>{card.amount}</Text>
              <LineChart
                bezier
                chartConfig={{
                  backgroundGradientFrom: palette.shellElevated,
                  backgroundGradientTo: palette.shellElevated,
                  color: (opacity = 1) =>
                    card.id === "expenses"
                      ? `rgba(148, 163, 184, ${opacity})`
                      : `rgba(15, 118, 110, ${opacity})`,
                  fillShadowGradientFrom: "transparent",
                  fillShadowGradientTo: "transparent",
                  labelColor: () => "transparent",
                  propsForBackgroundLines: { stroke: "transparent" },
                  propsForDots: { r: "0" },
                  propsForLabels: { fontSize: 0 },
                  propsForVerticalLabels: { fontSize: 0 },
                  propsForHorizontalLabels: { fontSize: 0 },
                  strokeWidth: 2,
                }}
                data={{
                  labels: ["", "", "", "", "", ""],
                  datasets: [
                    {
                      data:
                        card.id === "income"
                          ? [2.2, 2.4, 2.8, 2.6, 2.1, 2.7]
                          : card.id === "expenses"
                            ? [2.8, 2.7, 2.6, 2.4, 2.2, 1.9]
                            : [1.6, 1.6, 1.7, 1.7, 1.7, 1.7],
                    },
                  ],
                }}
                fromZero
                height={56}
                segments={2}
                style={styles.chart}
                transparent
                width={chartWidth}
                withDots={false}
                withHorizontalLabels={false}
                withInnerLines={false}
                withOuterLines={false}
                withShadow={false}
                withVerticalLabels={false}
              />
            </View>
          ))}

          <View
            style={[
              styles.queueCard,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.queueHeader}>
              <Text style={[styles.queueTitle, { color: palette.ink }]}>Action Queue</Text>
              <View style={[styles.queuePill, { backgroundColor: palette.ink }]}>
                <Text style={[styles.queuePillLabel, { color: palette.inkOnAccent }]}>4 pending</Text>
              </View>
            </View>

            {[
              {
                id: "verify",
                title: "Verify Record",
                summary: "Stripe payout mismatch for #2041",
                action: "Resolve",
              },
              {
                id: "review",
                title: "Review Receipt",
                summary: "Adobe Creative Cloud subscription",
                action: "Review",
              },
            ].map((item) => (
              <View
                key={item.id}
                style={[
                  styles.queueItem,
                  {
                    backgroundColor: palette.shellElevated,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={[styles.queueItemIcon, { backgroundColor: palette.paperMuted }]}>
                  {item.id === "verify" ? (
                    <Feather color={palette.inkMuted} name="check-circle" size={16} />
                  ) : (
                    <Feather color={palette.inkMuted} name="file-text" size={16} />
                  )}
                </View>
                <View style={styles.queueCopy}>
                  <Text style={[styles.queueItemTitle, { color: palette.ink }]}>{item.title}</Text>
                  <Text style={[styles.queueItemSummary, { color: palette.inkMuted }]}>{item.summary}</Text>
                </View>
                <Text style={[styles.queueAction, { color: palette.accent }]}>{item.action}</Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.recentCard,
              {
                backgroundColor: palette.shellElevated,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: palette.ink }]}>Recent Activity</Text>
              <Text style={[styles.recentLink, { color: palette.inkMuted }]}>See All</Text>
            </View>
            {[
              { id: "apple", title: "Apple Store", date: "Aug 24", category: "Hardware", amount: "-$2,499.00" },
              { id: "brand", title: "Brand Sponsorship", date: "Aug 22", category: "Income", amount: "+$12,000.00" },
              { id: "starlink", title: "Starlink", date: "Aug 21", category: "Utility", amount: "-$120.00" },
            ].map((item) => (
              <View key={item.id} style={[styles.recentRow, { borderTopColor: palette.divider }]}>
                <View style={[styles.recentBadge, { backgroundColor: palette.paperMuted }]}>
                  {item.id === "brand" ? (
                    <MaterialCommunityIcons color={palette.inkMuted} name="briefcase-outline" size={16} />
                  ) : item.id === "starlink" ? (
                    <Ionicons color={palette.inkMuted} name="wifi-outline" size={16} />
                  ) : (
                    <Ionicons color={palette.inkMuted} name="bag-outline" size={16} />
                  )}
                </View>
                <View style={styles.recentCopy}>
                  <Text style={[styles.recentItemTitle, { color: palette.ink }]}>{item.title}</Text>
                  <Text style={[styles.recentItemMeta, { color: palette.inkMuted }]}>
                    {item.date} • {item.category}
                  </Text>
                </View>
                <Text style={[styles.recentAmount, { color: palette.ink }]}>{item.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  cardStack: {
    gap: 16,
  },
  container: {
    gap: 20,
    padding: 18,
    paddingBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  hero: {
    gap: 14,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  heroValue: {
    fontSize: 50,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 52,
  },
  metricAccent: {
    borderRadius: 999,
    height: 44,
    left: 0,
    position: "absolute",
    top: 28,
    width: 3,
  },
  metricBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  chart: {
    marginLeft: -28,
    marginTop: 2,
  },
  metricCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    minHeight: 158,
    overflow: "hidden",
    padding: 18,
    position: "relative",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  metricHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricNote: {
    fontSize: 13,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  notificationButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 36,
  },
  notificationDot: {
    borderRadius: 999,
    height: 8,
    position: "absolute",
    right: 8,
    top: 7,
    width: 8,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  primaryActionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  queueAction: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  queueCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  queueCopy: {
    flex: 1,
    gap: 3,
  },
  queueHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  queueItem: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  queueItemIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  queueItemSummary: {
    fontSize: 13,
  },
  queueItemTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  queuePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  queuePillLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  queueTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  recentBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  recentCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  recentCopy: {
    flex: 1,
    gap: 2,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recentItemMeta: {
    fontSize: 13,
  },
  recentItemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  recentLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  recentRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
  },
  recentTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
