import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
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
import type {
  GeneralLedgerEntry,
  GeneralLedgerPostingLine,
  LedgerMetricCard,
  LedgerPeriodOption,
  LedgerScopeId,
  LedgerSectionRow,
  LedgerViewId,
} from "./ledger-reporting";
import { LedgerTaxHelper } from "./ledger-tax-helper";
import { useLedgerScreen } from "./use-ledger-screen";
import {
  buildLedgerPeriodIdForYearAndSegment,
  getAvailableQuarterPickerOptions,
  type LedgerQuarterPickerOption,
  type LedgerQuarterSegmentId,
} from "./ledger-screen-state";

export function LedgerScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const screenCopy = copy.ledgerScreen;
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
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
      style={styles.safeArea}
      testID="ledger-screen"
    >
      <ScrollView
        contentContainerStyle={styles.container}
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
        </View>

        <View style={styles.topControls}>
          <View style={styles.periodHeader}>
            <Pressable
              accessibilityRole="button"
              disabled={!hasSelectablePeriods}
              onPress={hasSelectablePeriods ? openSelector : undefined}
              style={({ pressed }) => [
                styles.periodCard,
                !hasSelectablePeriods ? styles.periodCardDisabled : null,
                pressed && hasSelectablePeriods
                  ? styles.periodCardPressed
                  : null,
              ]}
              testID="ledger-period-picker-button"
            >
              <View style={styles.periodCopy}>
                <Text style={styles.periodEyebrow}>
                  {screenCopy.range.reportingRange}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={styles.periodTitle}
                >
                  {selectedPeriod.label}
                </Text>
                <Text style={styles.periodSummary}>
                  {selectedPeriod.summary}
                </Text>
              </View>
              <Ionicons color="#002045" name="chevron-forward" size={18} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/ledger/upload")}
              style={({ pressed }) => [
                styles.utilityButton,
                pressed ? styles.utilityButtonPressed : null,
              ]}
              testID="ledger-upload-button"
            >
              <Ionicons color="#002045" name="cloud-upload-outline" size={18} />
            </Pressable>
          </View>

          <View style={styles.scopeSwitch} testID="ledger-scope-switch">
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
                    isActive ? styles.scopePillActive : null,
                    pressed ? styles.scopePillPressed : null,
                  ]}
                >
                  <Ionicons
                    color={isActive ? "#FFFFFF" : "rgba(0, 32, 69, 0.6)"}
                    name={scope.icon}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.scopePillLabel,
                      isActive ? styles.scopePillLabelActive : null,
                    ]}
                  >
                    {scope.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.segmentedControl}>
          {ledgerViews.map((tab) => {
            const isActive = tab.id === selectedView;

            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                onPress={() => selectView(tab.id)}
                style={[
                  styles.segmentedItem,
                  isActive ? styles.segmentedItemActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    isActive ? styles.segmentedLabelActive : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!isLoaded ? (
          <StatusCard
            body={screenCopy.sections.preparingBody}
            title={screenCopy.sections.preparingTitle}
          />
        ) : error ? (
          <StatusCard
            actionLabel={
              isRefreshing
                ? screenCopy.sections.retrying
                : screenCopy.sections.retry
            }
            body={error}
            disabled={isRefreshing}
            onPress={() => {
              void refresh();
            }}
            title={screenCopy.sections.unavailableTitle}
          />
        ) : snapshot.isEmpty ? (
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
          <>
            {selectedView === "general-ledger" ? (
              <>
                <MetricGrid cards={snapshot.generalLedger.metricCards} />
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {selectedScope === "personal"
                      ? screenCopy.sections.journalPersonal
                      : screenCopy.sections.journalRecent}
                  </Text>
                  <Text style={styles.sectionMeta}>
                    {snapshot.generalLedger.recordCountLabel}
                  </Text>
                </View>
                <View style={styles.sectionStack}>
                  {snapshot.generalLedger.entries.map((entry) => (
                    <GeneralLedgerCard entry={entry} key={entry.id} />
                  ))}
                </View>
              </>
            ) : null}

            {selectedView === "balance-sheet" ? (
              selectedScope === "personal" ? (
                <StatusCard
                  body={screenCopy.sections.balanceOnlyBody}
                  title={screenCopy.sections.balanceOnlyTitle}
                />
              ) : (
                <>
                  <MetricGrid cards={snapshot.balanceSheet.metricCards} />
                  <SectionCard
                    rows={snapshot.balanceSheet.assetRows}
                    title={screenCopy.sections.assets}
                  />
                  <SectionCard
                    rows={snapshot.balanceSheet.liabilityRows}
                    title={screenCopy.sections.liabilities}
                  />
                  <SectionCard
                    rows={snapshot.balanceSheet.equityRows}
                    title={screenCopy.sections.equity}
                  />
                  <View style={styles.equationCard}>
                    <Text style={styles.equationEyebrow}>
                      {screenCopy.sections.equation}
                    </Text>
                    <Text style={styles.equationTitle}>
                      {snapshot.balanceSheet.equationSummary}
                    </Text>
                    <Text style={styles.equationSummary}>
                      {snapshot.balanceSheet.netPositionLabel}
                    </Text>
                  </View>
                </>
              )
            ) : null}

            {selectedView === "profit-loss" ? (
              selectedScope === "personal" ? (
                <>
                  <MetricGrid cards={snapshot.profitAndLoss.metricCards} />
                  <StatusCard
                    body={screenCopy.sections.pnlOnlyBody}
                    title={screenCopy.sections.pnlOnlyTitle}
                  />
                </>
              ) : (
                <>
                  <MetricGrid cards={snapshot.profitAndLoss.metricCards} />
                  <SectionCard
                    rows={snapshot.profitAndLoss.revenueRows}
                    title={screenCopy.sections.revenue}
                  />
                  <SectionCard
                    rows={snapshot.profitAndLoss.expenseRows}
                    title={screenCopy.sections.expenses}
                  />
                  <View style={styles.equationCard}>
                    <Text style={styles.equationEyebrow}>
                      {screenCopy.sections.netIncome}
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      numberOfLines={1}
                      style={styles.netIncomeValue}
                    >
                      {snapshot.profitAndLoss.netIncomeLabel}
                    </Text>
                    <Text style={styles.equationSummary}>
                      {screenCopy.sections.netIncomeSummary}
                    </Text>
                  </View>
                </>
              )
            ) : null}
          </>
        )}

        <LedgerTaxHelper
          selectedScope={selectedScope}
          yearOptions={snapshot.yearOptions}
        />

        <View style={styles.endCap}>
          <View style={styles.endCapBar} />
          <Text style={styles.endCapLabel}>
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
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={isOpen}
    >
      <View style={styles.modalBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalEyebrow}>
                {screenCopy.modal.pickerEyebrow}
              </Text>
              <Text style={styles.modalTitle}>
                {screenCopy.modal.chooseRange}
              </Text>
              <Text style={styles.modalSummary}>
                {currentPeriod.label} · {currentPeriod.summary}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed ? styles.utilityButtonPressed : null,
              ]}
            >
              <Ionicons color="#002045" name="close" size={18} />
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
              <Text style={styles.modalSectionTitle}>
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
                        option.id === String(currentPeriod.year)
                          ? styles.modalBlockActive
                          : null,
                        pressed ? styles.modalBlockPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalBlockTitle,
                          option.id === String(currentPeriod.year)
                            ? styles.modalBlockTitleActive
                            : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.modalBlockNote,
                          option.id === String(currentPeriod.year)
                            ? styles.modalBlockNoteActive
                            : null,
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
                        pressed ? styles.modalSubActionPressed : null,
                      ]}
                    >
                      <Text style={styles.modalSubActionLabel}>
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
              <Text style={styles.modalSectionTitle}>
                {screenCopy.modal.quarterTitle}
              </Text>
              <Text style={styles.modalSectionSummary}>
                {screenCopy.modal.quarterHint}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onWholeYearChoice(draftYearId)}
                style={({ pressed }) => [
                  styles.modalDefaultChoice,
                  pressed ? styles.modalDefaultChoicePressed : null,
                ]}
              >
                <Text style={styles.modalDefaultChoiceTitle}>
                  {draftYearId} · {screenCopy.range.fullYear}
                </Text>
                <Text style={styles.modalDefaultChoiceNote}>
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
                        quarterOption.id === draftQuarterId
                          ? styles.modalBlockActive
                          : null,
                        pressed ? styles.modalBlockPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalBlockTitle,
                          quarterOption.id === draftQuarterId
                            ? styles.modalBlockTitleActive
                            : null,
                        ]}
                      >
                        {quarterOption.label}
                      </Text>
                      <Text
                        style={[
                          styles.modalBlockNote,
                          quarterOption.id === draftQuarterId
                            ? styles.modalBlockNoteActive
                            : null,
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
                        pressed ? styles.modalSubActionPressed : null,
                      ]}
                    >
                      <Text style={styles.modalSubActionLabel}>
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
              <Text style={styles.modalSectionTitle}>
                {screenCopy.modal.monthTitle}
              </Text>
              <Text style={styles.modalSectionSummary}>
                {screenCopy.modal.monthHint}
              </Text>
              {draftQuarterId ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onWholeQuarterChoice(draftQuarterId)}
                  style={({ pressed }) => [
                    styles.modalDefaultChoice,
                    pressed ? styles.modalDefaultChoicePressed : null,
                  ]}
                >
                  <Text style={styles.modalDefaultChoiceTitle}>
                    {draftQuarterId.toUpperCase()} {draftYearId} ·{" "}
                    {screenCopy.range.fullQuarter}
                  </Text>
                  <Text style={styles.modalDefaultChoiceNote}>
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
                      period.id === currentPeriod.id
                        ? styles.modalBlockActive
                        : null,
                      styles.modalMonthBlock,
                      pressed ? styles.modalBlockPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalBlockTitle,
                        period.id === currentPeriod.id
                          ? styles.modalBlockTitleActive
                          : null,
                      ]}
                    >
                      {period.label}
                    </Text>
                    <Text
                      style={[
                        styles.modalBlockNote,
                        period.id === currentPeriod.id
                          ? styles.modalBlockNoteActive
                          : null,
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
  return (
    <View
      style={[styles.modalStepPill, active ? styles.modalStepPillActive : null]}
    >
      <Text
        style={[
          styles.modalStepLabel,
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

function MetricGrid({ cards }: { cards: readonly LedgerMetricCard[] }) {
  return (
    <View style={styles.metricGrid}>
      {cards.map((card) => (
        <View key={card.id} style={styles.metricCard}>
          <Text numberOfLines={2} style={styles.metricLabel}>
            {card.label}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            numberOfLines={1}
            style={styles.metricValue}
          >
            {card.value}
          </Text>
          <View
            style={[
              styles.metricAccentBar,
              card.accent === "danger"
                ? styles.metricAccentDanger
                : card.accent === "neutral"
                  ? styles.metricAccentNeutral
                  : styles.metricAccentSuccess,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function GeneralLedgerCard({ entry }: { entry: GeneralLedgerEntry }) {
  const cardToneStyle =
    entry.kind === "income"
      ? styles.transactionCardIncome
      : entry.kind === "personal"
        ? styles.transactionCardPersonal
        : styles.transactionCardExpense;
  const amountToneStyle =
    entry.kind === "income"
      ? styles.transactionAmountIncome
      : entry.kind === "personal"
        ? styles.transactionAmountPersonal
        : styles.transactionAmountExpense;

  return (
    <View style={[styles.transactionCard, cardToneStyle]}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIconWrap,
              entry.kind === "income"
                ? styles.transactionIconIncome
                : entry.kind === "personal"
                  ? styles.transactionIconPersonal
                  : styles.transactionIconExpense,
            ]}
          >
            <Ionicons
              color={entry.kind === "income" ? "#45664A" : "#BA1A1A"}
              name={
                entry.kind === "income"
                  ? "arrow-down-outline"
                  : "arrow-up-outline"
              }
              size={18}
            />
          </View>
          <View style={styles.transactionCopy}>
            <Text numberOfLines={2} style={styles.transactionTitle}>
              {entry.title}
            </Text>
            <Text numberOfLines={2} style={styles.transactionMeta}>
              {entry.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.transactionAmount, amountToneStyle]}
          >
            {entry.amount}
          </Text>
          <Text style={styles.transactionSource}>{entry.dateLabel}</Text>
        </View>
      </View>

      <View style={styles.postingLineStack}>
        {entry.lines.map((line, index) => (
          <PostingLine isFirst={index === 0} key={line.id} line={line} />
        ))}
      </View>
    </View>
  );
}

function PostingLine({
  isFirst,
  line,
}: {
  isFirst: boolean;
  line: GeneralLedgerPostingLine;
}) {
  const { copy } = useAppShell();
  const isDebit = line.side === "debit";

  return (
    <View
      style={[styles.postingLineRow, !isFirst ? styles.listRowSplit : null]}
    >
      <View style={styles.postingLineCopy}>
        <Text numberOfLines={1} style={styles.postingLineTitle}>
          {isDebit
            ? copy.ledgerScreen.sections.debit
            : copy.ledgerScreen.sections.credit}{" "}
          · {line.accountName}
        </Text>
        <Text numberOfLines={2} style={styles.postingLineDetail}>
          {line.detail}
        </Text>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.postingLineAmount}
      >
        {line.amount}
      </Text>
    </View>
  );
}

function SectionCard({
  rows,
  title,
}: {
  rows: readonly LedgerSectionRow[];
  title: string;
}) {
  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{title}</Text>
      </View>
      <View style={styles.sheetRowStack}>
        {rows.map((row, index) => (
          <View
            key={row.id}
            style={[styles.sheetRow, index > 0 ? styles.listRowSplit : null]}
          >
            <View style={styles.sheetCopy}>
              <Text numberOfLines={2} style={styles.sheetLabel}>
                {row.label}
              </Text>
              <Text numberOfLines={3} style={styles.sheetNote}>
                {row.note}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.sheetAmount}
            >
              {row.amount}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
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
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusBody}>{body}</Text>
      {actionLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.statusButton,
            pressed ? styles.statusButtonPressed : null,
            disabled ? styles.statusButtonDisabled : null,
          ]}
        >
          <Text style={styles.statusButtonLabel}>{actionLabel}</Text>
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
    backgroundColor: "#F9F9F7",
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
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
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
  postingLineAmount: {
    color: "#002045",
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
    fontSize: 13,
    fontWeight: "700",
    maxWidth: "34%",
    textAlign: "right",
  },
  postingLineCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  postingLineDetail: {
    color: "rgba(0, 32, 69, 0.55)",
    fontSize: 12,
    lineHeight: 17,
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
  postingLineStack: {
    borderTopColor: "rgba(0, 32, 69, 0.08)",
    borderTopWidth: 1,
  },
  postingLineTitle: {
    color: "#002045",
    fontSize: 13,
    fontWeight: "700",
  },
  safeArea: {
    backgroundColor: "#F9F9F7",
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
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segmentedItem: {
    borderRadius: 14,
    flex: 1,
    minHeight: 42,
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
  utilityButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  utilityButtonPressed: {
    backgroundColor: "#F0F4F8",
  },
});
