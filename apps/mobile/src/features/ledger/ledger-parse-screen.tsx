import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import type { ResolvedLocale } from "../app-shell/types";
import { getButtonColors, getFeedbackColors, withAlpha } from "../app-shell/theme-utils";
import {
  formatLedgerParseCandidateState,
  formatLedgerParseProposalType,
  formatLedgerParseWorkflowState,
} from "./ledger-parse-localization";
import type {
  DuplicateMatchedRecordSummary,
  DuplicateMergeKeepMode,
  LedgerCategory,
  WorkflowWriteProposalItem,
} from "./ledger-domain";
import { usePlannerWorkflow } from "./use-planner-workflow";

export function LedgerParseScreen() {
  const router = useRouter();
  const { isExpanded, isMedium } = useResponsive();
  const isWide = isExpanded || isMedium;
  const { copy, palette, profileInfo, resolvedLocale } = useAppShell();
  const parseCopy = copy.ledger.parse;
  const primaryButton = getButtonColors(palette, "primary");
  const errorColors = getFeedbackColors(palette, "error");
  const successColors = getFeedbackColors(palette, "success");
  const warningColors = getFeedbackColors(palette, "warning");
  const params = useLocalSearchParams<{
    fileName?: string;
    rawJson?: string;
    rawText?: string;
    model?: string;
    parseError?: string;
    mimeType?: string;
    parserKind?: string;
  }>();

  const fileName = params.fileName ?? parseCopy.unknownFile;
  const rawJson = params.rawJson ?? "";
  const rawText = params.rawText ?? "";
  const model = params.model ?? "";
  const parseError = params.parseError ?? "";
  const mimeType = params.mimeType?.trim() || null;
  const parserKind = params.parserKind || undefined;

  const hasData = rawJson || rawText;
  const formattedJson = formatJson(rawJson);
  const providerLabel =
    parserKind === "gemini" ? "Gemini" : parserKind === "infer" ? "Infer API" : "OpenAI";

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
    fileName,
    mimeType,
    model,
    parserKind,
    profileInfo,
    rawJson: parsedRawJson,
    rawText,
  });

  const canStartPlanner =
    hasData && !parseError && parsedRawJson !== null && !plannerResult;
  const isPreparingReview = canStartPlanner || (isPlanning && !plannerResult);
  const canRetryPlanner =
    !plannerResult &&
    !isPlanning &&
    !parseError &&
    parsedRawJson !== null &&
    Boolean(plannerError);
  const allApproved = plannerResult?.batchState === "approved";
  const activeCandidate = plannerResult?.candidateRecords[selectedCandidateIndex] ?? null;
  const visibleProposals = plannerResult?.writeProposals.filter((proposal) =>
    !proposal.candidateId || proposal.candidateId === activeCandidate?.candidateId,
  ) ?? [];
  const [duplicateKeepModes, setDuplicateKeepModes] = useState<
    Record<string, DuplicateMergeKeepMode>
  >({});
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
    if (!canStartPlanner || isPlanning || plannerError) {
      return;
    }

    void startPlanner();
  }, [canStartPlanner, isPlanning, plannerError, startPlanner]);

  useEffect(() => {
    if (!allApproved) {
      return;
    }

    router.replace("/(tabs)");
  }, [allApproved, router]);

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
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/ledger");
            }
          }}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
        {/* ---- Top strip: hero + file info (always full width) ---- */}
        <View
          style={[
            styles.heroBlock,
            { backgroundColor: palette.paper, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
            {parseCopy.heroEyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>
            {`${providerLabel} ${parseCopy.heroTitleSuffix}`}
          </Text>
        </View>

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
              {fileName}
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

        {/* ---- Main body: two-column on PC, single-column on mobile ---- */}
        <View style={isExpanded ? styles.twoColumn : undefined}>
          {/* Left column: JSON preview */}
          <View style={isExpanded ? styles.columnLeft : undefined}>
            {hasData ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.paper, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                  {parseCopy.parsedJsonTitle}
                </Text>
                <View
                  style={[
                    styles.jsonBox,
                    isExpanded && styles.jsonBoxWide,
                    {
                      backgroundColor: palette.shellElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    selectable
                    style={[styles.jsonText, { color: palette.ink }]}
                  >
                    {formattedJson || rawText || parseCopy.noData}
                  </Text>
                </View>
              </View>
            ) : !parseError ? (
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
          </View>

          {/* Right column: planner actions + edit + proposals */}
          <View style={[isExpanded ? styles.columnRight : undefined, { gap: 14 }]}>
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
                <Text style={[styles.loadingCaption, { color: palette.inkMuted }]}>
                  {parseCopy.mapping}
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

            {plannerResult?.plannerSummary ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.paper, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                  {parseCopy.plannerSummaryTitle}
                </Text>
                <Text style={[styles.summaryText, { color: palette.inkMuted }]}>
                  {plannerResult.plannerSummary.summary}
                </Text>
                {plannerResult.plannerSummary.warnings.length > 0 ? (
                  <View style={styles.warningList}>
                    {plannerResult.plannerSummary.warnings.map((warning, index) => (
                      <Text
                        key={index}
                        style={[styles.warningText, { color: warningColors.text }]}
                      >
                        {warning}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={styles.statsRow}>
                  <StatPill
                    label={parseCopy.statReadTasks}
                    palette={palette}
                    value={plannerResult.plannerSummary.readTasks.length}
                  />
                  <StatPill
                    label={parseCopy.statCandidates}
                    palette={palette}
                    value={plannerResult.candidateRecords.length}
                  />
                  <StatPill
                    label={parseCopy.statProposals}
                    palette={palette}
                    value={plannerResult.writeProposals.length}
                  />
                </View>
              </View>
            ) : null}

            {plannerResult && !allApproved ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.paper, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                  {plannerResult.candidateRecords.length > 1
                    ? `${parseCopy.editRecordTitle} ${selectedCandidateIndex + 1}/${plannerResult.candidateRecords.length}`
                    : parseCopy.editRecordTitle}
                </Text>
                {plannerResult.candidateRecords.length > 1 ? (
                  <View style={styles.candidateChipRow}>
                    {plannerResult.candidateRecords.map((candidate, index) => {
                      const selected = index === selectedCandidateIndex;

                      return (
                        <Pressable
                          key={candidate.candidateId}
                          accessibilityRole="button"
                          onPress={() => selectCandidate(index)}
                          style={[
                            styles.candidateChip,
                            {
                              backgroundColor: selected
                                ? palette.accentSoft
                                : palette.shellElevated,
                              borderColor: selected
                                ? palette.accent
                                : palette.border,
                            },
                          ]}
                          testID={`candidate-${index + 1}`}
                        >
                          <Text
                            style={[
                              styles.candidateChipLabel,
                              {
                                color: selected ? palette.accent : palette.ink,
                              },
                            ]}
                          >
                            {`${parseCopy.reviewStateCandidate} ${index + 1}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {activeCandidate ? (
                  <View style={styles.statePillRow}>
                    <View
                      style={[
                        styles.statePill,
                        {
                          backgroundColor: stateColor(
                            activeCandidate.state,
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.statePillText}>
                        {formatLedgerParseCandidateState(
                          activeCandidate.state,
                          resolvedLocale,
                        )}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <CategorySelector
                  label={parseCopy.categoryLabel}
                  options={categoryOptions}
                  palette={palette}
                  selectedValue={review.category}
                  onSelect={(value) => updateField("category", value)}
                />
                <EditField
                  fieldId="amount"
                  label={parseCopy.fieldAmount}
                  onChangeText={(value) => updateField("amount", value)}
                  palette={palette}
                  value={review.amount}
                />
                <EditField
                  fieldId="date"
                  label={parseCopy.fieldDate}
                  onChangeText={(value) => updateField("date", value)}
                  palette={palette}
                  value={review.date}
                />
                <EditField
                  fieldId="source"
                  label={parseCopy.fieldSource}
                  onChangeText={(value) => updateField("source", value)}
                  palette={palette}
                  value={review.source}
                />
                <EditField
                  fieldId="target"
                  label={parseCopy.fieldTarget}
                  onChangeText={(value) => updateField("target", value)}
                  palette={palette}
                  value={review.target}
                />
                <EditField
                  fieldId="description"
                  label={parseCopy.fieldDescription}
                  onChangeText={(value) => updateField("description", value)}
                  palette={palette}
                  value={review.description}
                />
              </View>
            ) : null}

            {plannerResult &&
            visibleProposals.length > 0 &&
            !allApproved ? (
              <View style={styles.proposalsSection}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: palette.ink, marginBottom: 12 },
                  ]}
                >
                  {parseCopy.writeProposalsTitle}
                </Text>
                {visibleProposals.map((proposal) => {
                  if (proposal.proposalType === "resolve_duplicate_receipt") {
                    const keepMode =
                      duplicateKeepModes[proposal.writeProposalId] ?? "keep_existing";

                    return (
                      <DuplicateReceiptProposalCard
                        key={proposal.writeProposalId}
                        isApproving={isApproving}
                        keepMode={keepMode}
                        onApprove={() =>
                          approveProposal(proposal.writeProposalId, {
                            duplicateResolution: { keepMode },
                          })
                        }
                        onKeepModeChange={(nextMode) =>
                          setDuplicateKeepModes((current) => ({
                            ...current,
                            [proposal.writeProposalId]: nextMode,
                          }))
                        }
                        onReject={() => rejectProposal(proposal.writeProposalId)}
                        palette={palette}
                        parseCopy={parseCopy}
                        proposal={proposal}
                        resolvedLocale={resolvedLocale}
                        review={review}
                      />
                    );
                  }

                  if (proposal.proposalType === "merge_counterparty") {
                    return (
                      <CounterpartyMergeProposalCard
                        key={proposal.writeProposalId}
                        isApproving={isApproving}
                        onApprove={() => approveProposal(proposal.writeProposalId)}
                        onReject={() => rejectProposal(proposal.writeProposalId)}
                        palette={palette}
                        parseCopy={parseCopy}
                        proposal={proposal}
                        resolvedLocale={resolvedLocale}
                        review={review}
                      />
                    );
                  }

                  return (
                    <GenericProposalCard
                      key={proposal.writeProposalId}
                      isApproving={isApproving}
                      onApprove={() => approveProposal(proposal.writeProposalId)}
                      onReject={() => rejectProposal(proposal.writeProposalId)}
                      palette={palette}
                      parseCopy={parseCopy}
                      proposal={proposal}
                      resolvedLocale={resolvedLocale}
                    />
                  );
                })}
              </View>
            ) : null}

            {allApproved ? (
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
              </View>
            ) : null}
          </View>
        </View>

        {/* ---- Bottom: back button (always full width) ---- */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/ledger");
            }
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed
                ? primaryButton.pressedBackground
                : primaryButton.background,
            },
          ]}
        >
          <Text
            style={[styles.backButtonLabel, { color: primaryButton.text }]}
          >
            {parseCopy.backToUpload}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function EditField(props: {
  fieldId: string;
  label: string;
  onChangeText: (value: string) => void;
  palette: Record<string, string>;
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

function CategorySelector(props: {
  label: string;
  onSelect: (value: LedgerCategory) => void;
  options: Array<{ label: string; value: LedgerCategory }>;
  palette: Record<string, string>;
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
  palette: Record<string, string>;
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
        rejectLabel={props.parseCopy.reject}
      />
    </View>
  );
}

function CounterpartyMergeProposalCard(props: {
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  palette: Record<string, string>;
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

function DuplicateReceiptProposalCard(props: {
  isApproving: boolean;
  keepMode: DuplicateMergeKeepMode;
  onApprove: () => void;
  onKeepModeChange: (nextMode: DuplicateMergeKeepMode) => void;
  onReject: () => void;
  palette: Record<string, string>;
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
  palette: Record<string, string>;
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
  palette: Record<string, string>;
  proposal: WorkflowWriteProposalItem;
  rejectLabel: string;
}) {
  if (props.proposal.state !== "pending_approval") {
    return null;
  }

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
        <Text style={styles.actionButtonLabel}>{props.approveLabel}</Text>
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
        <Text style={styles.actionButtonLabel}>{props.rejectLabel}</Text>
      </Pressable>
    </View>
  );
}

function RecordSummaryCard(props: {
  amount: string;
  date: string;
  description: string;
  palette: Record<string, string>;
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
  palette: Record<string, string>;
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

function StatPill(props: {
  label: string;
  palette: Record<string, string>;
  value: number;
}) {
  return (
    <View
      style={[
        styles.statPillContainer,
        { backgroundColor: props.palette.shellElevated },
      ]}
    >
      <Text style={[styles.statPillValue, { color: props.palette.ink }]}>
        {props.value}
      </Text>
      <Text style={[styles.statPillLabel, { color: props.palette.inkMuted }]}>
        {props.label}
      </Text>
    </View>
  );
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
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  actionButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
    height: 40,
    justifyContent: "center",
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
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
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
    height: 40,
    justifyContent: "center",
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
  warningList: {
    gap: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
