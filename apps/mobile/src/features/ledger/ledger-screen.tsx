import { Ionicons } from "@expo/vector-icons";
import {
  LedgerGeneralLedgerDetailModal,
  LedgerReportBody,
  type LedgerReportCopy,
} from "@ledgerly/ui";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CfoAvatar } from "../../components/cfo-avatar";
import { useAppShell } from "../app-shell/provider";
import { getButtonColors, withAlpha } from "../app-shell/theme-utils";
import type {
  GeneralLedgerEntry,
  LedgerPeriodOption,
  LedgerScopeId,
  LedgerScreenSnapshot,
  LedgerViewId,
} from "./ledger-reporting";
import { getLedgerRuntimeCopy } from "./ledger-localization";
import { LedgerTaxHelper } from "./ledger-tax-helper";
import { useLedgerScreen } from "./use-ledger-screen";
import {
  buildLedgerPeriodIdForYearAndSegment,
  getAvailableQuarterPickerOptions,
  type LedgerQuarterPickerOption,
  type LedgerQuarterSegmentId,
} from "./ledger-screen-state";
import { useBusinessLedgerReports } from "./use-business-ledger-reports";

export function LedgerScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const screenCopy = copy.ledgerScreen;
  const ledgerCopy = copy.ledger;
  const runtimeCopy = getLedgerRuntimeCopy(resolvedLocale);
  const primaryButton = getButtonColors(palette, "primary");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] =
    useState<GeneralLedgerEntry | null>(null);
  const [pickerStep, setPickerStep] = useState<"month" | "quarter" | "year">(
    "year",
  );
  const [draftQuarterId, setDraftQuarterId] =
    useState<LedgerQuarterSegmentId | null>(null);
  const [draftYearId, setDraftYearId] = useState<string>("");
  const {
    error,
    isLoaded,
    isRefreshing,
    refresh,
    selectPeriodId,
    selectScope,
    selectView,
    selectedScope,
    selectedView,
    selectedYearId,
    snapshot,
  } = useLedgerScreen();

  const selectedPeriod = snapshot.selectedPeriod;
  const businessReports = useBusinessLedgerReports({
    reloadToken: `${selectedPeriod.id}:${isRefreshing ? "refreshing" : "steady"}`,
    selectedPeriod,
    selectedScope,
  });
  const effectiveError =
    error ??
    (selectedScope === "business" && businessReports.status === "error"
      ? businessReports.error
      : null);
  const isReportBodyLoading =
    selectedScope === "business" && businessReports.status === "loading";
  const activeSnapshot: LedgerScreenSnapshot =
    selectedScope === "business" && businessReports.status === "ready"
      ? businessReports.snapshot
      : snapshot;
  const reportCopy = useMemo<LedgerReportCopy>(
    () => ({
      cashAndBankLabel: runtimeCopy.journal.cashAndBank,
      fields: {
        amount: copy.ledger.parse.fieldAmount,
        date: copy.ledger.parse.fieldDate,
        description: copy.ledger.parse.fieldDescription,
        source: copy.ledger.parse.fieldSource,
        target: copy.ledger.parse.fieldTarget,
      },
      recordCard: {
        emptyValue: screenCopy.recordCard.emptyValue,
        equationResult: screenCopy.recordCard.equationResult,
        equationTitle: screenCopy.recordCard.equationTitle,
        memo: screenCopy.recordCard.memo,
        nonOwnerRule: screenCopy.recordCard.nonOwnerRule,
        ownerRule: screenCopy.recordCard.ownerRule,
        recordId: screenCopy.recordCard.recordId,
        side: screenCopy.recordCard.side,
        title: screenCopy.recordCard.title,
      },
      sections: {
        assets: screenCopy.sections.assets,
        credit: screenCopy.sections.credit,
        debit: screenCopy.sections.debit,
        equity: screenCopy.sections.equity,
        expenses: screenCopy.sections.expenses,
        journalPersonal: screenCopy.sections.journalPersonal,
        journalRecent: screenCopy.sections.journalRecent,
        liabilities: screenCopy.sections.liabilities,
        netIncome: screenCopy.sections.netIncome,
        netIncomeSummary: screenCopy.sections.netIncomeSummary,
        pnlOnlyBody: screenCopy.sections.pnlOnlyBody,
        pnlOnlyTitle: screenCopy.sections.pnlOnlyTitle,
        revenue: screenCopy.sections.revenue,
      },
    }),
    [copy.ledger.parse, runtimeCopy.journal.cashAndBank, screenCopy],
  );
  const hasSelectablePeriods = snapshot.yearOptions.length > 0;
  const ledgerViews: ReadonlyArray<{ id: LedgerViewId; label: string }> = [
    { id: "general-ledger", label: screenCopy.sections.viewJournal },
    { id: "balance-sheet", label: screenCopy.sections.viewBalance },
    { id: "profit-loss", label: screenCopy.sections.viewPnl },
  ];
  const ledgerScopes: ReadonlyArray<{
    accessibilityLabel: string;
    icon: keyof typeof Ionicons.glyphMap;
    id: LedgerScopeId;
    label: string;
  }> = [
    {
      accessibilityLabel: screenCopy.scopes.businessA11y,
      icon: "briefcase-outline",
      id: "business",
      label: screenCopy.scopes.business,
    },
    {
      accessibilityLabel: screenCopy.scopes.personalA11y,
      icon: "person-outline",
      id: "personal",
      label: screenCopy.scopes.personal,
    },
  ];
  const selectedQuarterId = useMemo(
    () => getQuarterIdForSegment(selectedPeriod.segmentId),
    [selectedPeriod.segmentId],
  );
  const monthOptions = useMemo(
    () =>
      draftQuarterId
        ? snapshot.periodOptions.filter(
            (option) =>
              option.year === Number(draftYearId) &&
              option.segmentId.startsWith("m") &&
              getQuarterIdForSegment(option.segmentId) === draftQuarterId,
          )
        : [],
    [draftQuarterId, draftYearId, snapshot.periodOptions],
  );
  const quarterOptions = useMemo(
    () => getAvailableQuarterPickerOptions(snapshot.periodOptions, draftYearId),
    [draftYearId, snapshot.periodOptions],
  );

  useEffect(() => {
    if (!hasSelectablePeriods && isSelectorOpen) {
      closeSelector();
    }
  }, [hasSelectablePeriods, isSelectorOpen]);

  const openSelector = () => {
    if (!hasSelectablePeriods) {
      return;
    }

    setDraftYearId(selectedYearId);
    setDraftQuarterId(selectedQuarterId);
    setPickerStep("year");
    setIsSelectorOpen(true);
  };

  const closeSelector = () => {
    setIsSelectorOpen(false);
    setPickerStep("year");
    setDraftQuarterId(null);
    setDraftYearId("");
  };

  const handleYearChoice = (yearId: string) => {
    setDraftYearId(yearId);
    setDraftQuarterId(null);
    setPickerStep("quarter");
  };

  const handleWholeYearChoice = (yearId: string) => {
    const nextPeriodId = buildLedgerPeriodIdForYearAndSegment(
      yearId,
      "full-year",
    );

    if (!nextPeriodId) {
      return;
    }

    selectPeriodId(nextPeriodId);
    closeSelector();
  };

  const handleQuarterChoice = (quarterId: LedgerQuarterSegmentId) => {
    setDraftQuarterId(quarterId);
    setPickerStep("month");
  };

  const handleWholeQuarterChoice = (quarterId: LedgerQuarterSegmentId) => {
    const nextPeriodId = buildLedgerPeriodIdForYearAndSegment(
      draftYearId,
      quarterId,
    );

    if (!nextPeriodId) {
      return;
    }

    selectPeriodId(nextPeriodId);
    closeSelector();
  };

  const handleMonthChoice = (period: LedgerPeriodOption) => {
    selectPeriodId(period.id);
    closeSelector();
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="ledger-screen"
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: palette.shell }]}
        refreshControl={
          <RefreshControl onRefresh={refresh} refreshing={isRefreshing} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <CfoAvatar size={32} />
            <Text style={[styles.brand, { color: palette.ink }]}>
              {copy.common.appName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/ledger/upload")}
            style={({ pressed }) => [
              styles.headerUploadButton,
              {
                backgroundColor: pressed
                  ? primaryButton.pressedBackground
                  : primaryButton.background,
                borderColor: primaryButton.border,
              },
            ]}
            testID="ledger-header-upload-button"
          >
            <Ionicons
              color={primaryButton.text}
              name={Platform.OS === "web" ? "open-outline" : "cloud-upload-outline"}
              size={16}
            />
            <Text
              style={[
                styles.headerUploadButtonLabel,
                { color: primaryButton.text },
              ]}
            >
              {ledgerCopy.primaryAction}
            </Text>
          </Pressable>
        </View>

        <View style={styles.topControls}>
          <View style={styles.topControlsMainColumn}>
            <View style={styles.periodHeader}>
              <Pressable
                accessibilityRole="button"
                disabled={!hasSelectablePeriods}
                onPress={hasSelectablePeriods ? openSelector : undefined}
                style={({ pressed }) => [
                  styles.periodCard,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                  },
                  !hasSelectablePeriods ? styles.periodCardDisabled : null,
                  pressed && hasSelectablePeriods
                    ? styles.periodCardPressed
                    : null,
                ]}
                testID="ledger-period-picker-button"
              >
                <View style={styles.periodCopy}>
                  <Text style={[styles.periodEyebrow, { color: palette.inkMuted }]}>
                    {screenCopy.range.reportingRange}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    numberOfLines={1}
                    style={[styles.periodTitle, { color: palette.ink }]}
                  >
                    {selectedPeriod.label}
                  </Text>
                  <Text style={[styles.periodSummary, { color: palette.inkMuted }]}>
                    {selectedPeriod.summary}
                  </Text>
                </View>
                <Ionicons color={palette.ink} name="chevron-forward" size={18} />
              </Pressable>
            </View>

            <View
              style={[
                styles.scopeSwitch,
                { backgroundColor: palette.paper, borderColor: palette.border },
              ]}
              testID="ledger-scope-switch"
            >
              {ledgerScopes.map((scope) => {
                const isActive = scope.id === selectedScope;

                return (
                  <Pressable
                    key={scope.id}
                    accessibilityLabel={scope.accessibilityLabel}
                    accessibilityRole="button"
                    onPress={() => selectScope(scope.id)}
                    style={({ pressed }) => [
                      styles.scopePill,
                      !isActive && pressed
                        ? { backgroundColor: palette.paperMuted }
                        : null,
                      isActive
                        ? [
                            styles.scopePillActive,
                            {
                              backgroundColor: primaryButton.background,
                              borderColor: primaryButton.border,
                              borderWidth: 1,
                            },
                          ]
                        : null,
                      pressed ? styles.scopePillPressed : null,
                    ]}
                  >
                    <Ionicons
                      color={isActive ? primaryButton.text : palette.ink}
                      name={scope.icon}
                      size={15}
                    />
                    <Text
                      style={[
                        styles.scopePillLabel,
                        {
                          color: isActive ? primaryButton.text : palette.ink,
                        },
                      ]}
                    >
                      {scope.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.segmentedControl,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            {ledgerViews.map((tab) => {
              const isActive = tab.id === selectedView;

              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="button"
                  onPress={() => selectView(tab.id)}
                  style={({ pressed }) => [
                    styles.segmentedItem,
                    !isActive && pressed
                      ? { backgroundColor: palette.paperMuted }
                      : null,
                    isActive
                      ? [
                          styles.segmentedItemActive,
                          {
                            backgroundColor: primaryButton.background,
                            borderColor: primaryButton.border,
                            borderWidth: 1,
                          },
                        ]
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentedLabel,
                      {
                        color: isActive ? primaryButton.text : palette.ink,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!isLoaded || isReportBodyLoading ? (
          <StatusCard
            body={screenCopy.sections.preparingBody}
            title={screenCopy.sections.preparingTitle}
          />
        ) : effectiveError ? (
          <StatusCard
            actionLabel={
              isRefreshing
                ? screenCopy.sections.retrying
                : screenCopy.sections.retry
            }
            body={effectiveError}
            disabled={isRefreshing}
            onPress={() => {
              void refresh();
            }}
            title={screenCopy.sections.unavailableTitle}
          />
        ) : activeSnapshot.isEmpty ? (
          <StatusCard
            body={
              selectedScope === "personal"
                ? screenCopy.sections.noPersonalBody
                : screenCopy.sections.noBusinessBody
            }
            title={
              selectedScope === "personal"
                ? screenCopy.sections.noPersonalTitle
                : screenCopy.sections.noBusinessTitle
            }
          />
        ) : (
          <LedgerReportBody
            copy={reportCopy}
            onSelectEntry={(entry) => {
              setSelectedEntry(entry as GeneralLedgerEntry);
            }}
            palette={palette}
            selectedScope={selectedScope}
            selectedView={selectedView}
            snapshot={activeSnapshot}
            testID={`ledger-${selectedScope}-${selectedView}-report-body`}
          />
        )}

        <LedgerTaxHelper
          selectedScope={selectedScope}
          yearOptions={snapshot.yearOptions}
        />

        <View style={styles.endCap}>
          <View
            style={[
              styles.endCapBar,
              {
                backgroundColor: withAlpha(
                  palette.ink,
                  palette.name === "dark" ? 0.18 : 0.1,
                ),
              },
            ]}
          />
          <Text style={[styles.endCapLabel, { color: palette.inkMuted }]}>
            {snapshot.hasData
              ? `${selectedScope === "personal" ? screenCopy.footer.personalRange : screenCopy.footer.reportingRange} · ${selectedPeriod.summary}`
              : selectedScope === "personal"
                ? screenCopy.footer.emptyPersonal
                : screenCopy.footer.emptyBusiness}
          </Text>
        </View>
      </ScrollView>

      <LedgerPeriodPickerModal
        currentPeriod={selectedPeriod}
        draftQuarterId={draftQuarterId}
        draftYearId={draftYearId}
        isOpen={isSelectorOpen}
        monthOptions={monthOptions}
        onClose={closeSelector}
        onMonthChoice={handleMonthChoice}
        onQuarterChoice={handleQuarterChoice}
        onWholeQuarterChoice={handleWholeQuarterChoice}
        onWholeYearChoice={handleWholeYearChoice}
        onYearChoice={handleYearChoice}
        pickerStep={pickerStep}
        quarterOptions={quarterOptions}
        screenCopy={screenCopy}
        yearOptions={snapshot.yearOptions}
      />
      <LedgerGeneralLedgerDetailModal
        copy={reportCopy}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        palette={palette}
      />
    </SafeAreaView>
  );
}

function LedgerPeriodPickerModal({
  currentPeriod,
  draftQuarterId,
  draftYearId,
  isOpen,
  monthOptions,
  onClose,
  onMonthChoice,
  onQuarterChoice,
  onWholeQuarterChoice,
  onWholeYearChoice,
  onYearChoice,
  pickerStep,
  quarterOptions,
  screenCopy,
  yearOptions,
}: {
  currentPeriod: LedgerPeriodOption;
  draftQuarterId: LedgerQuarterSegmentId | null;
  draftYearId: string;
  isOpen: boolean;
  monthOptions: readonly LedgerPeriodOption[];
  onClose: () => void;
  onMonthChoice: (period: LedgerPeriodOption) => void;
  onQuarterChoice: (quarterId: LedgerQuarterSegmentId) => void;
  onWholeQuarterChoice: (quarterId: LedgerQuarterSegmentId) => void;
  onWholeYearChoice: (yearId: string) => void;
  onYearChoice: (yearId: string) => void;
  pickerStep: "month" | "quarter" | "year";
  quarterOptions: readonly LedgerQuarterPickerOption[];
  screenCopy: ReturnType<typeof useAppShell>["copy"]["ledgerScreen"];
  yearOptions: readonly { id: string; label: string; year: number }[];
}) {
  const { palette } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={isOpen}
    >
      <View
        style={[
          styles.modalBackdrop,
          {
            backgroundColor: withAlpha(
              palette.ink,
              palette.name === "dark" ? 0.52 : 0.28,
            ),
          },
        ]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: palette.shellMuted },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={[styles.modalEyebrow, { color: palette.inkMuted }]}>
                {screenCopy.modal.pickerEyebrow}
              </Text>
              <Text style={[styles.modalTitle, { color: palette.ink }]}>
                {screenCopy.modal.chooseRange}
              </Text>
              <Text style={[styles.modalSummary, { color: palette.inkMuted }]}>
                {currentPeriod.label} · {currentPeriod.summary}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons color={palette.ink} name="close" size={18} />
            </Pressable>
          </View>

          <View style={styles.modalStepRail}>
            <StepPill
              active={pickerStep === "year"}
              label={screenCopy.modal.stepYear}
            />
            <StepPill
              active={pickerStep === "quarter"}
              label={screenCopy.modal.stepQuarter}
            />
            <StepPill
              active={pickerStep === "month"}
              label={screenCopy.modal.stepMonth}
            />
          </View>

          {pickerStep === "year" ? (
            <>
              <Text style={[styles.modalSectionTitle, { color: palette.ink }]}>
                {screenCopy.modal.yearTitle}
              </Text>
              <View style={styles.modalGrid}>
                {yearOptions.map((option) => (
                  <View key={option.id} style={styles.modalGridCell}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onYearChoice(option.id)}
                      style={({ pressed }) => [
                        styles.modalBlock,
                        {
                          backgroundColor: palette.paper,
                          borderColor: palette.border,
                        },
                        option.id === String(currentPeriod.year)
                          ? [
                              styles.modalBlockActive,
                              {
                                backgroundColor: primaryButton.background,
                                borderColor: primaryButton.border,
                              },
                            ]
                          : null,
                        pressed ? styles.modalBlockPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalBlockTitle,
                          {
                            color:
                              option.id === String(currentPeriod.year)
                                ? primaryButton.text
                                : palette.ink,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.modalBlockNote,
                          {
                            color:
                              option.id === String(currentPeriod.year)
                                ? withAlpha(primaryButton.text, 0.82)
                                : palette.inkMuted,
                          },
                        ]}
                      >
                        {screenCopy.modal.openQuarters}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onWholeYearChoice(option.id)}
                      style={({ pressed }) => [
                        styles.modalSubAction,
                        {
                          backgroundColor: pressed
                            ? palette.paperMuted
                            : palette.shellElevated,
                        },
                        pressed ? styles.modalSubActionPressed : null,
                      ]}
                    >
                      <Text
                        style={[styles.modalSubActionLabel, { color: palette.ink }]}
                      >
                        {option.label} · {screenCopy.range.fullYear}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {pickerStep === "quarter" ? (
            <>
              <Text style={[styles.modalSectionTitle, { color: palette.ink }]}>
                {screenCopy.modal.quarterTitle}
              </Text>
              <Text
                style={[styles.modalSectionSummary, { color: palette.inkMuted }]}
              >
                {screenCopy.modal.quarterHint}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onWholeYearChoice(draftYearId)}
                style={({ pressed }) => [
                  styles.modalDefaultChoice,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                  },
                  pressed ? styles.modalDefaultChoicePressed : null,
                ]}
              >
                <Text
                  style={[styles.modalDefaultChoiceTitle, { color: palette.ink }]}
                >
                  {draftYearId} · {screenCopy.range.fullYear}
                </Text>
                <Text
                  style={[styles.modalDefaultChoiceNote, { color: palette.inkMuted }]}
                >
                  {screenCopy.modal.reviewFullYear}
                </Text>
              </Pressable>
              <View style={styles.modalGrid}>
                {quarterOptions.map((quarterOption) => (
                  <View key={quarterOption.id} style={styles.modalGridCell}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onQuarterChoice(quarterOption.id)}
                      style={({ pressed }) => [
                        styles.modalBlock,
                        {
                          backgroundColor: palette.paper,
                          borderColor: palette.border,
                        },
                        quarterOption.id === draftQuarterId
                          ? [
                              styles.modalBlockActive,
                              {
                                backgroundColor: primaryButton.background,
                                borderColor: primaryButton.border,
                              },
                            ]
                          : null,
                        pressed ? styles.modalBlockPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalBlockTitle,
                          {
                            color:
                              quarterOption.id === draftQuarterId
                                ? primaryButton.text
                                : palette.ink,
                          },
                        ]}
                      >
                        {quarterOption.label}
                      </Text>
                      <Text
                        style={[
                          styles.modalBlockNote,
                          {
                            color:
                              quarterOption.id === draftQuarterId
                                ? withAlpha(primaryButton.text, 0.82)
                                : palette.inkMuted,
                          },
                        ]}
                      >
                        {screenCopy.modal.openMonths}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onWholeQuarterChoice(quarterOption.id)}
                      style={({ pressed }) => [
                        styles.modalSubAction,
                        {
                          backgroundColor: pressed
                            ? palette.paperMuted
                            : palette.shellElevated,
                        },
                        pressed ? styles.modalSubActionPressed : null,
                      ]}
                    >
                      <Text
                        style={[styles.modalSubActionLabel, { color: palette.ink }]}
                      >
                        {quarterOption.label} · {screenCopy.range.fullQuarter}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {pickerStep === "month" ? (
            <>
              <Text style={[styles.modalSectionTitle, { color: palette.ink }]}>
                {screenCopy.modal.monthTitle}
              </Text>
              <Text
                style={[styles.modalSectionSummary, { color: palette.inkMuted }]}
              >
                {screenCopy.modal.monthHint}
              </Text>
              {draftQuarterId ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onWholeQuarterChoice(draftQuarterId)}
                  style={({ pressed }) => [
                    styles.modalDefaultChoice,
                    {
                      backgroundColor: palette.paper,
                      borderColor: palette.border,
                    },
                    pressed ? styles.modalDefaultChoicePressed : null,
                  ]}
                >
                  <Text
                    style={[styles.modalDefaultChoiceTitle, { color: palette.ink }]}
                  >
                    {draftQuarterId.toUpperCase()} {draftYearId} ·{" "}
                    {screenCopy.range.fullQuarter}
                  </Text>
                  <Text
                    style={[styles.modalDefaultChoiceNote, { color: palette.inkMuted }]}
                  >
                    {screenCopy.modal.reviewFullQuarter}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.modalGrid}>
                {monthOptions.map((period) => (
                  <Pressable
                    key={period.id}
                    accessibilityRole="button"
                    onPress={() => onMonthChoice(period)}
                    style={({ pressed }) => [
                      styles.modalBlock,
                      {
                        backgroundColor: palette.paper,
                        borderColor: palette.border,
                      },
                      period.id === currentPeriod.id
                        ? [
                            styles.modalBlockActive,
                            {
                              backgroundColor: primaryButton.background,
                              borderColor: primaryButton.border,
                            },
                          ]
                        : null,
                      styles.modalMonthBlock,
                      pressed ? styles.modalBlockPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalBlockTitle,
                        {
                          color:
                            period.id === currentPeriod.id
                              ? primaryButton.text
                              : palette.ink,
                        },
                      ]}
                    >
                      {period.label}
                    </Text>
                    <Text
                      style={[
                        styles.modalBlockNote,
                        {
                          color:
                            period.id === currentPeriod.id
                              ? withAlpha(primaryButton.text, 0.82)
                              : palette.inkMuted,
                        },
                      ]}
                    >
                      {period.summary}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  const { palette } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");

  return (
    <View
      style={[
        styles.modalStepPill,
        {
          backgroundColor: palette.paper,
          borderColor: palette.border,
        },
        active
          ? [
              styles.modalStepPillActive,
              {
                backgroundColor: primaryButton.background,
                borderColor: primaryButton.border,
              },
            ]
          : null,
      ]}
    >
      <Text
        style={[
          styles.modalStepLabel,
          { color: active ? primaryButton.text : palette.inkMuted },
          active ? styles.modalStepLabelActive : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getQuarterIdForSegment(
  segmentId: LedgerPeriodOption["segmentId"],
): LedgerQuarterSegmentId | null {
  if (
    segmentId === "q1" ||
    segmentId === "m01" ||
    segmentId === "m02" ||
    segmentId === "m03"
  ) {
    return "q1";
  }

  if (
    segmentId === "q2" ||
    segmentId === "m04" ||
    segmentId === "m05" ||
    segmentId === "m06"
  ) {
    return "q2";
  }

  if (
    segmentId === "q3" ||
    segmentId === "m07" ||
    segmentId === "m08" ||
    segmentId === "m09"
  ) {
    return "q3";
  }

  if (
    segmentId === "q4" ||
    segmentId === "m10" ||
    segmentId === "m11" ||
    segmentId === "m12"
  ) {
    return "q4";
  }

  return null;
}

function StatusCard({
  actionLabel,
  body,
  disabled,
  onPress,
  title,
}: {
  actionLabel?: string;
  body: string;
  disabled?: boolean;
  onPress?: () => void;
  title: string;
}) {
  const { palette } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");

  return (
    <View style={[styles.statusCard, { backgroundColor: palette.paper, borderColor: palette.border }]}>
      <Text style={[styles.statusTitle, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.statusBody, { color: palette.inkMuted }]}>{body}</Text>
      {actionLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.statusButton,
            {
              backgroundColor: disabled
                ? primaryButton.disabledBackground
                : pressed
                  ? primaryButton.pressedBackground
                  : primaryButton.background,
            },
            pressed ? styles.statusButtonPressed : null,
            disabled ? styles.statusButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.statusButtonLabel,
              { color: disabled ? primaryButton.disabledText : primaryButton.text },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 20,
    fontWeight: "800",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  container: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  endCap: {
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
  },
  headerUploadButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerUploadButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  endCapBar: {
    backgroundColor: "rgba(26, 54, 93, 0.1)",
    borderRadius: 999,
    height: 32,
    width: 4,
  },
  endCapLabel: {
    color: "rgba(0, 32, 69, 0.45)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1,
    lineHeight: 16,
    textAlign: "center",
    textTransform: "uppercase",
  },
  equationCard: {
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  equationEyebrow: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  equationSummary: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 13,
    lineHeight: 18,
  },
  equationTitle: {
    color: "#002045",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  metricAccentBar: {
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
    bottom: 18,
    height: 40,
    left: 0,
    position: "absolute",
    width: 4,
  },
  metricAccentDanger: {
    backgroundColor: "#BA1A1A",
  },
  metricAccentNeutral: {
    backgroundColor: "#002045",
  },
  metricAccentSuccess: {
    backgroundColor: "#45664A",
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 114,
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricLabel: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  metricValue: {
    color: "#002045",
    flexShrink: 1,
    fontVariant: ["tabular-nums"],
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  netIncomeValue: {
    color: "#002045",
    fontVariant: ["tabular-nums"],
    fontSize: 28,
    fontWeight: "800",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 32, 69, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalBlock: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  modalBlockActive: {
    backgroundColor: "#002045",
    borderColor: "#002045",
  },
  modalBlockNote: {
    color: "rgba(0, 32, 69, 0.58)",
    fontSize: 12,
    lineHeight: 17,
  },
  modalBlockNoteActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  modalBlockPressed: {
    opacity: 0.86,
  },
  modalBlockTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
  },
  modalBlockTitleActive: {
    color: "#FFFFFF",
  },
  modalCard: {
    backgroundColor: "#F9F9F7",
    borderRadius: 28,
    gap: 16,
    maxHeight: "84%",
    padding: 20,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalDefaultChoice: {
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  modalDefaultChoiceNote: {
    color: "rgba(0, 32, 69, 0.58)",
    fontSize: 12,
    lineHeight: 17,
  },
  modalDefaultChoicePressed: {
    opacity: 0.86,
  },
  modalDefaultChoiceTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
  },
  modalEyebrow: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modalGridCell: {
    gap: 8,
    width: "47%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  modalMonthBlock: {
    width: "47%",
  },
  modalSectionSummary: {
    color: "rgba(0, 32, 69, 0.58)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  modalSectionTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
  },
  modalStepLabel: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  modalStepLabelActive: {
    color: "#FFFFFF",
  },
  modalStepPill: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalStepPillActive: {
    backgroundColor: "#002045",
    borderColor: "#002045",
  },
  modalStepRail: {
    flexDirection: "row",
    gap: 8,
  },
  modalSubAction: {
    alignItems: "center",
    backgroundColor: "rgba(0, 32, 69, 0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalSubActionLabel: {
    color: "#002045",
    fontSize: 12,
    fontWeight: "700",
  },
  modalSubActionPressed: {
    opacity: 0.75,
  },
  modalSummary: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 13,
    lineHeight: 18,
  },
  modalTitle: {
    color: "#002045",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  periodChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    marginRight: 10,
    minWidth: 156,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  periodChipActive: {
    backgroundColor: "#002045",
    borderColor: "#002045",
  },
  periodChipLabel: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
  },
  periodChipLabelActive: {
    color: "#FFFFFF",
  },
  periodChipSummary: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 11,
    lineHeight: 16,
  },
  periodChipSummaryActive: {
    color: "rgba(255, 255, 255, 0.82)",
  },
  periodCopy: {
    flex: 1,
    gap: 4,
  },
  periodEyebrow: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  periodHeader: {
    alignItems: "stretch",
  },
  periodCard: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 92,
    padding: 14,
  },
  periodCardDisabled: {
    opacity: 0.72,
  },
  periodCardPressed: {
    opacity: 0.92,
  },
  periodSelectorContent: {
    paddingRight: 14,
  },
  yearChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 84,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  yearChipLabel: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  periodSummary: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 12,
    lineHeight: 17,
  },
  periodTitle: {
    color: "#002045",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  signalChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  signalChipLabel: {
    color: "#002045",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  signalChipNegative: {
    backgroundColor: "rgba(186, 26, 26, 0.12)",
  },
  signalChipPositive: {
    backgroundColor: "rgba(69, 102, 74, 0.12)",
  },
  groupedRecordCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  groupedRecordAmount: {
    fontVariant: ["tabular-nums"],
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  groupedRecordAmountNegative: {
    color: "#BA1A1A",
  },
  groupedRecordAmountPositive: {
    color: "#45664A",
  },
  groupedRecordMetaCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  groupedRecordMetaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  groupedRecordSummary: {
    color: "rgba(0, 32, 69, 0.58)",
    fontSize: 12,
    lineHeight: 17,
  },
  groupedRecordTitle: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  equationDetailBody: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 13,
    lineHeight: 19,
  },
  equationBreakdownAmount: {
    color: "#002045",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    textAlign: "right",
  },
  equationBreakdownAmountDanger: {
    color: "#BA1A1A",
  },
  equationBreakdownAmountSuccess: {
    color: "#45664A",
  },
  equationBreakdownLabel: {
    color: "#002045",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  equationBreakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  equationBreakdownStack: {
    marginTop: 2,
  },
  equationDetailCard: {
    backgroundColor: "#F4F9FF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  equationDetailFormula: {
    color: "#002045",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  equationDetailTitle: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "800",
  },
  recordFieldLabel: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  recordFieldRow: {
    gap: 4,
  },
  recordFieldStack: {
    gap: 14,
  },
  recordFieldValue: {
    color: "#002045",
    fontSize: 14,
    lineHeight: 20,
  },
  recordModalCard: {
    backgroundColor: "#F9F9F7",
    borderRadius: 28,
    gap: 18,
    maxHeight: "80%",
    padding: 20,
  },
  postingLineAmount: {
    color: "#002045",
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  postingLineAmountNegative: {
    color: "#BA1A1A",
  },
  postingLineAmountPositive: {
    color: "#45664A",
  },
  postingLineDate: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  postingLineCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  postingLineDetail: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 13,
    lineHeight: 18,
  },
  listRowSplit: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: 1,
  },
  postingLineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  postingLineRowPressed: {
    backgroundColor: "rgba(0, 32, 69, 0.03)",
  },
  postingLineRight: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 116,
    width: 116,
  },
  postingLineStack: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: 1,
  },
  postingLineTitle: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "800",
  },
  safeArea: {
    flex: 1,
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionMeta: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionStack: {
    gap: 12,
  },
  sectionTitle: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "800",
  },
  segmentedControl: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "column",
    gap: 4,
    padding: 4,
    width: 132,
  },
  segmentedItem: {
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  segmentedItemActive: {
    backgroundColor: "#002045",
  },
  segmentedLabel: {
    color: "rgba(0, 32, 69, 0.5)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentedLabelActive: {
    color: "#FFFFFF",
  },
  sheetAmount: {
    color: "#002045",
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
    fontSize: 15,
    fontWeight: "800",
    maxWidth: "36%",
    textAlign: "right",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  sheetCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sheetHeader: {
    borderBottomColor: "rgba(0, 32, 69, 0.08)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sheetLabel: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetNote: {
    color: "rgba(0, 32, 69, 0.56)",
    fontSize: 12,
    lineHeight: 18,
  },
  sheetRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sheetRowStack: {
    gap: 0,
  },
  sheetTitle: {
    color: "#002045",
    fontSize: 17,
    fontWeight: "800",
  },
  statusBody: {
    color: "rgba(0, 32, 69, 0.62)",
    fontSize: 14,
    lineHeight: 20,
  },
  statusButton: {
    alignSelf: "flex-start",
    backgroundColor: "#002045",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statusButtonPressed: {
    opacity: 0.85,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  statusTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionAmount: {
    color: "#002045",
    fontVariant: ["tabular-nums"],
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  transactionAmountExpense: {
    color: "#002045",
  },
  transactionAmountIncome: {
    color: "#45664A",
  },
  transactionAmountPersonal: {
    color: "#8A4B14",
  },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  transactionCardExpense: {
    borderLeftColor: "rgba(186, 26, 26, 0.18)",
    borderLeftWidth: 4,
  },
  transactionCardIncome: {
    borderLeftColor: "rgba(69, 102, 74, 0.24)",
    borderLeftWidth: 4,
  },
  transactionCardPersonal: {
    borderLeftColor: "rgba(138, 75, 20, 0.22)",
    borderLeftWidth: 4,
  },
  transactionCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  transactionHeader: {
    alignItems: "flex-start",
    borderBottomColor: "rgba(0, 32, 69, 0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  transactionIconExpense: {
    backgroundColor: "rgba(255, 218, 214, 0.28)",
  },
  transactionIconIncome: {
    backgroundColor: "rgba(195, 233, 197, 0.35)",
  },
  transactionIconPersonal: {
    backgroundColor: "rgba(255, 218, 214, 0.42)",
  },
  transactionIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  transactionMeta: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 13,
    lineHeight: 18,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "34%",
    minWidth: 92,
  },
  transactionSource: {
    color: "rgba(0, 32, 69, 0.45)",
    fontSize: 11,
    fontWeight: "600",
  },
  transactionTitle: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  topControls: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 10,
  },
  topControlsMainColumn: {
    flex: 1,
    gap: 10,
  },
  scopePill: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scopePillActive: {
    backgroundColor: "#002045",
  },
  scopePillLabel: {
    color: "rgba(0, 32, 69, 0.6)",
    fontSize: 12,
    fontWeight: "700",
  },
  scopePillLabelActive: {
    color: "#FFFFFF",
  },
  scopePillPressed: {
    opacity: 0.88,
  },
  scopeSwitch: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    padding: 5,
  },
  utilityButtonPressed: {
    backgroundColor: "#F0F4F8",
  },
});
