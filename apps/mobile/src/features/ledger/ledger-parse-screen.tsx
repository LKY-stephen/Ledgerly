import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { useBackOrHome } from "../../hooks/use-back-or-home";
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import type { ResolvedLocale } from "../app-shell/types";
import { getFeedbackColors, withAlpha } from "../app-shell/theme-utils";
import type { SurfaceTokens } from "@ledgerly/ui";
import {
  formatLedgerParseCandidateState,
  formatLedgerParseProposalType,
  formatLedgerParseWorkflowState,
} from "./ledger-parse-localization";
import type {
  DuplicateMatchedRecordSummary,
  DuplicateMergeKeepMode,
  LedgerCategory,
  LedgerReviewValues,
  WorkflowCandidateRecord,
  WorkflowWriteProposalItem,
} from "./ledger-domain";
import { getReportRouteLaunchOverrideFromCandidates } from "./report-route-state";
import { usePlannerWorkflow } from "./use-planner-workflow";

export function LedgerParseScreen() {
  const router = useRouter();
  const backOrHome = useBackOrHome();
  const { isExpanded, isMedium } = useResponsive();
  const isWide = isExpanded || isMedium;
  const isDesktopWeb = Platform.OS === "web" && isExpanded;
  const { copy, palette, profileInfo, resolvedLocale } = useAppShell();
  const parseCopy = copy.ledger.parse;
  const errorColors = getFeedbackColors(palette, "error");
  const successColors = getFeedbackColors(palette, "success");
  const params = useLocalSearchParams<{
    batchId?: string;
    fileName?: string;
    rawJson?: string;
    rawText?: string;
    model?: string;
    parseError?: string;
    mimeType?: string;
    parserKind?: string;
  }>();

  const batchId = params.batchId?.trim() || null;
  const fileName = params.fileName ?? parseCopy.unknownFile;
  const rawJson = params.rawJson ?? "";
  const rawText = params.rawText ?? "";
  const model = params.model ?? "";
  const parseError = params.parseError ?? "";
  const mimeType = params.mimeType?.trim() || null;
  const parserKind = params.parserKind || undefined;

  const hasData = rawJson || rawText;

  const parsedRawJson = rawJson ? tryParse(rawJson) : null;

  const {
    approveProposal,
    error: plannerError,
    isApproving,
    isPlanning,
    plannerResult,
    rejectProposal,
    review,
    selectedCandidateIndex,
    selectCandidate,
    startPlanner,
    updateField,
  } = usePlannerWorkflow({
    batchId,
    fileName,
    mimeType,
    model,
    parserKind,
    profileInfo,
    rawJson: parsedRawJson,
    rawText,
  });

  const hydratedFileName = plannerResult?.fileName?.trim() || "";
  const displayFileName = hydratedFileName || fileName;
  const hydratedRawJsonText = plannerResult?.rawJson
    ? JSON.stringify(plannerResult.rawJson, null, 2)
    : "";
  const displayRawJson = rawJson || hydratedRawJsonText;
  const displayRawText = rawText || plannerResult?.rawText || "";

  const canHydratePlanner = Boolean(batchId) && !plannerResult;
  const canStartPlanner =
    hasData && !parseError && parsedRawJson !== null && !plannerResult;
  const isPreparingReview = canStartPlanner || (isPlanning && !plannerResult);
  const canRetryPlanner =
    !plannerResult &&
    !isPlanning &&
    !parseError &&
    parsedRawJson !== null &&
    Boolean(plannerError);
  const isHydrationPending = canHydratePlanner && !plannerResult && !plannerError;
  const activeCandidate = plannerResult?.candidateRecords[selectedCandidateIndex] ?? null;
  const visibleProposals =
    plannerResult?.writeProposals.filter(
      (proposal) =>
        proposal.state === "pending_approval" &&
        (!proposal.candidateId ||
          proposal.candidateId === activeCandidate?.candidateId),
    ) ?? [];
  const [duplicateKeepModes, setDuplicateKeepModes] = useState<
    Record<string, DuplicateMergeKeepMode>
  >({});
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [showRawParse, setShowRawParse] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [shouldAutoAdvanceOpen, setShouldAutoAdvanceOpen] = useState(false);
  const categoryOptions: Array<{
    label: string;
    value: LedgerCategory;
  }> = [
    { label: parseCopy.categoryBusinessIncome, value: "income" },
    {
      label: parseCopy.categoryNonBusinessIncome,
      value: "non_business_income",
    },
    { label: parseCopy.categoryExpense, value: "expense" },
    { label: parseCopy.categoryPersonalSpending, value: "spending" },
  ];

  useEffect(() => {
    if ((!canStartPlanner && !canHydratePlanner) || isPlanning || plannerError) {
      return;
    }

    void startPlanner();
  }, [canHydratePlanner, canStartPlanner, isPlanning, plannerError, startPlanner]);

  const sortedCandidates = useMemo(() => {
    const candidates = plannerResult?.candidateRecords ?? [];

    return candidates
      .map((candidate, index) => {
        const pendingProposalCount = plannerResult?.writeProposals.filter(
          (proposal) =>
            proposal.candidateId === candidate.candidateId &&
            proposal.state === "pending_approval",
        ).length ?? 0;
        const needsAttention =
          pendingProposalCount > 0 ||
          candidate.state === "needs_review" ||
          candidate.state === "duplicate" ||
          candidate.state === "candidate";

        return {
          candidate,
          index,
          needsAttention,
          pendingProposalCount,
          sortScore: needsAttention ? 0 : 1,
        };
      })
      .sort((left, right) => left.sortScore - right.sortScore);
  }, [plannerResult]);

  const hasPendingProposals = Boolean(
    plannerResult?.writeProposals.some(
      (proposal) => proposal.state === "pending_approval",
    ),
  );
  const hasAttentionRemaining = sortedCandidates.some((item) => item.needsAttention);
  const isTerminalBatchState =
    plannerResult?.batchState === "approved" ||
    plannerResult?.batchState === "rejected" ||
    plannerResult?.batchState === "partially_approved";
  const shouldShowWaitingState = Boolean(
    plannerResult &&
      !isTerminalBatchState &&
      !hasAttentionRemaining &&
      !hasPendingProposals,
  );
  const isResolvedCompletionState = Boolean(
    plannerResult &&
      isTerminalBatchState &&
      !hasAttentionRemaining &&
      !hasPendingProposals &&
      plannerResult.batchState !== "failed",
  );
  const shouldShowReviewWorkspace = Boolean(plannerResult) && !isResolvedCompletionState;
  const reportLaunchOverride = useMemo(
    () =>
      plannerResult
        ? getReportRouteLaunchOverrideFromCandidates(plannerResult.candidateRecords)
        : null,
    [plannerResult],
  );

  useEffect(() => {
    if (!plannerResult) {
      return;
    }

    if (!hasAttentionRemaining) {
      setExpandedCandidateId(null);
      setShouldAutoAdvanceOpen(false);
      return;
    }

    if (!shouldAutoAdvanceOpen) {
      return;
    }

    const nextCandidateId =
      plannerResult.candidateRecords[selectedCandidateIndex]?.candidateId ?? null;

    if (!nextCandidateId) {
      return;
    }

    setExpandedCandidateId(nextCandidateId);
    setShowRawParse(false);
    setShouldAutoAdvanceOpen(false);
  }, [
    hasAttentionRemaining,
    plannerResult,
    selectedCandidateIndex,
    shouldAutoAdvanceOpen,
  ]);

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
          onBack={backOrHome}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
        <View
          style={[
            styles.card,
            { backgroundColor: palette.paper, borderColor: palette.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <Feather color={palette.inkMuted} name="file-text" size={16} />
            <Text
              numberOfLines={1}
              style={[styles.fileName, { color: palette.ink }]}
            >
              {displayFileName}
            </Text>
          </View>
          {model ? (
            <Text style={[styles.meta, { color: palette.inkMuted }]}>
              {parseCopy.modelLabel}: {model}
            </Text>
          ) : null}
        </View>

        {parseError ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: errorColors.background,
                borderColor: errorColors.border,
              },
            ]}
          >
            <Text style={[styles.errorTitle, { color: errorColors.text }]}>
              {parseCopy.errorTitle}
            </Text>
            <Text selectable style={[styles.errorText, { color: errorColors.text }]}>
              {parseError}
            </Text>
          </View>
        ) : null}

        {isPreparingReview ? (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
            testID="planner-preparing-card"
          >
            <View style={styles.loadingHeader}>
              <ActivityIndicator color={palette.accent} size="small" />
              <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                {parseCopy.preparingReviewTitle}
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: palette.inkMuted }]}>
              {parseCopy.preparingReviewSummary}
            </Text>
          </View>
        ) : null}

        {shouldShowWaitingState ? (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
            testID="planner-waiting-card"
          >
            <View style={styles.loadingHeader}>
              <ActivityIndicator color={palette.accent} size="small" />
              <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                {parseCopy.preparingReviewTitle}
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: palette.inkMuted }]}>
              {parseCopy.preparingReviewSummary}
            </Text>
          </View>
        ) : null}

        {plannerError ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: errorColors.background,
                borderColor: errorColors.border,
              },
            ]}
          >
            <Text style={[styles.errorTitle, { color: errorColors.text }]}>
              {parseCopy.plannerErrorTitle}
            </Text>
            <Text selectable style={[styles.errorText, { color: errorColors.text }]}>
              {plannerError}
            </Text>
            {canRetryPlanner ? (
              <Pressable
                accessibilityRole="button"
                onPress={startPlanner}
                style={({ pressed }) => [
                  styles.retryButton,
                  {
                    backgroundColor: pressed
                      ? withAlpha(palette.destructive, 0.82)
                      : palette.destructive,
                  },
                ]}
              >
                <Text style={styles.actionButtonLabel}>{parseCopy.retry}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {shouldShowReviewWorkspace && plannerResult ? (
          isWide ? (
            <View style={[styles.twoColumn, isDesktopWeb ? styles.twoColumnDesktop : null]}>
              <View style={[styles.columnLeft, isDesktopWeb ? styles.columnLeftDesktop : null]}>
                {sortedCandidates.map(({ candidate, index, needsAttention, pendingProposalCount }) => (
                  <Pressable
                    key={candidate.candidateId}
                    accessibilityRole="button"
                    onPress={() => {
                      selectCandidate(index);
                      setExpandedCandidateId(candidate.candidateId);
                    }}
                    style={[
                      styles.card,
                      isDesktopWeb ? styles.candidateCardDesktop : null,
                      {
                        backgroundColor:
                          expandedCandidateId === candidate.candidateId
                            ? palette.accentSoft
                            : palette.paper,
                        borderColor:
                          expandedCandidateId === candidate.candidateId
                            ? palette.accent
                            : palette.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.fileName, { color: palette.ink }]}>
                        {reviewLabel(candidate.reviewValues.amount, candidate.reviewValues.date)}
                      </Text>
                      <View
                        style={[
                          styles.statePill,
                          {
                            backgroundColor: needsAttention
                              ? stateColor("needs_review")
                              : palette.success,
                          },
                        ]}
                      >
                        <Text style={styles.statePillText}>
                          {pendingProposalCount > 0
                            ? `${pendingProposalCount} review`
                            : formatLedgerParseCandidateState(candidate.state, resolvedLocale)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[styles.summaryText, { color: palette.inkMuted }]}
                    >
                      {formatCounterpartyLabel(candidate.reviewValues.source, candidate.reviewValues.target)}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[styles.editFieldLabel, styles.candidateBadgeText, { color: palette.inkMuted }]}
                    >
                      {formatCategoryBadge(candidate.reviewValues.category, parseCopy)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.columnRight, isDesktopWeb ? styles.columnRightDesktop : null]}>
                {expandedCandidateId && activeCandidate ? (
                  <OpenedCandidateCard
                    activeCandidate={activeCandidate}
                    approveProposal={approveProposal}
                    categoryOptions={categoryOptions}
                    duplicateKeepModes={duplicateKeepModes}
                    isApproving={isApproving}
                    isEditOpen={isEditOpen}
                    onCloseEdit={() => setIsEditOpen(false)}
                    onOpenEdit={() => setIsEditOpen(true)}
                    onResolutionProgress={() => setShouldAutoAdvanceOpen(true)}
                    onRejectProposal={rejectProposal}
                    onToggleRawParse={() => setShowRawParse((current) => !current)}
                    palette={palette}
                    parseCopy={parseCopy}
                    resolvedLocale={resolvedLocale}
                    review={review}
                    setDuplicateKeepModes={setDuplicateKeepModes}
                    showRawParse={showRawParse}
                    updateField={updateField}
                    visibleProposals={visibleProposals}
                    displayRawJson={displayRawJson}
                    displayRawText={displayRawText}
                    mimeType={mimeType}
                  />
                ) : (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: palette.paper, borderColor: palette.border },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                      {parseCopy.editRecordTitle}
                    </Text>
                    <Text style={[styles.summaryText, { color: palette.inkMuted }]}>
                      {parseCopy.mapping}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.sectionStack}>
              {sortedCandidates.map(({ candidate, index, needsAttention, pendingProposalCount }) => {
                const expanded = expandedCandidateId === candidate.candidateId;
                const selected = index === selectedCandidateIndex;

                return (
                  <View
                    key={candidate.candidateId}
                    style={[
                      styles.card,
                      {
                        backgroundColor: palette.paper,
                        borderColor: expanded ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        selectCandidate(index);
                        setExpandedCandidateId((current) =>
                          current === candidate.candidateId ? null : candidate.candidateId,
                        );
                      }}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={[styles.fileName, { color: palette.ink }]}>
                          {reviewLabel(candidate.reviewValues.amount, candidate.reviewValues.date)}
                        </Text>
                        <View
                          style={[
                            styles.statePill,
                            {
                              backgroundColor: needsAttention
                                ? stateColor("needs_review")
                                : palette.success,
                            },
                          ]}
                        >
                          <Text style={styles.statePillText}>
                            {pendingProposalCount > 0
                              ? `${pendingProposalCount} review`
                              : formatLedgerParseCandidateState(candidate.state, resolvedLocale)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.summaryText, { color: palette.inkMuted }]}>
                        {formatCounterpartyLabel(candidate.reviewValues.source, candidate.reviewValues.target)}
                      </Text>
                      <Text style={[styles.editFieldLabel, { color: palette.inkMuted }]}>
                        {formatCategoryBadge(candidate.reviewValues.category, parseCopy)}
                      </Text>
                    </Pressable>

                    {expanded && selected ? (
                      <OpenedCandidateCard
                        activeCandidate={activeCandidate}
                        approveProposal={approveProposal}
                        categoryOptions={categoryOptions}
                        duplicateKeepModes={duplicateKeepModes}
                        isApproving={isApproving}
                        isEditOpen={isEditOpen}
                        onCloseEdit={() => setIsEditOpen(false)}
                        onOpenEdit={() => setIsEditOpen(true)}
                        onResolutionProgress={() => setShouldAutoAdvanceOpen(true)}
                        onRejectProposal={rejectProposal}
                        onToggleRawParse={() => setShowRawParse((current) => !current)}
                        palette={palette}
                        parseCopy={parseCopy}
                        resolvedLocale={resolvedLocale}
                        review={review}
                        setDuplicateKeepModes={setDuplicateKeepModes}
                        showRawParse={showRawParse}
                        updateField={updateField}
                        visibleProposals={visibleProposals}
                        displayRawJson={displayRawJson}
                        displayRawText={displayRawText}
                        mimeType={mimeType}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )
        ) : !parseError && !isHydrationPending && !isResolvedCompletionState ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>
              {parseCopy.emptyTitle}
            </Text>
            <Text style={[styles.emptySub, { color: palette.inkMuted }]}>
              {parseCopy.emptySummary}
            </Text>
          </View>
        ) : null}

        {isResolvedCompletionState ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: successColors.background,
                borderColor: successColors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: successColors.text }]}>
              {parseCopy.recordSavedTitle}
            </Text>
            <Text style={[styles.summaryText, { color: successColors.text }]}>
              {parseCopy.recordSavedSummary}
            </Text>
            <View style={styles.proposalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/ledger",
                    params: {
                      periodId: reportLaunchOverride?.periodId ?? undefined,
                      scope: reportLaunchOverride?.scope ?? undefined,
                      view: reportLaunchOverride?.view ?? undefined,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.rejectButton,
                  {
                    backgroundColor: pressed
                      ? withAlpha(palette.accent, 0.82)
                      : palette.accent,
                  },
                ]}
              >
                <Text style={styles.actionButtonLabel}>View reports</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EditField(props: {
  fieldId: string;
  label: string;
  onChangeText: (value: string) => void;
  palette: SurfaceTokens;
  value: string;
}) {
  return (
    <View style={styles.editFieldContainer}>
      <Text style={[styles.editFieldLabel, { color: props.palette.inkMuted }]}>
        {props.label}
      </Text>
      <TextInput
        onChangeText={props.onChangeText}
        style={[
          styles.editFieldInput,
          {
            backgroundColor: props.palette.shellElevated,
            borderColor: props.palette.border,
            color: props.palette.ink,
          },
        ]}
        testID={`edit-${props.fieldId}`}
        value={props.value}
      />
    </View>
  );
}

function OpenedCandidateCard(props: {
  activeCandidate: WorkflowCandidateRecord | null;
  approveProposal: (
    writeProposalId: string,
    options?: { duplicateResolution?: { keepMode: DuplicateMergeKeepMode } },
  ) => Promise<void>;
  categoryOptions: Array<{ label: string; value: LedgerCategory }>;
  displayRawJson: string;
  displayRawText: string;
  duplicateKeepModes: Record<string, DuplicateMergeKeepMode>;
  isApproving: boolean;
  isEditOpen: boolean;
  mimeType: string | null;
  onCloseEdit: () => void;
  onOpenEdit: () => void;
  onResolutionProgress: () => void;
  onRejectProposal: (writeProposalId: string) => Promise<void>;
  onToggleRawParse: () => void;
  palette: SurfaceTokens;
  parseCopy: Record<string, string>;
  resolvedLocale: ResolvedLocale;
  review: {
    amount: string;
    category: LedgerCategory;
    date: string;
    description: string;
    source: string;
    target: string;
  };
  setDuplicateKeepModes: React.Dispatch<
    React.SetStateAction<Record<string, DuplicateMergeKeepMode>>
  >;
  showRawParse: boolean;
  updateField: (field: keyof LedgerReviewValues, value: string) => void;
  visibleProposals: WorkflowWriteProposalItem[];
}) {
  const isPictureBased = Boolean(props.mimeType?.startsWith("image/"));
  const secondaryActionTextColor =
    props.palette.name === "dark" ? props.palette.ink : props.palette.paper;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: props.palette.paper, borderColor: props.palette.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.fileName, { color: props.palette.ink }]}>
          {reviewLabel(props.review.amount, props.review.date)}
        </Text>
        <View
          style={[
            styles.statePill,
            {
              backgroundColor: stateColor(props.activeCandidate?.state ?? "candidate"),
            },
          ]}
        >
          <Text style={styles.statePillText}>
            {formatLedgerParseCandidateState(
              props.activeCandidate?.state ?? "candidate",
              props.resolvedLocale,
            )}
          </Text>
        </View>
      </View>

      <RecordSummaryCard
        amount={props.review.amount}
        date={props.review.date}
        description={props.review.description}
        palette={props.palette}
        parseCopy={props.parseCopy}
        source={props.review.source}
        target={props.review.target}
        title={formatCounterpartyLabel(props.review.source, props.review.target)}
      />

      <View style={styles.proposalActions}>
        {!isPictureBased ? (
          <Pressable
            accessibilityRole="button"
            onPress={props.onOpenEdit}
            style={({ pressed }) => [
              styles.rejectButton,
              {
                backgroundColor: pressed
                  ? withAlpha(props.palette.accent, 0.82)
                  : props.palette.accent,
              },
            ]}
          >
            <Text style={[styles.actionButtonLabel, { color: props.palette.inkOnAcid }]}>
              Edit
            </Text>
          </Pressable>
        ) : null}
        {(props.displayRawJson || props.displayRawText) ? (
          <Pressable
            accessibilityRole="button"
            onPress={props.onToggleRawParse}
            style={({ pressed }) => [
              styles.rejectButton,
              {
                backgroundColor: pressed
                  ? withAlpha(props.palette.ink, 0.82)
                  : props.palette.ink,
              },
            ]}
          >
            <Text style={[styles.actionButtonLabel, { color: secondaryActionTextColor }]}>
              {props.showRawParse ? "Hide raw parse" : "View raw parse"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {props.showRawParse ? (
        <View
          style={[
            styles.jsonBox,
            {
              backgroundColor: props.palette.shellElevated,
              borderColor: props.palette.border,
            },
          ]}
        >
          <Text selectable style={[styles.jsonText, { color: props.palette.ink }]}>
            {formatJson(props.displayRawJson) || props.displayRawText || props.parseCopy.noData}
          </Text>
        </View>
      ) : null}

      {props.visibleProposals.length > 0 ? (
        <View style={styles.proposalsSection}>
          {props.visibleProposals.map((proposal) => {
            if (proposal.proposalType === "resolve_duplicate_receipt") {
              const keepMode =
                props.duplicateKeepModes[proposal.writeProposalId] ?? "keep_existing";

              return (
                <DuplicateReceiptProposalCard
                  key={proposal.writeProposalId}
                  isApproving={props.isApproving}
                  keepMode={keepMode}
                  onApprove={() => {
                    props.onResolutionProgress();
                    return props.approveProposal(proposal.writeProposalId, {
                      duplicateResolution: { keepMode },
                    });
                  }}
                  onKeepModeChange={(nextMode) =>
                    props.setDuplicateKeepModes((current) => ({
                      ...current,
                      [proposal.writeProposalId]: nextMode,
                    }))
                  }
                  onReject={() => {
                    props.onResolutionProgress();
                    return props.onRejectProposal(proposal.writeProposalId);
                  }}
                  palette={props.palette}
                  parseCopy={props.parseCopy}
                  proposal={proposal}
                  resolvedLocale={props.resolvedLocale}
                  review={props.review}
                />
              );
            }

            if (proposal.proposalType === "merge_counterparty") {
              return (
                <CounterpartyMergeProposalCard
                  key={proposal.writeProposalId}
                  isApproving={props.isApproving}
                  onApprove={() => {
                    props.onResolutionProgress();
                    return props.approveProposal(proposal.writeProposalId);
                  }}
                  onReject={() => {
                    props.onResolutionProgress();
                    return props.onRejectProposal(proposal.writeProposalId);
                  }}
                  palette={props.palette}
                  parseCopy={props.parseCopy}
                  proposal={proposal}
                  resolvedLocale={props.resolvedLocale}
                  review={props.review}
                />
              );
            }

            return (
              <GenericProposalCard
                key={proposal.writeProposalId}
                isApproving={props.isApproving}
                onApprove={() => {
                  props.onResolutionProgress();
                  return props.approveProposal(proposal.writeProposalId);
                }}
                onReject={() => {
                  props.onResolutionProgress();
                  return props.onRejectProposal(proposal.writeProposalId);
                }}
                palette={props.palette}
                parseCopy={props.parseCopy}
                proposal={proposal}
                resolvedLocale={props.resolvedLocale}
              />
            );
          })}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={props.isEditOpen}
        onRequestClose={props.onCloseEdit}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: withAlpha(
                props.palette.ink,
                props.palette.name === "dark" ? 0.52 : 0.28,
              ),
            },
          ]}
        >
          <Pressable onPress={props.onCloseEdit} style={StyleSheet.absoluteFillObject} />
          <View
            style={[
              styles.recordModalCard,
              { backgroundColor: props.palette.shellMuted, borderColor: props.palette.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalEyebrow, { color: props.palette.inkMuted }]}>
                  {props.parseCopy.editRecordTitle}
                </Text>
                <Text style={[styles.modalTitle, { color: props.palette.ink }]}>
                  {reviewLabel(props.review.amount, props.review.date)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={props.onCloseEdit}
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  {
                    backgroundColor: pressed
                      ? props.palette.paperMuted
                      : props.palette.paper,
                    borderColor: props.palette.border,
                  },
                ]}
              >
                <Feather color={props.palette.ink} name="x" size={18} />
              </Pressable>
            </View>
            <CategorySelector
              label={props.parseCopy.categoryLabel}
              options={props.categoryOptions}
              palette={props.palette}
              selectedValue={props.review.category}
              onSelect={(value) => props.updateField("category", value)}
            />
            <EditField
              fieldId="amount"
              label={props.parseCopy.fieldAmount}
              onChangeText={(value) => props.updateField("amount", value)}
              palette={props.palette}
              value={props.review.amount}
            />
            <EditField
              fieldId="date"
              label={props.parseCopy.fieldDate}
              onChangeText={(value) => props.updateField("date", value)}
              palette={props.palette}
              value={props.review.date}
            />
            <EditField
              fieldId="source"
              label={props.parseCopy.fieldSource}
              onChangeText={(value) => props.updateField("source", value)}
              palette={props.palette}
              value={props.review.source}
            />
            <EditField
              fieldId="target"
              label={props.parseCopy.fieldTarget}
              onChangeText={(value) => props.updateField("target", value)}
              palette={props.palette}
              value={props.review.target}
            />
            <EditField
              fieldId="description"
              label={props.parseCopy.fieldDescription}
              onChangeText={(value) => props.updateField("description", value)}
              palette={props.palette}
              value={props.review.description}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CategorySelector(props: {
  label: string;
  onSelect: (value: LedgerCategory) => void;
  options: Array<{ label: string; value: LedgerCategory }>;
  palette: SurfaceTokens;
  selectedValue: LedgerCategory;
}) {
  return (
    <View style={styles.editFieldContainer}>
      <Text style={[styles.editFieldLabel, { color: props.palette.inkMuted }]}>
        {props.label}
      </Text>
      <View style={styles.categoryList}>
        {props.options.map((option) => {
          const selected = option.value === props.selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => props.onSelect(option.value)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selected
                    ? props.palette.accentSoft
                    : props.palette.shellElevated,
                  borderColor: selected
                    ? props.palette.accent
                    : props.palette.border,
                },
              ]}
              testID={`category-${option.value}`}
            >
              <Text
                style={[
                  styles.categoryChipLabel,
                  {
                    color: selected ? props.palette.accent : props.palette.ink,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function GenericProposalCard(props: {
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  palette: SurfaceTokens;
  parseCopy: Record<string, string>;
  proposal: WorkflowWriteProposalItem;
  resolvedLocale: ResolvedLocale;
}) {
  return (
    <View
      style={[
        styles.proposalCard,
        {
          backgroundColor: props.palette.paper,
          borderColor: props.palette.border,
        },
      ]}
    >
      <ProposalHeader
        palette={props.palette}
        proposal={props.proposal}
        resolvedLocale={props.resolvedLocale}
      />
      <Text style={[styles.proposalRationale, { color: props.palette.inkMuted }]}>
        {props.proposal.rationale}
      </Text>
      <ProposalActions
        approveLabel={props.parseCopy.approve}
        isApproving={props.isApproving}
        onApprove={props.onApprove}
        onReject={props.onReject}
        palette={props.palette}
        proposal={props.proposal}
        rejectLabel={props.parseCopy.counterpartyReject ?? props.parseCopy.reject}
      />
    </View>
  );
}

function CounterpartyMergeProposalCard(props: {
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  palette: SurfaceTokens;
  parseCopy: Record<string, string>;
  proposal: WorkflowWriteProposalItem;
  resolvedLocale: ResolvedLocale;
  review: {
    amount: string;
    date: string;
    description: string;
    source: string;
    target: string;
  };
}) {
  const role = readProposalString(props.proposal.payload.role) === "source" ? "source" : "target";
  const relevantFieldLabel =
    role === "source" ? props.parseCopy.fieldSource : props.parseCopy.fieldTarget;
  const existingDisplayName =
    readProposalString(
      props.proposal.payload.existingDisplayName,
      props.proposal.payload.displayName,
    ) ?? "";

  return (
    <View
      style={[
        styles.proposalCard,
        {
          backgroundColor: props.palette.paper,
          borderColor: props.palette.border,
        },
      ]}
    >
      <ProposalHeader
        palette={props.palette}
        proposal={props.proposal}
        resolvedLocale={props.resolvedLocale}
      />
      <Text style={[styles.proposalRationale, { color: props.palette.inkMuted }]}>
        {props.proposal.rationale}
      </Text>
      <RecordSummaryCard
        amount={props.review.amount}
        date={props.review.date}
        description={props.review.description}
        palette={props.palette}
        parseCopy={props.parseCopy}
        source={props.review.source}
        target={props.review.target}
        title={props.parseCopy.mergeCurrentCandidateTitle}
      />
      <View
        style={[
          styles.mergeInfoCard,
          {
            backgroundColor: props.palette.shellElevated,
            borderColor: props.palette.border,
          },
        ]}
      >
        <Text style={[styles.mergeInfoTitle, { color: props.palette.ink }]}>
          {props.parseCopy.mergeExistingTargetTitle}
        </Text>
        <DetailRow
          label={relevantFieldLabel}
          palette={props.palette}
          value={existingDisplayName}
        />
      </View>
      <ProposalActions
        approveLabel={props.parseCopy.duplicateApprove ?? props.parseCopy.approve}
        isApproving={props.isApproving}
        onApprove={props.onApprove}
        onReject={props.onReject}
        palette={props.palette}
        proposal={props.proposal}
        rejectLabel={props.parseCopy.duplicateReject ?? props.parseCopy.reject}
      />
    </View>
  );
}

function DuplicateReceiptProposalCard(props: {
  isApproving: boolean;
  keepMode: DuplicateMergeKeepMode;
  onApprove: () => void;
  onKeepModeChange: (nextMode: DuplicateMergeKeepMode) => void;
  onReject: () => void;
  palette: SurfaceTokens;
  parseCopy: Record<string, string>;
  proposal: WorkflowWriteProposalItem;
  resolvedLocale: ResolvedLocale;
  review: {
    amount: string;
    date: string;
    description: string;
    source: string;
    target: string;
  };
}) {
  const matchedReceiptLabel =
    readProposalString(
      props.proposal.payload.duplicateReceiptLabel,
      props.proposal.payload.relatedEvidenceFileName,
    ) ?? "";
  const overlapEntryCount = readProposalNumber(
    props.proposal.payload.overlapEntryCount,
    props.proposal.payload.duplicateEntryCount,
    props.proposal.payload.overlappingEntryCount,
  );
  const matchedRecords = readMatchedRecordSummaries(props.proposal.payload);

  return (
    <View
      style={[
        styles.proposalCard,
        {
          backgroundColor: props.palette.paper,
          borderColor: props.palette.border,
        },
      ]}
    >
      <ProposalHeader
        palette={props.palette}
        proposal={props.proposal}
        resolvedLocale={props.resolvedLocale}
      />
      <Text style={[styles.proposalRationale, { color: props.palette.inkMuted }]}>
        {props.proposal.rationale}
      </Text>
      <View style={styles.proposalDetailList}>
        <DetailRow
          label={props.parseCopy.mergeMatchedReceiptLabel}
          palette={props.palette}
          value={matchedReceiptLabel}
        />
        {overlapEntryCount !== null ? (
          <DetailRow
            label={props.parseCopy.mergeOverlapEntriesLabel}
            palette={props.palette}
            value={String(overlapEntryCount)}
          />
        ) : null}
      </View>
      <RecordSummaryCard
        amount={props.review.amount}
        date={props.review.date}
        description={props.review.description}
        palette={props.palette}
        parseCopy={props.parseCopy}
        source={props.review.source}
        target={props.review.target}
        title={props.parseCopy.mergeCurrentCandidateTitle}
      />
      {matchedRecords.length > 0 ? (
        <View style={styles.matchedRecordsSection}>
          <Text style={[styles.mergeInfoTitle, { color: props.palette.ink }]}>
            {props.parseCopy.mergeMatchedRecordsTitle}
          </Text>
          {matchedRecords.map((record) => (
            <RecordSummaryCard
              key={record.recordId}
              amount={formatAmountCents(record.amountCents)}
              date={record.date}
              description={record.description}
              palette={props.palette}
              parseCopy={props.parseCopy}
              source={record.sourceLabel}
              target={record.targetLabel}
              title={record.recordId}
            />
          ))}
        </View>
      ) : null}
      {props.proposal.state === "pending_approval" ? (
        <View style={styles.keepChoiceSection}>
          <Text style={[styles.editFieldLabel, { color: props.palette.inkMuted }]}>
            {props.parseCopy.mergeKeepChoiceLabel}
          </Text>
          <View style={styles.keepChoiceRow}>
            {([
              ["keep_existing", props.parseCopy.mergeKeepExisting],
              ["keep_new", props.parseCopy.mergeKeepNew],
            ] as const).map(([value, label]) => {
              const selected = props.keepMode === value;

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => props.onKeepModeChange(value)}
                  style={[
                    styles.keepChoiceChip,
                    {
                      backgroundColor: selected
                        ? props.palette.accentSoft
                        : props.palette.shellElevated,
                      borderColor: selected
                        ? props.palette.accent
                        : props.palette.border,
                    },
                  ]}
                  testID={`${props.proposal.writeProposalId}-${value}`}
                >
                  <Text
                    style={[
                      styles.keepChoiceText,
                      {
                        color: selected
                          ? props.palette.ink
                          : props.palette.inkMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <ProposalActions
        approveLabel={props.parseCopy.approve}
        isApproving={props.isApproving}
        onApprove={props.onApprove}
        onReject={props.onReject}
        palette={props.palette}
        proposal={props.proposal}
        rejectLabel={props.parseCopy.reject}
      />
    </View>
  );
}

function ProposalHeader(props: {
  palette: SurfaceTokens;
  proposal: WorkflowWriteProposalItem;
  resolvedLocale: ResolvedLocale;
}) {
  return (
    <View style={styles.proposalHeader}>
      <Text style={[styles.proposalType, { color: props.palette.ink }]}>
        {formatLedgerParseProposalType(
          props.proposal.proposalType,
          props.resolvedLocale,
        )}
      </Text>
      <View
        style={[
          styles.statePill,
          { backgroundColor: proposalStateColor(props.proposal.state) },
        ]}
      >
        <Text style={styles.statePillText}>
          {formatLedgerParseWorkflowState(props.proposal.state, props.resolvedLocale)}
        </Text>
      </View>
    </View>
  );
}

function ProposalActions(props: {
  approveLabel: string;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  palette: SurfaceTokens;
  proposal: WorkflowWriteProposalItem;
  rejectLabel: string;
}) {
  if (props.proposal.state !== "pending_approval") {
    return null;
  }

  const rejectTextColor =
    props.palette.name === "dark" ? props.palette.inkOnHot : props.palette.paper;

  return (
    <View style={styles.proposalActions}>
      <Pressable
        accessibilityRole="button"
        disabled={props.isApproving}
        onPress={props.onApprove}
        style={({ pressed }) => [
          styles.approveButton,
          {
            backgroundColor: pressed
              ? withAlpha(props.palette.success, 0.82)
              : props.palette.success,
            opacity: props.isApproving ? 0.7 : 1,
          },
        ]}
        testID={`approve-${props.proposal.writeProposalId}`}
      >
        <Text style={[styles.actionButtonLabel, { color: props.palette.inkOnAcid }]}>
          {props.approveLabel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={props.isApproving}
        onPress={props.onReject}
        style={({ pressed }) => [
          styles.rejectButton,
          {
            backgroundColor: pressed
              ? withAlpha(props.palette.destructive, 0.82)
              : props.palette.destructive,
            opacity: props.isApproving ? 0.7 : 1,
          },
        ]}
        testID={`reject-${props.proposal.writeProposalId}`}
      >
        <Text style={[styles.actionButtonLabel, { color: rejectTextColor }]}>
          {props.rejectLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function RecordSummaryCard(props: {
  amount: string;
  date: string;
  description: string;
  palette: SurfaceTokens;
  parseCopy: Record<string, string>;
  source: string;
  target: string;
  title: string;
}) {
  return (
    <View
      style={[
        styles.mergeInfoCard,
        {
          backgroundColor: props.palette.shellElevated,
          borderColor: props.palette.border,
        },
      ]}
    >
      <Text style={[styles.mergeInfoTitle, { color: props.palette.ink }]}>
        {props.title}
      </Text>
      <DetailRow
        label={props.parseCopy.fieldAmount}
        palette={props.palette}
        value={props.amount}
      />
      <DetailRow
        label={props.parseCopy.fieldDate}
        palette={props.palette}
        value={props.date}
      />
      <DetailRow
        label={props.parseCopy.fieldDescription}
        palette={props.palette}
        value={props.description}
      />
      <DetailRow
        label={props.parseCopy.fieldSource}
        palette={props.palette}
        value={props.source}
      />
      <DetailRow
        label={props.parseCopy.fieldTarget}
        palette={props.palette}
        value={props.target}
      />
    </View>
  );
}

function DetailRow(props: {
  label: string;
  palette: SurfaceTokens;
  value: string | null;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: props.palette.inkMuted }]}>
        {props.label}
      </Text>
      <Text style={[styles.detailValue, { color: props.palette.ink }]}>
        {props.value?.trim() || "—"}
      </Text>
    </View>
  );
}

function reviewLabel(amount: string, date: string): string {
  const normalizedAmount = amount.trim() || "Amount pending";
  const normalizedDate = date.trim() || "Date pending";
  return `${normalizedAmount} · ${normalizedDate}`;
}

function formatCounterpartyLabel(source: string, target: string): string {
  const sourceLabel = source.trim() || "Unknown source";
  const targetLabel = target.trim() || "Unknown target";
  return `${sourceLabel} -> ${targetLabel}`;
}

function formatCategoryBadge(
  category: LedgerCategory,
  copy: Record<string, string>,
): string {
  switch (category) {
    case "income":
      return copy.categoryBusinessIncome;
    case "non_business_income":
      return copy.categoryNonBusinessIncome;
    case "spending":
      return copy.categoryPersonalSpending;
    default:
      return copy.categoryExpense;
  }
}

function readProposalString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readProposalNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value);
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return Math.round(parsed);
      }
    }
  }

  return null;
}

function readMatchedRecordSummaries(
  payload: WorkflowWriteProposalItem["payload"],
): DuplicateMatchedRecordSummary[] {
  const value = payload.matchedRecords;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const recordId = readProposalString(record.recordId);

    if (!recordId) {
      return [];
    }

    return [
      {
        amountCents: readProposalNumber(record.amountCents) ?? 0,
        date: readProposalString(record.date) ?? "",
        description: readProposalString(record.description) ?? "",
        recordId,
        sourceLabel: readProposalString(record.sourceLabel) ?? "",
        targetLabel: readProposalString(record.targetLabel) ?? "",
      },
    ];
  });
}

function formatAmountCents(amountCents: number): string {
  return Number.isFinite(amountCents) ? (amountCents / 100).toFixed(2) : "";
}

function stateColor(state: string): string {
  switch (state) {
    case "validated":
      return "#C8E6C9";
    case "needs_review":
      return "#FFF3E0";
    case "duplicate":
      return "#FFCDD2";
    case "persisted_final":
      return "#C8E6C9";
    default:
      return "#E0E0E0";
  }
}

function proposalStateColor(state: string): string {
  switch (state) {
    case "pending_approval":
      return "#FFF3E0";
    case "executed":
      return "#C8E6C9";
    case "rejected":
      return "#FFCDD2";
    case "blocked":
      return "#E0E0E0";
    default:
      return "#E0E0E0";
  }
}

function formatJson(raw: string): string {
  if (!raw) return "";

  const parsed = tryParse(raw);

  if (parsed !== null) {
    return JSON.stringify(parsed, null, 2);
  }

  return raw;
}

function tryParse(raw: string): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return tryParseLooseJson(raw);
  }
}

function tryParseLooseJson(raw: string): unknown {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const firstBrace = Math.min(
    ...["{", "["]
      .map((token) => trimmed.indexOf(token))
      .filter((index) => index >= 0),
  );

  if (!Number.isFinite(firstBrace)) {
    return null;
  }

  const normalized = trimmed.slice(firstBrace).replace(/^\uFEFF/, "");
  const repaired = repairTruncatedJson(normalized);

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

function repairTruncatedJson(raw: string): string {
  let result = "";
  let inString = false;
  let escaping = false;
  const stack: string[] = [];

  for (const char of raw) {
    result += char;

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if ((char === "}" || char === "]") && stack[stack.length - 1] === char) {
      stack.pop();
    }
  }

  if (inString && !escaping) {
    result += "\"";
  }

  while (stack.length > 0) {
    result += stack.pop();
  }

  return result
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z0-9_.$-]+)\s*:/g, '$1"$2":');
}

const styles = StyleSheet.create({
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
    lineHeight: 17,
    textAlign: "center",
  },
  appBar: {
    borderBottomWidth: 2,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  approveButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    marginTop: 8,
  },
  backButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  candidateChip: {
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  candidateChipLabel: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  candidateChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 16,
  },
  candidateBadgeText: {
    lineHeight: 17,
  },
  candidateCardDesktop: {
    gap: 10,
    padding: 14,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  container: {
    gap: 14,
    padding: 18,
    paddingBottom: 36,
  },
  containerWide: {
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 20,
  },
  twoColumnDesktop: {
    alignItems: "flex-start",
    gap: 18,
  },
  columnLeft: {
    flex: 1,
  },
  columnLeftDesktop: {
    flex: 0.74,
    maxWidth: 360,
  },
  columnRight: {
    flex: 1,
  },
  columnRightDesktop: {
    flex: 1.26,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editFieldContainer: {
    gap: 4,
  },
  editFieldInput: {
    borderRadius: 999,
    borderWidth: 2,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  detailRow: {
    gap: 2,
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 18,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  heroBlock: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  jsonBox: {
    borderRadius: 10,
    borderWidth: 2,
    minHeight: 200,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  jsonBoxWide: {
    minHeight: 420,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  loadingCaption: {
    fontSize: 12,
    fontWeight: "800",
  },
  loadingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  matchedRecordsSection: {
    gap: 8,
  },
  mergeInfoCard: {
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
    padding: 12,
  },
  mergeInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  keepChoiceChip: {
    borderRadius: 999,
    borderWidth: 2,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keepChoiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  keepChoiceSection: {
    gap: 8,
  },
  keepChoiceText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCloseButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  proposalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  proposalCard: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginBottom: 10,
    padding: 14,
  },
  proposalDetailLine: {
    fontSize: 12,
    lineHeight: 17,
  },
  proposalDetailList: {
    gap: 4,
  },
  proposalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  proposalRationale: {
    fontSize: 13,
    lineHeight: 18,
  },
  proposalSummary: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  proposalType: {
    fontSize: 15,
    fontWeight: "800",
  },
  proposalsSection: {
    gap: 0,
  },
  rejectButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    marginTop: 4,
    paddingHorizontal: 14,
  },
  safeArea: {
    flex: 1,
  },
  sectionStack: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  statePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statePillRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  statePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statPillContainer: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  recordModalCard: {
    borderRadius: 14,
    borderWidth: 2,
    gap: 16,
    maxHeight: "88%",
    padding: 20,
  },
  warningList: {
    gap: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
