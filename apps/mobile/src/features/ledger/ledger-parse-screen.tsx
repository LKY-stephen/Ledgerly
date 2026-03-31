import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { useAppShell } from "../app-shell/provider";
import { parseCategoryOptions, parseProgressSteps } from "./ledger-mocks";

export function LedgerParseScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const [selectedCategory, setSelectedCategory] = useState<"income" | "expense" | "invoice">("expense");

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="ledger-parse-screen"
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
          rightAccessory={
            <View style={[styles.avatar, { backgroundColor: palette.heroEnd }]}>
              <Text style={[styles.avatarLabel, { color: palette.inkOnAccent }]}>YC</Text>
            </View>
          }
          title={copy.common.appName}
        />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>Verification workflow</Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>{copy.ledger.parse.title}</Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>{copy.ledger.parse.summary}</Text>
        </View>

        <View
          style={[
            styles.documentCard,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.documentHeader}>
            <Text numberOfLines={1} style={[styles.documentName, { color: palette.ink }]}>
              original_receipt_v4.pdf
            </Text>
            <View style={styles.documentTools}>
              <View style={[styles.toolDot, { backgroundColor: palette.paperMuted }]}>
                <Feather color={palette.inkMuted} name="search" size={14} />
              </View>
              <View style={[styles.toolDot, { backgroundColor: palette.paperMuted }]}>
                <MaterialCommunityIcons color={palette.inkMuted} name="arrow-top-right" size={14} />
              </View>
            </View>
          </View>
          <View style={[styles.previewFrame, { backgroundColor: palette.shellElevated, borderColor: palette.border }]}>
            <View style={[styles.previewPoster, { backgroundColor: palette.ink }]}>
              <Text style={[styles.previewPosterTitle, { color: palette.inkOnAccent }]}>DOCUMENT</Text>
              <Text style={[styles.previewPosterSub, { color: palette.inkOnAccent }]}>SAFE REVIEW</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: palette.shellElevated,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>Vendor</Text>
              <View style={[styles.summaryValueBox, { backgroundColor: palette.paperMuted }]}>
                <Text style={[styles.summaryValue, { color: palette.ink }]}>Adobe Systems Inc.</Text>
              </View>
            </View>
            <View style={styles.summaryCellRow}>
              <View style={styles.summaryCellHalf}>
                <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>Amount</Text>
                <View style={[styles.summaryValueBox, { backgroundColor: palette.paperMuted }]}>
                  <Text style={[styles.summaryValue, { color: palette.ink }]}>$52.99</Text>
                </View>
              </View>
              <View style={styles.summaryCellHalf}>
                <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>Date</Text>
                <View style={[styles.summaryValueBox, { backgroundColor: palette.paperMuted }]}>
                  <Text style={[styles.summaryValue, { color: palette.ink }]}>Oct 24, 2025</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.categoryTitle, { color: palette.ink }]}>Financial Category</Text>
          {parseCategoryOptions.map((option) => {
            const selected = option.id === selectedCategory;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setSelectedCategory(option.id)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  {
                    backgroundColor: pressed || selected ? palette.paperMuted : palette.paper,
                    borderColor: selected ? palette.accent : palette.border,
                  },
                ]}
                testID={`ledger-parse-category-${option.id}`}
              >
                <View style={[styles.categoryBadge, { backgroundColor: palette.accentSoft }]}>
                  {option.id === "income" ? (
                    <MaterialCommunityIcons color={palette.accent} name="chart-line" size={18} />
                  ) : option.id === "expense" ? (
                    <MaterialCommunityIcons color={palette.accent} name="bag-personal-outline" size={18} />
                  ) : (
                    <Ionicons color={palette.accent} name="document-text-outline" size={16} />
                  )}
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={[styles.categoryHeading, { color: palette.ink }]}>{option.title}</Text>
                  <Text style={[styles.categoryDescription, { color: palette.inkMuted }]}>
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? palette.accent : palette.inkMuted,
                      backgroundColor: selected ? palette.accent : "transparent",
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.progressTitle, { color: palette.ink }]}>{copy.ledger.parse.progressTitle}</Text>
          {parseProgressSteps.map((step, index) => (
            <View key={step.id} style={[styles.progressRow, { borderTopColor: index === 0 ? "transparent" : palette.divider }]}>
              <View style={[styles.progressDot, { backgroundColor: palette.accent }]} />
              <View style={styles.progressCopy}>
                <Text style={[styles.progressHeading, { color: palette.ink }]}>{step.title}</Text>
                <Text style={[styles.progressSummary, { color: palette.inkMuted }]}>{step.summary}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/ledger")}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? palette.heroEnd : palette.ink },
          ]}
          testID="ledger-parse-confirm-button"
        >
          <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>Confirm & Save</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: pressed ? palette.paperMuted : palette.paper,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: palette.inkMuted }]}>Discard</Text>
        </Pressable>

        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={[styles.noteDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.noteText, { color: palette.inkMuted }]}>
            Our intelligence engine has identified this as a monthly subscription based on previous patterns. Select
            Expense to keep the default software deduction review path.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  categoryCopy: {
    flex: 1,
    gap: 3,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryHeading: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryRow: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 34,
  },
  documentCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  documentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    marginRight: 12,
  },
  documentTools: {
    flexDirection: "row",
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroBlock: {
    gap: 10,
  },
  heroSummary: {
    fontSize: 17,
    lineHeight: 26,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 42,
  },
  noteCard: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  noteDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  previewFrame: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 228,
    padding: 24,
  },
  previewPoster: {
    alignItems: "center",
    borderRadius: 2,
    height: 130,
    justifyContent: "center",
    width: 100,
  },
  previewPosterSub: {
    fontSize: 10,
    letterSpacing: 1.1,
    opacity: 0.72,
  },
  previewPosterTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  progressCopy: {
    flex: 1,
    gap: 3,
  },
  progressDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  progressHeading: {
    fontSize: 15,
    fontWeight: "700",
  },
  progressRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  progressSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  radio: {
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    width: 18,
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  summaryCell: {
    gap: 6,
  },
  summaryCellHalf: {
    flex: 1,
    gap: 6,
  },
  summaryCellRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryGrid: {
    gap: 10,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryValueBox: {
    borderRadius: 8,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  toolDot: {
    alignItems: "center",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
});
