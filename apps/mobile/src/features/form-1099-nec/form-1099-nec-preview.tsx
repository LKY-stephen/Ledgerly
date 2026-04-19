import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SectionCard, type SurfaceTokens } from "@ledgerly/ui";

import { BackHeaderBar } from "../../components/back-header-bar";
import type { AppCopy } from "../app-shell/copy";
import {
  buildForm1099NecSlots,
  form1099NecDisclaimerText,
  type Form1099NecDatabaseSnapshot,
  type Form1099NecRecipientPreview,
  type Form1099NecSlotId,
} from "./form-1099-nec-model";
import { Form1099NecCanvas } from "./form-1099-nec-canvas";

interface Form1099NecPreviewProps {
  copy: AppCopy["discover"]["form1099Nec"];
  error: string | null;
  footerNote: string;
  isLoaded: boolean;
  manualBadge: string;
  palette: SurfaceTokens;
  recipients: readonly Form1099NecRecipientPreview[];
  renderLauncher?: (openPreview: () => void) => ReactNode;
  selectedRecipientId: string | null;
  snapshot: Form1099NecDatabaseSnapshot;
  onSelectRecipient: (recipientId: string) => void;
  sectionEyebrow: string;
}

export function Form1099NecPreview(props: Form1099NecPreviewProps) {
  const {
    copy,
    error,
    footerNote,
    isLoaded,
    manualBadge,
    palette,
    recipients,
    renderLauncher,
    selectedRecipientId,
    snapshot,
    onSelectRecipient,
    sectionEyebrow,
  } = props;
  const { width: viewportWidth } = useWindowDimensions();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);
  const [formZoom, setFormZoom] = useState(1);
  const slots = buildForm1099NecSlots(snapshot, {
    noInstructionNote: copy.noInstructionNote,
  });
  const [selectedSlotId, setSelectedSlotId] = useState<Form1099NecSlotId>(
    slots[0]?.id ?? "payerTin",
  );
  const baseFormWidth = Math.max(Math.min(viewportWidth - 88, 980), 320);
  const canvasWidth = Math.round(baseFormWidth * formZoom);
  const accentLabelColor = palette.name === "dark" ? palette.shell : palette.inkOnAccent;

  useEffect(() => {
    if (!slots.some((slot) => slot.id === selectedSlotId)) {
      setSelectedSlotId(slots[0]?.id ?? "payerTin");
    }
  }, [selectedSlotId, slots]);

  function openPreview() {
    setIsDisclaimerVisible(true);
    setIsPreviewVisible(true);
  }

  function closePreview() {
    setIsPreviewVisible(false);
    setIsDisclaimerVisible(true);
  }

  function zoomOut() {
    setFormZoom((currentZoom) => Math.max(0.8, Number((currentZoom - 0.2).toFixed(1))));
  }

  function zoomIn() {
    setFormZoom((currentZoom) => Math.min(2.2, Number((currentZoom + 0.2).toFixed(1))));
  }

  function resetZoom() {
    setFormZoom(1);
  }

  return (
    <>
      {renderLauncher ? (
        renderLauncher(openPreview)
      ) : (
        <SectionCard
          eyebrow={sectionEyebrow}
          footer={<Text style={[styles.footerText, { color: palette.inkMuted }]}>{footerNote}</Text>}
          palette={palette}
          title={copy.title}
        >
          <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.intro}</Text>
          <Text style={[styles.selectionHint, { color: palette.inkMuted }]}>{copy.launcherHint}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={openPreview}
            style={[styles.launchButton, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.launchButtonLabel, { color: accentLabelColor }]}>
              {copy.openPreview}
            </Text>
          </Pressable>
        </SectionCard>
      )}

      <Modal animationType="slide" onRequestClose={closePreview} visible={isPreviewVisible}>
        <View style={[styles.previewModalScreen, { backgroundColor: palette.shell }]}>
          {isDisclaimerVisible ? (
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
                <Text style={[styles.modalTitle, { color: palette.ink }]}>{copy.disclaimerTitle}</Text>
                <Text style={[styles.modalBody, { color: palette.inkMuted }]}>
                  {form1099NecDisclaimerText}
                </Text>
                <View style={styles.modalButtonRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={closePreview}
                    style={[styles.modalButtonSecondary, { borderColor: palette.border }]}
                  >
                    <Text style={[styles.modalButtonSecondaryLabel, { color: palette.ink }]}>
                      {copy.closePreview}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setIsDisclaimerVisible(false);
                    }}
                    style={[styles.modalButton, { backgroundColor: palette.accent }]}
                  >
                    <Text style={[styles.modalButtonLabel, { color: accentLabelColor }]}>
                      {copy.acknowledge}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.previewHeader,
                  {
                    backgroundColor: palette.paper,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <BackHeaderBar onBack={closePreview} palette={palette} title={copy.title} />
              </View>

              <ScrollView contentContainerStyle={styles.previewScrollContent}>
                <SectionCard
                  eyebrow={sectionEyebrow}
                  footer={<Text style={[styles.footerText, { color: palette.inkMuted }]}>{footerNote}</Text>}
                  palette={palette}
                  title={copy.title}
                >
                  <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.intro}</Text>

                  <View style={styles.legendRow}>
                    <LegendPill color={palette.accent} label={copy.databaseBadge} tone="soft" />
                    <LegendPill color={palette.destructive} label={manualBadge} tone="outline" />
                  </View>

                  <Text style={[styles.subheading, { color: palette.ink }]}>{copy.recipientPickerTitle}</Text>
                  <Text style={[styles.selectionHint, { color: palette.inkMuted }]}>
                    {copy.recipientPickerHint}
                  </Text>

                  {recipients.length > 0 ? (
                    <View style={styles.recipientGrid}>
                      {recipients.map((recipient) => {
                        const isSelected = recipient.counterpartyId === selectedRecipientId;

                        return (
                          <Pressable
                            key={recipient.counterpartyId}
                            accessibilityRole="button"
                            onPress={() => {
                              onSelectRecipient(recipient.counterpartyId);
                            }}
                            style={[
                              styles.recipientCard,
                              {
                                backgroundColor: isSelected ? palette.accentSoft : palette.paperMuted,
                                borderColor: isSelected ? palette.accent : palette.border,
                              },
                            ]}
                          >
                            <Text style={[styles.recipientTitle, { color: palette.ink }]}>
                              {recipient.label}
                            </Text>
                            <Text style={[styles.recipientMeta, { color: palette.inkMuted }]}>
                              {recipient.grossAmountLabel}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.emptyText, { color: palette.inkMuted }]}>
                      {copy.emptyRecipients}
                    </Text>
                  )}

                  {error ? (
                    <Text style={[styles.errorText, { color: palette.destructive }]}>{error}</Text>
                  ) : null}

                  <View style={styles.zoomRow}>
                    <Text style={[styles.zoomLabel, { color: palette.ink }]}>
                      Zoom and pan to check slot alignment.
                    </Text>
                    <View style={styles.zoomButtonRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={formZoom <= 0.8}
                        onPress={zoomOut}
                        style={[
                          styles.zoomButton,
                          { borderColor: palette.border },
                          formZoom <= 0.8 ? styles.zoomButtonDisabled : null,
                        ]}
                      >
                        <Text style={[styles.zoomButtonLabel, { color: palette.ink }]}>-</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={resetZoom}
                        style={[styles.zoomValueButton, { borderColor: palette.border }]}
                      >
                        <Text style={[styles.zoomValueLabel, { color: palette.ink }]}>
                          {Math.round(formZoom * 100)}%
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={formZoom >= 2.2}
                        onPress={zoomIn}
                        style={[
                          styles.zoomButton,
                          { borderColor: palette.border },
                          formZoom >= 2.2 ? styles.zoomButtonDisabled : null,
                        ]}
                      >
                        <Text style={[styles.zoomButtonLabel, { color: palette.ink }]}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.formShell,
                      {
                        backgroundColor: palette.paper,
                        borderColor: palette.border,
                        shadowColor: palette.shadow,
                      },
                    ]}
                  >
                    <ScrollView
                      horizontal={true}
                      nestedScrollEnabled={true}
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={styles.formScrollerContent}
                    >
                      <Form1099NecCanvas
                        onSelectSlot={setSelectedSlotId}
                        palette={palette}
                        selectedSlotId={selectedSlotId}
                        slots={slots}
                        width={canvasWidth}
                      />
                    </ScrollView>
                  </View>

                  {!isLoaded ? (
                    <Text style={[styles.selectionHint, { color: palette.inkMuted }]}>
                      Loading slot coverage…
                    </Text>
                  ) : null}

                  <Text style={[styles.subheading, { color: palette.ink }]}>{copy.slotGuideTitle}</Text>
                  <View style={styles.slotStack}>
                    {slots.map((slot) => {
                      const isSelected = slot.id === selectedSlotId;
                      const badgeLabel = slot.source === "database" ? copy.databaseBadge : manualBadge;
                      const accentColor =
                        slot.source === "database" ? palette.accent : palette.destructive;

                      return (
                        <Pressable
                          key={slot.id}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedSlotId(slot.id);
                          }}
                          style={[
                            styles.slotCard,
                            {
                              backgroundColor: isSelected ? palette.accentSoft : palette.paperMuted,
                              borderColor: isSelected ? accentColor : palette.border,
                            },
                          ]}
                        >
                          <View style={styles.slotCardHeader}>
                            <Text style={[styles.slotTitle, { color: palette.ink }]}>
                              {slot.fieldLabel}
                            </Text>
                            <Text style={[styles.slotPill, { color: accentColor }]}>{badgeLabel}</Text>
                          </View>

                          {slot.previewValue ? (
                            <Text style={[styles.previewValue, { color: palette.ink }]}>
                              {slot.previewValue}
                            </Text>
                          ) : null}

                          <Text style={[styles.slotBody, { color: palette.inkMuted }]}>
                            {slot.sourceNote}
                          </Text>
                          <Text style={[styles.slotBody, { color: palette.ink }]}>{slot.instruction}</Text>
                          <Text style={[styles.sourceLine, { color: palette.inkMuted }]}>
                            {copy.sourceLabel}: {slot.citation}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </SectionCard>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

function LegendPill(props: { color: string; label: string; tone: "outline" | "soft" }) {
  const { color, label, tone } = props;

  return (
    <View
      style={[
        styles.legendPill,
        tone === "soft"
          ? { backgroundColor: "rgba(15, 118, 110, 0.12)", borderColor: color }
          : { backgroundColor: "rgba(194, 65, 12, 0.1)", borderColor: color },
      ]}
    >
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  formCanvas: {
    width: "100%",
  },
  formShell: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  formScrollerContent: {
    padding: 12,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  legendPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  launchButton: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 20,
  },
  launchButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(7, 24, 22, 0.74)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  modalButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalButtonSecondary: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  modalButtonSecondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    maxWidth: 560,
    padding: 20,
    width: "100%",
    shadowOffset: {
      height: 14,
      width: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  previewHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 12,
  },
  previewModalScreen: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 20,
    paddingBottom: 36,
  },
  previewValue: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  recipientCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: 148,
    padding: 14,
  },
  recipientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recipientMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  recipientTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  selectionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  slotBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  slotCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  slotCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  slotPill: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  slotStack: {
    gap: 12,
  },
  slotTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  sourceLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
  },
  unlockNote: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },
  zoomButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomButtonLabel: {
    fontSize: 18,
    fontWeight: "800",
  },
  zoomButtonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  zoomLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  zoomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  zoomValueButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  zoomValueLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
});
