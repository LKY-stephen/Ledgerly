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
import { SectionCard, type SurfaceTokens } from "@creator-cfo/ui";

import type { TaxFormPage, TaxFormSlotId, TaxFormSlotSource, TaxFormSlotState } from "./types";

const calculatedLegendColor = "#2563eb";

interface TaxFormCopyLike {
  acknowledge: string;
  closePreview: string;
  databaseBadge: string;
  disclaimerTitle: string;
  intro: string;
  launcherHint: string;
  openPreview: string;
  pageOneLabel: string;
  pageSwitcherTitle: string;
  pageTwoLabel: string;
  sourceLabel: string;
  slotGuideTitle: string;
  taxYearTitle?: string;
  title: string;
}

interface TaxFormPreviewProps {
  calculatedBadge: string;
  copy: TaxFormCopyLike;
  disclaimerText: string;
  error: string | null;
  footerNote: string;
  isLoaded: boolean;
  manualBadge: string;
  onSelectTaxYear?: (taxYear: number) => void;
  palette: SurfaceTokens;
  renderCanvas: (props: {
    onSelectSlot: (slotId: TaxFormSlotId) => void;
    page: TaxFormPage;
    palette: SurfaceTokens;
    selectedSlotId: TaxFormSlotId;
    slots: readonly TaxFormSlotState[];
    width: number;
  }) => ReactNode;
  renderLauncher?: (openPreview: () => void) => ReactNode;
  selectedTaxYear?: number;
  sectionEyebrow: string;
  slots: readonly TaxFormSlotState[];
  taxYearOptions?: readonly number[];
}

export function TaxFormPreview(props: TaxFormPreviewProps) {
  const {
    calculatedBadge,
    copy,
    disclaimerText,
    error,
    footerNote,
    isLoaded,
    manualBadge,
    onSelectTaxYear,
    palette,
    renderCanvas,
    renderLauncher,
    selectedTaxYear,
    sectionEyebrow,
    slots,
    taxYearOptions,
  } = props;
  const { width: viewportWidth } = useWindowDimensions();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);
  const [formZoom, setFormZoom] = useState(1);
  const [selectedPage, setSelectedPage] = useState<TaxFormPage>(1);
  const pageSlots = slots.filter((slot) => slot.page === selectedPage);
  const [selectedSlotId, setSelectedSlotId] = useState<TaxFormSlotId>(
    pageSlots[0]?.id ?? slots[0]?.id ?? "slot-1",
  );
  const baseFormWidth = Math.max(Math.min(viewportWidth - 88, 980), 320);
  const canvasWidth = Math.round(baseFormWidth * formZoom);

  useEffect(() => {
    if (!pageSlots.some((slot) => slot.id === selectedSlotId)) {
      setSelectedSlotId(pageSlots[0]?.id ?? slots[0]?.id ?? "slot-1");
    }
  }, [pageSlots, selectedSlotId, slots]);

  function openPreview() {
    setIsDisclaimerVisible(true);
    setSelectedPage(1);
    setIsPreviewVisible(true);
  }

  function closePreview() {
    setIsPreviewVisible(false);
    setIsDisclaimerVisible(true);
    setSelectedPage(1);
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
            <Text style={[styles.launchButtonLabel, { color: palette.inkOnAccent }]}>
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
                <Text style={[styles.modalBody, { color: palette.inkMuted }]}>{disclaimerText}</Text>
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
                    <Text style={[styles.modalButtonLabel, { color: palette.inkOnAccent }]}>
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
                <Text style={[styles.previewHeaderTitle, { color: palette.ink }]}>{copy.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={closePreview}
                  style={[styles.closeButton, { borderColor: palette.border }]}
                >
                  <Text style={[styles.closeButtonLabel, { color: palette.ink }]}>
                    {copy.closePreview}
                  </Text>
                </Pressable>
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
                    <LegendPill color={palette.accent} label={copy.databaseBadge} />
                    <LegendPill color={calculatedLegendColor} label={calculatedBadge} />
                    <LegendPill color={palette.destructive} label={manualBadge} />
                  </View>

                  {error ? (
                    <Text style={[styles.errorText, { color: palette.destructive }]}>{error}</Text>
                  ) : null}

                  {copy.taxYearTitle && selectedTaxYear !== undefined && onSelectTaxYear && taxYearOptions ? (
                    <>
                      <Text style={[styles.subheading, { color: palette.ink }]}>
                        {copy.taxYearTitle}
                      </Text>
                      <View style={styles.pageButtonRow}>
                        {taxYearOptions.map((taxYear) => (
                          <PageButton
                            key={taxYear}
                            isSelected={selectedTaxYear === taxYear}
                            label={String(taxYear)}
                            onPress={() => {
                              onSelectTaxYear(taxYear);
                            }}
                            palette={palette}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  <Text style={[styles.subheading, { color: palette.ink }]}>{copy.pageSwitcherTitle}</Text>
                  <View style={styles.pageButtonRow}>
                    <PageButton
                      isSelected={selectedPage === 1}
                      label={copy.pageOneLabel}
                      onPress={() => {
                        setSelectedPage(1);
                      }}
                      palette={palette}
                    />
                    <PageButton
                      isSelected={selectedPage === 2}
                      label={copy.pageTwoLabel}
                      onPress={() => {
                        setSelectedPage(2);
                      }}
                      palette={palette}
                    />
                  </View>

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
                      {renderCanvas({
                        onSelectSlot: setSelectedSlotId,
                        page: selectedPage,
                        palette,
                        selectedSlotId,
                        slots,
                        width: canvasWidth,
                      })}
                    </ScrollView>
                  </View>

                  {!isLoaded ? (
                    <Text style={[styles.selectionHint, { color: palette.inkMuted }]}>
                      Loading slot coverage…
                    </Text>
                  ) : null}

                  <Text style={[styles.subheading, { color: palette.ink }]}>{copy.slotGuideTitle}</Text>
                  <View style={styles.slotStack}>
                    {pageSlots.map((slot) => {
                      const isSelected = slot.id === selectedSlotId;
                      const { accentColor, badgeLabel } = getSlotTone(
                        slot.source,
                        calculatedBadge,
                        copy.databaseBadge,
                        manualBadge,
                        palette,
                      );

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

function getSlotTone(
  source: TaxFormSlotSource,
  calculatedBadge: string,
  databaseBadge: string,
  manualBadge: string,
  palette: SurfaceTokens,
) {
  if (source === "database") {
    return {
      accentColor: palette.accent,
      badgeLabel: databaseBadge,
    };
  }

  if (source === "calculated") {
    return {
      accentColor: calculatedLegendColor,
      badgeLabel: calculatedBadge,
    };
  }

  return {
    accentColor: palette.destructive,
    badgeLabel: manualBadge,
  };
}

function LegendPill(props: { color: string; label: string }) {
  const { color, label } = props;

  return (
    <View style={[styles.legendPill, { backgroundColor: `${color}1a`, borderColor: color }]}>
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  );
}

function PageButton(props: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  palette: SurfaceTokens;
}) {
  const { isSelected, label, onPress, palette } = props;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.pageButton,
        {
          backgroundColor: isSelected ? palette.accentSoft : palette.paperMuted,
          borderColor: isSelected ? palette.accent : palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.pageButtonLabel,
          {
            color: isSelected ? palette.ink : palette.inkMuted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
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
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 132,
    paddingHorizontal: 18,
  },
  modalButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalButtonSecondary: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 132,
    paddingHorizontal: 18,
  },
  modalButtonSecondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalCard: {
    borderRadius: 26,
    borderWidth: 1,
    gap: 18,
    maxWidth: 560,
    padding: 24,
    shadowOffset: {
      height: 16,
      width: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    width: "100%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  pageButton: {
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pageButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  pageButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  previewHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    paddingRight: 16,
  },
  previewModalScreen: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 20,
  },
  previewValue: {
    fontSize: 17,
    fontWeight: "800",
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
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  slotPill: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  slotStack: {
    gap: 12,
  },
  slotTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  sourceLine: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "800",
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
  },
  zoomButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomButtonLabel: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: -2,
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
  },
  zoomRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  zoomValueButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: 10,
  },
  zoomValueLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
});
