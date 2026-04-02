import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { formatDisplayDate } from "./ledger-domain";
import { useLedgerParseQueue } from "./use-ledger-parse-queue";
import { useAppShell } from "../app-shell/provider";

type FieldId = "amount" | "date" | "description" | "notes" | "source" | "target" | "taxCategory";

const fieldDefinitions: Array<{ id: FieldId; label: string; multiline?: boolean; required?: boolean }> = [
  { id: "description", label: "Description", multiline: true, required: true },
  { id: "amount", label: "Amount", required: true },
  { id: "date", label: "Date", required: true },
  { id: "source", label: "Source" },
  { id: "target", label: "Target" },
  { id: "taxCategory", label: "Tax Category" },
  { id: "notes", label: "Notes", multiline: true },
];

const categoryOptions = [
  {
    description: "Revenue, creator payouts, and incoming settlements.",
    id: "income",
    title: "Income",
  },
  {
    description: "Business costs such as software, gear, and travel.",
    id: "expense",
    title: "Expense",
  },
  {
    description: "Outflow that should stay outside the tax-deductible expense bucket.",
    id: "spending",
    title: "Spending",
  },
] as const;

export function LedgerParseScreen() {
  const router = useRouter();
  const { palette } = useAppShell();
  const { currentItem, error, isLoaded, isParsing, isSubmitting, queue, refresh, retry, review, submit, updateField } =
    useLedgerParseQueue();
  const [draftValues, setDraftValues] = useState<Record<FieldId, string>>({
    amount: "",
    date: "",
    description: "",
    notes: "",
    source: "",
    target: "",
    taxCategory: "",
  });
  const [editingField, setEditingField] = useState<FieldId | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ fieldId: FieldId; nextValue: string } | null>(null);

  useEffect(() => {
    setDraftValues({
      amount: review.amount,
      date: review.date,
      description: review.description,
      notes: review.notes,
      source: review.source,
      target: review.target,
      taxCategory: review.taxCategory,
    });
  }, [review.amount, review.date, review.description, review.notes, review.source, review.target, review.taxCategory]);

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.ink }]}>Preparing parse queue…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.ink }]}>No pending uploads</Text>
          <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>
            Import receipts from the upload screen to start the review workflow.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/ledger/upload")}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? palette.heroEnd : palette.ink,
              },
            ]}
          >
            <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>Go to Upload</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeFieldLabel = pendingEdit
    ? fieldDefinitions.find((field) => field.id === pendingEdit.fieldId)?.label ?? ""
    : "";

  async function handleSubmit(): Promise<void> {
    const wasLastItem = queue.length <= 1;
    const succeeded = await submit();

    if (succeeded && wasLastItem) {
      router.replace("/(tabs)/ledger");
    }
  }

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
          rightAccessory={<CfoAvatar />}
          title="Creator CFO"
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>Verification workflow</Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>Review extracted data</Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>
            {queue.length} pending item(s). Required fields are date, amount, and description.
          </Text>
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
            <View style={styles.documentHeaderCopy}>
              <Text numberOfLines={1} style={[styles.documentName, { color: palette.ink }]}>
                {currentItem.originalFileName}
              </Text>
              <Text style={[styles.documentMeta, { color: palette.inkMuted }]}>
                {currentItem.extractedData?.sourceLabel ?? "Waiting for parser"} • {formatDisplayDate(currentItem.createdAt.slice(0, 10))}
              </Text>
            </View>
            <View style={styles.documentTools}>
              <View style={[styles.toolDot, { backgroundColor: palette.paperMuted }]}>
                <Feather color={palette.inkMuted} name="file-text" size={14} />
              </View>
              <View style={[styles.toolDot, { backgroundColor: palette.paperMuted }]}>
                <MaterialCommunityIcons color={palette.inkMuted} name="layers-outline" size={14} />
              </View>
            </View>
          </View>
          <View style={[styles.previewFrame, { backgroundColor: palette.shellElevated, borderColor: palette.border }]}>
            <View style={[styles.previewPoster, { backgroundColor: palette.ink }]}>
              <Text style={[styles.previewPosterTitle, { color: palette.inkOnAccent }]}>
                {currentItem.extractedData?.parser === "ios_vision_ocr" ? "IOS OCR" : "FALLBACK"}
              </Text>
              <Text style={[styles.previewPosterSub, { color: palette.inkOnAccent }]}>
                {currentItem.parseStatus === "failed" ? "RETRY AVAILABLE" : "READY FOR REVIEW"}
              </Text>
            </View>
          </View>
          {currentItem.extractedData?.failureReason ? (
            <Text style={[styles.failureText, { color: "#BA1A1A" }]}>
              {currentItem.extractedData.failureReason}
            </Text>
          ) : null}
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
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: palette.accent }]}>Parsed Fields</Text>
              <Text style={[styles.summaryTitle, { color: palette.ink }]}>Adjust the local record draft</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => refresh()}>
              <Text style={[styles.fieldActionLabel, { color: palette.accent }]}>Refresh</Text>
            </Pressable>
          </View>

          <View style={styles.summaryGrid}>
            {fieldDefinitions.map((field) => {
              const isEditing = editingField === field.id;
              const value = isEditing ? draftValues[field.id] : review[field.id];

              return (
                <View
                  key={field.id}
                  style={[
                    styles.summaryCell,
                    field.multiline ? styles.summaryCellFull : styles.summaryCellHalf,
                  ]}
                >
                  <View style={styles.summaryCellHeader}>
                    <Text style={[styles.summaryLabel, { color: palette.inkMuted }]}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </Text>
                    {isEditing ? (
                      <View style={styles.summaryCellActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setDraftValues((current) => ({ ...current, [field.id]: review[field.id] }));
                            setEditingField(null);
                          }}
                        >
                          <Text style={[styles.fieldActionLabel, { color: palette.inkMuted }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setPendingEdit({
                              fieldId: field.id,
                              nextValue: draftValues[field.id].trim(),
                            })
                          }
                        >
                          <Text style={[styles.fieldActionLabel, { color: palette.accent }]}>Save</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setDraftValues((current) => ({ ...current, [field.id]: review[field.id] }));
                          setEditingField(field.id);
                        }}
                      >
                        <Text style={[styles.fieldActionLabel, { color: palette.accent }]}>Edit</Text>
                      </Pressable>
                    )}
                  </View>

                  <View
                    style={[
                      styles.summaryValueBox,
                      {
                        backgroundColor: palette.paperMuted,
                        borderColor: isEditing ? palette.accent : "transparent",
                      },
                    ]}
                  >
                    <TextInput
                      editable={isEditing}
                      keyboardType={field.id === "amount" ? "decimal-pad" : "default"}
                      multiline={Boolean(field.multiline)}
                      onChangeText={(text) => {
                        setDraftValues((current) => ({ ...current, [field.id]: text }));
                      }}
                      placeholderTextColor={palette.inkMuted}
                      style={[
                        styles.summaryInput,
                        field.multiline ? styles.summaryInputMultiline : null,
                        { color: palette.ink },
                      ]}
                      value={value}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={[styles.categoryTitle, { color: palette.ink }]}>Financial Category</Text>
          {categoryOptions.map((option) => {
            const selected = option.id === review.category;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => updateField("category", option.id)}
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
                    <MaterialCommunityIcons color={palette.accent} name="wallet-outline" size={18} />
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

        {error ? <Text style={[styles.inlineError, { color: "#BA1A1A" }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isParsing || isSubmitting}
          onPress={() => handleSubmit()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? palette.heroEnd : palette.ink, opacity: isSubmitting ? 0.7 : 1 },
          ]}
          testID="ledger-parse-confirm-button"
        >
          <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>
            {isSubmitting ? "Saving..." : "Confirm & Save"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isParsing}
          onPress={() => retry()}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: pressed ? palette.paperMuted : palette.paper,
              borderColor: palette.border,
              opacity: isParsing ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: palette.inkMuted }]}>
            {isParsing ? "Parsing..." : "Retry Parse"}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal animationType="fade" transparent visible={pendingEdit !== null}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.ink }]}>是否确认编辑？</Text>
            <Text style={[styles.modalBody, { color: palette.inkMuted }]}>
              {activeFieldLabel} will be updated to:
            </Text>
            <Text style={[styles.modalValue, { color: palette.ink }]}>
              {pendingEdit?.nextValue || "Empty value"}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPendingEdit(null)}
                style={[styles.modalButtonSecondary, { borderColor: palette.border }]}
              >
                <Text style={[styles.modalButtonSecondaryLabel, { color: palette.ink }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!pendingEdit) {
                    return;
                  }

                  updateField(pendingEdit.fieldId, pendingEdit.nextValue);
                  setDraftValues((current) => ({
                    ...current,
                    [pendingEdit.fieldId]: pendingEdit.nextValue,
                  }));
                  setEditingField(null);
                  setPendingEdit(null);
                }}
                style={[styles.modalButtonPrimary, { backgroundColor: palette.ink }]}
              >
                <Text style={[styles.modalButtonPrimaryLabel, { color: palette.inkOnAccent }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  categoryBadge: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  categoryCopy: {
    flex: 1,
    gap: 4,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryHeading: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryRow: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  categoryTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
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
    gap: 12,
    justifyContent: "space-between",
  },
  documentHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  documentMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  documentName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  documentTools: {
    flexDirection: "row",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  emptySummary: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  failureText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fieldActionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroBlock: {
    gap: 10,
  },
  heroSummary: {
    fontSize: 17,
    lineHeight: 24,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 44,
  },
  inlineError: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalButtonPrimary: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonPrimaryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalButtonSecondary: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonSecondaryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    maxWidth: 360,
    padding: 20,
    shadowOffset: { height: 20, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  previewFrame: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 180,
    overflow: "hidden",
    padding: 18,
  },
  previewPoster: {
    alignItems: "center",
    borderRadius: 28,
    gap: 10,
    justifyContent: "center",
    minHeight: 132,
    paddingHorizontal: 20,
    width: "100%",
  },
  previewPosterSub: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  previewPosterTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  radio: {
    borderRadius: 999,
    borderWidth: 2,
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
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  summaryCell: {
    gap: 8,
  },
  summaryCellActions: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCellFull: {
    width: "100%",
  },
  summaryCellHalf: {
    width: "48%",
  },
  summaryCellHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryInput: {
    fontSize: 15,
    minHeight: 22,
    padding: 0,
  },
  summaryInputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryValueBox: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toolDot: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
