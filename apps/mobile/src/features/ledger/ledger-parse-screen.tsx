import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
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
import { useAppShell } from "../app-shell/provider";
import {
  formatLedgerParseCandidateState,
  formatLedgerParseProposalType,
  formatLedgerParseWorkflowState,
} from "./ledger-parse-localization";
import { usePlannerWorkflow } from "./use-planner-workflow";

export function LedgerParseScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const parseCopy = copy.ledger.parse;
  const params = useLocalSearchParams<{
    fileName?: string;
    rawJson?: string;
    rawText?: string;
    model?: string;
    parseError?: string;
    mimeType?: string;
  }>();

  const fileName = params.fileName ?? parseCopy.unknownFile;
  const rawJson = params.rawJson ?? "";
  const rawText = params.rawText ?? "";
  const model = params.model ?? "";
  const parseError = params.parseError ?? "";
  const mimeType = params.mimeType ?? null;

  const hasData = rawJson || rawText;
  const formattedJson = formatJson(rawJson);

  const parsedRawJson = rawJson ? tryParse(rawJson) : null;

  const {
    approveProposal,
    error: plannerError,
    isApproving,
    isPlanning,
    plannerResult,
    rejectProposal,
    review,
    startPlanner,
    updateField,
  } = usePlannerWorkflow({
    fileName,
    mimeType,
    model,
    rawJson: parsedRawJson,
    rawText,
  });

  const canStartPlanner =
    hasData && !parseError && parsedRawJson !== null && !plannerResult;
  const allApproved = plannerResult?.batchState === "approved";

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
          title={copy.common.appName}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
            {parseCopy.heroEyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>
            {parseCopy.heroTitle}
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
              { backgroundColor: "#FFF3F0", borderColor: "#BA1A1A" },
            ]}
          >
            <Text style={[styles.errorTitle, { color: "#BA1A1A" }]}>
              {parseCopy.errorTitle}
            </Text>
            <Text selectable style={[styles.errorText, { color: "#BA1A1A" }]}>
              {parseError}
            </Text>
          </View>
        ) : null}

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
          <View style={[styles.emptyState]}>
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>
              {parseCopy.emptyTitle}
            </Text>
            <Text style={[styles.emptySub, { color: palette.inkMuted }]}>
              {parseCopy.emptySummary}
            </Text>
          </View>
        ) : null}

        {canStartPlanner ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPlanning}
            onPress={startPlanner}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? palette.heroEnd : palette.accent,
                opacity: isPlanning ? 0.7 : 1,
              },
            ]}
            testID="planner-start-button"
          >
            <Text
              style={[
                styles.primaryButtonLabel,
                { color: palette.inkOnAccent },
              ]}
            >
              {isPlanning ? parseCopy.mapping : parseCopy.mapToRecords}
            </Text>
          </Pressable>
        ) : null}

        {plannerError ? (
          <View
            style={[
              styles.card,
              { backgroundColor: "#FFF3F0", borderColor: "#BA1A1A" },
            ]}
          >
            <Text style={[styles.errorTitle, { color: "#BA1A1A" }]}>
              {parseCopy.plannerErrorTitle}
            </Text>
            <Text selectable style={[styles.errorText, { color: "#BA1A1A" }]}>
              {plannerError}
            </Text>
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
                    style={[styles.warningText, { color: "#BA1A1A" }]}
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
              {parseCopy.editRecordTitle}
            </Text>
            {plannerResult.candidateRecords[0] ? (
              <View style={styles.statePillRow}>
                <View
                  style={[
                    styles.statePill,
                    {
                      backgroundColor: stateColor(
                        plannerResult.candidateRecords[0].state,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.statePillText}>
                    {formatLedgerParseCandidateState(
                      plannerResult.candidateRecords[0].state,
                      resolvedLocale,
                    )}
                  </Text>
                </View>
              </View>
            ) : null}
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
        plannerResult.writeProposals.length > 0 &&
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
            {plannerResult.writeProposals.map((proposal) => (
              <View
                key={proposal.writeProposalId}
                style={[
                  styles.proposalCard,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.proposalHeader}>
                  <Text style={[styles.proposalType, { color: palette.ink }]}>
                    {formatLedgerParseProposalType(
                      proposal.proposalType,
                      resolvedLocale,
                    )}
                  </Text>
                  <View
                    style={[
                      styles.statePill,
                      { backgroundColor: proposalStateColor(proposal.state) },
                    ]}
                  >
                    <Text style={styles.statePillText}>
                      {formatLedgerParseWorkflowState(
                        proposal.state,
                        resolvedLocale,
                      )}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.proposalRationale,
                    { color: palette.inkMuted },
                  ]}
                >
                  {proposal.rationale}
                </Text>
                {proposal.state === "pending_approval" ? (
                  <View style={styles.proposalActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isApproving}
                      onPress={() => approveProposal(proposal.writeProposalId)}
                      style={({ pressed }) => [
                        styles.approveButton,
                        {
                          backgroundColor: pressed ? "#2E7D32" : "#4CAF50",
                          opacity: isApproving ? 0.7 : 1,
                        },
                      ]}
                      testID={`approve-${proposal.writeProposalId}`}
                    >
                      <Text style={styles.actionButtonLabel}>
                        {parseCopy.approve}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isApproving}
                      onPress={() => rejectProposal(proposal.writeProposalId)}
                      style={({ pressed }) => [
                        styles.rejectButton,
                        {
                          backgroundColor: pressed ? "#C62828" : "#EF5350",
                          opacity: isApproving ? 0.7 : 1,
                        },
                      ]}
                      testID={`reject-${proposal.writeProposalId}`}
                    >
                      <Text style={styles.actionButtonLabel}>
                        {parseCopy.reject}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {allApproved ? (
          <View
            style={[
              styles.card,
              { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: "#2E7D32" }]}>
              {parseCopy.recordSavedTitle}
            </Text>
            <Text style={[styles.summaryText, { color: "#2E7D32" }]}>
              {parseCopy.recordSavedSummary}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? palette.heroEnd : palette.ink },
          ]}
        >
          <Text
            style={[styles.backButtonLabel, { color: palette.inkOnAccent }]}
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
    fontWeight: "700",
  },
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
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
    height: 48,
    justifyContent: "center",
    marginTop: 8,
  },
  backButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  editFieldContainer: {
    gap: 4,
  },
  editFieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  emptySub: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  fileName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  heroBlock: {
    gap: 10,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
  },
  jsonBox: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 200,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  proposalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  proposalCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 16,
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
  proposalType: {
    fontSize: 16,
    fontWeight: "700",
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
  safeArea: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  statePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statePillRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  statePillText: {
    fontSize: 12,
    fontWeight: "600",
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
    fontWeight: "600",
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
