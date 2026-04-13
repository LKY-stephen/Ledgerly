import type {
  CandidateRecordPayload,
  CandidateRecordState,
  ClassifiedParseField,
  CounterpartyResolution,
  DuplicateKind,
  EvidenceExtractedData,
  JsonObject,
  JsonValue,
  PlannerReadTask,
  PlannerSummary,
  ReceiptPlannerPayload,
  WorkflowWriteProposalPayload,
} from "@creator-cfo/schemas";

import type { EvidenceQueueItem, LedgerReviewValues } from "./ledger-domain";

export interface PlannerLookupMatch {
  counterpartyId: string;
  displayName: string;
  matchScore?: number;
}

export interface DuplicateReceiptMatch {
  conflictEvidenceId: string;
  conflictLabel: string;
  matchedRecordIds: string[];
  overlapEntryCount: number;
}

export interface PlannerReadResults {
  duplicateRecordIds: string[];
  duplicateReceiptMatches: DuplicateReceiptMatch[];
  sourceCounterpartyMatches: PlannerLookupMatch[];
  sourceCounterpartySuggestions: PlannerLookupMatch[];
  targetCounterpartyMatches: PlannerLookupMatch[];
  targetCounterpartySuggestions: PlannerLookupMatch[];
}

export function buildPlannerSummary(input: {
  evidence: Pick<
    EvidenceQueueItem,
    | "capturedAmountCents"
    | "capturedDate"
    | "capturedDescription"
    | "capturedSource"
    | "capturedTarget"
    | "evidenceId"
    | "originalFileName"
  >;
  extractedData: EvidenceExtractedData;
  readResults: PlannerReadResults;
  remotePlan: ReceiptPlannerPayload;
}): PlannerSummary {
  assertPlannerPayloadCompleteness(input.remotePlan);

  const localCandidateRecords = materializeCandidateRecords({
    evidence: input.evidence,
    extractedData: input.extractedData,
    readResults: input.readResults,
    remoteCandidateRecords: input.remotePlan.candidateRecords,
  });
  const counterpartyResolutions = buildCounterpartyResolutions({
    evidence: input.evidence,
    readResults: input.readResults,
    remoteResolutions: input.remotePlan.counterpartyResolutions,
    candidateRecords: localCandidateRecords,
  });
  const duplicateHints = buildDuplicateHints(input.readResults, input.remotePlan.duplicateHints);
  const readTasks = buildReadTasks(input.readResults, input.remotePlan.readTasks);
  const classifiedFacts = mergeClassifiedFacts(
    buildLocalClassifiedFacts(localCandidateRecords[0] ?? null),
    input.remotePlan.classifiedFacts,
  );
  const writeProposals = materializeWriteProposals({
    candidateRecords: localCandidateRecords,
    duplicateReceiptMatches: input.readResults.duplicateReceiptMatches,
    duplicateHints,
    remoteWriteProposals: input.remotePlan.writeProposals,
    resolutions: counterpartyResolutions,
  });
  const duplicateReceiptMatch = selectPrimaryDuplicateMatch(input.readResults.duplicateReceiptMatches);
  const warnings = dedupeStrings([
    ...input.extractedData.warnings,
    ...input.remotePlan.warnings,
    ...(duplicateReceiptMatch ? [formatDuplicateReceiptWarning(duplicateReceiptMatch)] : []),
    ...(duplicateHints.includes("record_duplicate") && !duplicateReceiptMatch
      ? ["Potential duplicate record detected from local record lookup."]
      : []),
    ...(counterpartyResolutions.some((resolution) => resolution.status === "ambiguous")
      ? ["Counterparty matching is ambiguous and requires review before final persistence."]
      : []),
  ]);

  return {
    businessEvents: input.remotePlan.businessEvents,
    candidateRecords: localCandidateRecords,
    classifiedFacts,
    counterpartyResolutions,
    duplicateHints,
    readTasks,
    summary: input.remotePlan.summary,
    warnings,
    writeProposals,
  };
}

export function deriveCandidateState(input: {
  payload: CandidateRecordPayload;
  duplicateHints: DuplicateKind[];
  resolutions: CounterpartyResolution[];
}): CandidateRecordState {
  if (input.duplicateHints.includes("record_duplicate") || input.duplicateHints.includes("near_duplicate")) {
    return "needs_review";
  }

  if (
    !input.payload.amountCents ||
    !input.payload.date ||
    !normalizeText(input.payload.description) ||
    input.resolutions.some((resolution) => resolution.status === "ambiguous")
  ) {
    return "needs_review";
  }

  return "validated";
}

export function buildReviewValuesFromPayload(payload: CandidateRecordPayload): LedgerReviewValues {
  return {
    amount: payload.amountCents ? (payload.amountCents / 100).toFixed(2) : "",
    category:
      payload.recordKind === "income"
        ? "income"
        : payload.recordKind === "personal_spending"
          ? "spending"
          : "expense",
    date: payload.date ?? "",
    description: payload.description ?? "",
    notes: "",
    source: payload.sourceLabel ?? "",
    target: payload.targetLabel ?? "",
    taxCategory: payload.taxCategoryCode ?? "",
  };
}

function assertPlannerPayloadCompleteness(remotePlan: ReceiptPlannerPayload): void {
  const readTaskTypes = new Set(remotePlan.readTasks.map((task) => task.taskType));
  const proposalTypes = new Set(remotePlan.writeProposals.map((proposal) => proposal.proposalType));

  if (!readTaskTypes.has("counterparty_lookup") || !readTaskTypes.has("duplicate_lookup")) {
    throw new Error("Planner payload is missing required read tasks.");
  }

  if (!remotePlan.candidateRecords.length) {
    throw new Error("Planner payload is missing candidate records.");
  }

  if (!proposalTypes.has("persist_candidate_record")) {
    throw new Error("Planner payload is missing the persist_candidate_record proposal.");
  }
}

function materializeCandidateRecords(input: {
  evidence: Pick<
    EvidenceQueueItem,
    | "capturedAmountCents"
    | "capturedDate"
    | "capturedDescription"
    | "capturedSource"
    | "capturedTarget"
    | "evidenceId"
    | "originalFileName"
  >;
  extractedData: EvidenceExtractedData;
  readResults: PlannerReadResults;
  remoteCandidateRecords: CandidateRecordPayload[];
}): CandidateRecordPayload[] {
  return input.remoteCandidateRecords.map((candidate) => {
    const amountCents =
      candidate.amountCents ??
      input.extractedData.fields.amountCents ??
      (input.evidence.capturedAmountCents > 0 ? input.evidence.capturedAmountCents : null);
    const date = normalizeText(candidate.date) ?? input.extractedData.fields.date ?? input.evidence.capturedDate;
    const description =
      normalizeText(candidate.description) ??
      normalizeText(input.extractedData.fields.description) ??
      normalizeText(input.evidence.capturedDescription) ??
      input.evidence.originalFileName;
    const sourceLabel =
      normalizeText(candidate.sourceLabel) ??
      normalizeText(input.extractedData.fields.source) ??
      normalizeText(input.evidence.capturedSource);
    const targetLabel =
      normalizeText(candidate.targetLabel) ??
      normalizeText(input.extractedData.fields.target) ??
      normalizeText(input.evidence.capturedTarget);
    const sourceCounterpartyId =
      input.readResults.sourceCounterpartyMatches.length === 1
        ? input.readResults.sourceCounterpartyMatches[0]?.counterpartyId ?? null
        : null;
    const targetCounterpartyId =
      input.readResults.targetCounterpartyMatches.length === 1
        ? input.readResults.targetCounterpartyMatches[0]?.counterpartyId ?? null
        : null;

    return {
      ...candidate,
      amountCents,
      currency: normalizeText(candidate.currency) ?? "USD",
      date,
      description,
      evidenceId: input.evidence.evidenceId,
      sourceCounterpartyId,
      sourceLabel,
      targetCounterpartyId,
      targetLabel,
      taxCategoryCode: normalizeText(candidate.taxCategoryCode),
    };
  });
}

function buildCounterpartyResolutions(input: {
  evidence: Pick<EvidenceQueueItem, "capturedSource" | "capturedTarget">;
  readResults: PlannerReadResults;
  remoteResolutions: CounterpartyResolution[];
  candidateRecords: CandidateRecordPayload[];
}): CounterpartyResolution[] {
  return (["source", "target"] as const).map((role) => {
    const remoteResolution = input.remoteResolutions.find((resolution) => resolution.role === role);
    const displayName =
      normalizeText(
        role === "source"
          ? input.candidateRecords[0]?.sourceLabel
          : input.candidateRecords[0]?.targetLabel,
      ) ??
      normalizeText(remoteResolution?.displayName) ??
      normalizeText(role === "source" ? input.evidence.capturedSource : input.evidence.capturedTarget) ??
      "";
    const matches =
      role === "source" ? input.readResults.sourceCounterpartyMatches : input.readResults.targetCounterpartyMatches;
    const suggestions =
      role === "source" ? input.readResults.sourceCounterpartySuggestions : input.readResults.targetCounterpartySuggestions;

    if (!displayName) {
      return {
        confidence: "low",
        displayName: "",
        matchedDisplayNames: [],
        matchedCounterpartyIds: [],
        role,
        status: "proposed_new",
      } satisfies CounterpartyResolution;
    }

    if (matches.length === 1) {
      return {
        confidence: "high",
        displayName,
        matchedDisplayNames: [matches[0]!.displayName],
        matchedCounterpartyIds: [matches[0]!.counterpartyId],
        role,
        status: "matched",
      } satisfies CounterpartyResolution;
    }

    if (matches.length > 1) {
      return {
        confidence: "medium",
        displayName,
        matchedDisplayNames: matches.map((match) => match.displayName),
        matchedCounterpartyIds: matches.map((match) => match.counterpartyId),
        role,
        status: "ambiguous",
      } satisfies CounterpartyResolution;
    }

    if (suggestions.length > 0) {
      return {
        confidence: "medium",
        displayName,
        matchedDisplayNames: suggestions.map((match) => match.displayName),
        matchedCounterpartyIds: suggestions.map((match) => match.counterpartyId),
        role,
        status: "ambiguous",
      } satisfies CounterpartyResolution;
    }

    if (remoteResolution && remoteResolution.status !== "proposed_new" && remoteResolution.matchedCounterpartyIds.length > 0) {
      return {
        confidence: remoteResolution.confidence,
        displayName,
        matchedDisplayNames: remoteResolution.matchedDisplayNames,
        matchedCounterpartyIds: remoteResolution.matchedCounterpartyIds,
        role,
        status: remoteResolution.status,
      } satisfies CounterpartyResolution;
    }

    return {
      confidence: remoteResolution?.confidence ?? "medium",
      displayName,
      matchedDisplayNames: [],
      matchedCounterpartyIds: [],
      role,
      status: "proposed_new",
    } satisfies CounterpartyResolution;
  });
}

function buildDuplicateHints(
  readResults: PlannerReadResults,
  remoteDuplicateHints: DuplicateKind[],
): DuplicateKind[] {
  return dedupeDuplicateKinds([
    ...remoteDuplicateHints,
    ...(readResults.duplicateReceiptMatches.length ? (["near_duplicate"] as const) : []),
    ...(readResults.duplicateRecordIds.length ? (["record_duplicate"] as const) : []),
  ]);
}

function buildReadTasks(
  readResults: PlannerReadResults,
  remoteReadTasks: PlannerReadTask[],
): PlannerReadTask[] {
  return remoteReadTasks.map((task) => {
    if (task.taskType === "counterparty_lookup") {
      return {
        ...task,
        input: task.input ?? {},
        result: {
          sourceMatches: readResults.sourceCounterpartyMatches as unknown as JsonValue[],
          sourceSuggestions: readResults.sourceCounterpartySuggestions as unknown as JsonValue[],
          targetMatches: readResults.targetCounterpartyMatches as unknown as JsonValue[],
          targetSuggestions: readResults.targetCounterpartySuggestions as unknown as JsonValue[],
        } as JsonObject,
        status: "completed",
      };
    }

    return {
      ...task,
      input: task.input ?? {},
      result: {
        duplicateRecordIds: readResults.duplicateRecordIds,
        duplicateReceiptMatches: readResults.duplicateReceiptMatches.map((match) => ({
          conflictEvidenceId: match.conflictEvidenceId,
          conflictLabel: match.conflictLabel,
          matchedRecordIds: match.matchedRecordIds,
          overlapEntryCount: match.overlapEntryCount,
        })) as unknown as JsonValue[],
      } as JsonObject,
      status: "completed",
    };
  });
}

function buildLocalClassifiedFacts(candidate: CandidateRecordPayload | null): ClassifiedParseField[] {
  if (!candidate) {
    return [];
  }

  return [
    classifyField("amountCents", candidate.amountCents),
    classifyField("date", candidate.date),
    classifyField("description", candidate.description),
    classifyField("source", candidate.sourceLabel),
    classifyField("target", candidate.targetLabel),
  ];
}

function mergeClassifiedFacts(
  localFacts: ClassifiedParseField[],
  remoteFacts: ClassifiedParseField[],
): ClassifiedParseField[] {
  const merged = new Map(localFacts.map((fact) => [fact.field, fact]));

  for (const fact of remoteFacts) {
    merged.set(fact.field, fact);
  }

  return [...merged.values()];
}

function classifyField(field: string, value: unknown): ClassifiedParseField {
  const hasValue =
    typeof value === "number"
      ? Number.isFinite(value)
      : typeof value === "string"
        ? value.trim().length > 0
        : Boolean(value);

  return {
    confidence: hasValue ? "high" : "low",
    field,
    reason: hasValue ? "Parsed value is present and usable." : "Value is missing and requires review.",
    status: hasValue ? "confirmed" : "missing",
    value: (value ?? null) as JsonValue,
  };
}

function materializeWriteProposals(input: {
  candidateRecords: CandidateRecordPayload[];
  duplicateReceiptMatches: DuplicateReceiptMatch[];
  duplicateHints: DuplicateKind[];
  remoteWriteProposals: WorkflowWriteProposalPayload[];
  resolutions: CounterpartyResolution[];
}): WorkflowWriteProposalPayload[] {
  const primaryCandidate = input.candidateRecords[0] ?? null;
  const proposals: WorkflowWriteProposalPayload[] = [];
  const duplicateReceiptMatch = selectPrimaryDuplicateMatch(input.duplicateReceiptMatches);
  const remoteDuplicateProposal = findProposal(input.remoteWriteProposals, "resolve_duplicate_receipt");
  const passthroughRemoteProposals = input.remoteWriteProposals.filter((proposal) =>
    proposal.proposalType !== "create_counterparty" &&
    proposal.proposalType !== "merge_counterparty" &&
    proposal.proposalType !== "persist_candidate_record" &&
    proposal.proposalType !== "resolve_duplicate_receipt",
  );

  if (duplicateReceiptMatch || remoteDuplicateProposal) {
    proposals.push(
      buildResolveDuplicateReceiptProposal(
        remoteDuplicateProposal,
        duplicateReceiptMatch ?? buildDuplicateReceiptMatchFromProposal(remoteDuplicateProposal!),
      ),
    );
  }

  for (const role of ["source", "target"] as const) {
    const resolution = input.resolutions.find((item) => item.role === role);
    const remoteMergeProposal = findProposal(input.remoteWriteProposals, "merge_counterparty", role);
    const effectiveResolution = mergeResolutionWithRemoteProposal(resolution, remoteMergeProposal, role);

    if (!effectiveResolution?.displayName || effectiveResolution.status === "matched") {
      continue;
    }

    const remoteCreateProposal = findProposal(input.remoteWriteProposals, "create_counterparty", role);

    if (effectiveResolution.status === "ambiguous" && effectiveResolution.matchedCounterpartyIds.length > 0) {
      proposals.push(
        buildMergeCounterpartyProposal(
          remoteMergeProposal,
          effectiveResolution,
          role,
        ),
      );
    }

    proposals.push(buildCreateCounterpartyProposal(remoteCreateProposal, effectiveResolution, role));
  }

  proposals.push(...passthroughRemoteProposals);

  if (primaryCandidate) {
    proposals.push(
      createPersistProposal(
        findProposal(input.remoteWriteProposals, "persist_candidate_record"),
        input.duplicateHints,
        duplicateReceiptMatch,
        primaryCandidate,
      ),
    );
  }

  return proposals;
}

function normalizeProposalRole(value: JsonValue | undefined): "source" | "target" | null {
  return value === "source" || value === "target" ? value : null;
}

function normalizeJsonString(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function dedupeDuplicateKinds(values: DuplicateKind[]): DuplicateKind[] {
  return [...new Set(values)];
}

function findProposal(
  proposals: WorkflowWriteProposalPayload[],
  proposalType: WorkflowWriteProposalPayload["proposalType"],
  role?: "source" | "target",
): WorkflowWriteProposalPayload | null {
  return proposals.find((proposal) =>
    proposal.proposalType === proposalType &&
    (role === undefined || (proposal.role ?? normalizeProposalRole(proposal.values.role)) === role),
  ) ?? null;
}

function buildCreateCounterpartyProposal(
  remoteProposal: WorkflowWriteProposalPayload | null,
  resolution: CounterpartyResolution,
  role: "source" | "target",
): WorkflowWriteProposalPayload {
  return {
    candidateId: remoteProposal?.candidateId,
    counterpartyId: remoteProposal?.counterpartyId,
    dependencyIds: remoteProposal?.dependencyIds,
    proposalType: "create_counterparty",
    reviewFields: remoteProposal?.reviewFields?.length ? remoteProposal.reviewFields : role === "target" ? ["target"] : ["source"],
    role,
    values: {
      ...(remoteProposal?.values ?? {}),
      displayName: normalizeJsonString(remoteProposal?.values.displayName) ?? resolution.displayName,
      role,
    },
  };
}

function buildMergeCounterpartyProposal(
  remoteProposal: WorkflowWriteProposalPayload | null,
  resolution: CounterpartyResolution,
  role: "source" | "target",
): WorkflowWriteProposalPayload {
  return {
    candidateId: remoteProposal?.candidateId,
    counterpartyId: remoteProposal?.counterpartyId,
    dependencyIds: remoteProposal?.dependencyIds,
    proposalType: "merge_counterparty",
    reviewFields: remoteProposal?.reviewFields?.length ? remoteProposal.reviewFields : role === "target" ? ["target"] : ["source"],
    role,
    values: {
      ...(remoteProposal?.values ?? {}),
      existingCounterpartyId: resolution.matchedCounterpartyIds[0] ?? "",
      existingDisplayName: resolution.matchedDisplayNames[0] ?? resolution.displayName,
      matchedCounterpartyIds: resolution.matchedCounterpartyIds,
      parsedDisplayName: resolution.displayName,
      role,
    },
  };
}

function buildResolveDuplicateReceiptProposal(
  remoteProposal: WorkflowWriteProposalPayload | null,
  match: DuplicateReceiptMatch,
): WorkflowWriteProposalPayload {
  return {
    candidateId: remoteProposal?.candidateId,
    counterpartyId: remoteProposal?.counterpartyId,
    dependencyIds: remoteProposal?.dependencyIds,
    proposalType: "resolve_duplicate_receipt",
    reviewFields: remoteProposal?.reviewFields,
    role: remoteProposal?.role,
    values: {
      ...(remoteProposal?.values ?? {}),
      conflictEvidenceId: match.conflictEvidenceId,
      duplicateEvidenceId: match.conflictEvidenceId,
      duplicateReceiptLabel: match.conflictLabel,
      matchedRecordIds: match.matchedRecordIds,
      overlapEntryCount: match.overlapEntryCount,
      relatedEvidenceFileName: match.conflictLabel,
    },
  };
}

function createPersistProposal(
  remoteProposal: WorkflowWriteProposalPayload | null,
  duplicateHints: DuplicateKind[],
  duplicateReceiptMatch: DuplicateReceiptMatch | null,
  primaryCandidate: CandidateRecordPayload,
): WorkflowWriteProposalPayload {
  return {
    candidateId: remoteProposal?.candidateId ?? primaryCandidate.evidenceId,
    counterpartyId: remoteProposal?.counterpartyId,
    dependencyIds: remoteProposal?.dependencyIds,
    proposalType: "persist_candidate_record",
    reviewFields: remoteProposal?.reviewFields?.length ? remoteProposal.reviewFields : ["amount", "date", "source", "target"],
    role: remoteProposal?.role,
    values: {
      ...(remoteProposal?.values ?? {}),
      duplicateHints,
      duplicateReceiptMatch: duplicateReceiptMatch
        ? {
            conflictEvidenceId: duplicateReceiptMatch.conflictEvidenceId,
            conflictLabel: duplicateReceiptMatch.conflictLabel,
            matchedRecordIds: duplicateReceiptMatch.matchedRecordIds,
            overlapEntryCount: duplicateReceiptMatch.overlapEntryCount,
          }
        : null,
      payload: primaryCandidate as unknown as JsonObject,
    },
  };
}

function selectPrimaryDuplicateMatch(matches: DuplicateReceiptMatch[]): DuplicateReceiptMatch | null {
  return [...matches].sort((left, right) =>
    right.overlapEntryCount - left.overlapEntryCount ||
    right.matchedRecordIds.length - left.matchedRecordIds.length ||
    left.conflictLabel.localeCompare(right.conflictLabel),
  )[0] ?? null;
}

function formatDuplicateReceiptWarning(match: DuplicateReceiptMatch): string {
  return `Potential duplicate receipt detected: ${match.overlapEntryCount} overlapping ${
    match.overlapEntryCount === 1 ? "entry" : "entries"
  } with ${match.conflictLabel}.`;
}

function buildDuplicateReceiptMatchFromProposal(proposal: WorkflowWriteProposalPayload): DuplicateReceiptMatch {
  return {
    conflictEvidenceId: normalizeJsonString(
      proposal.values.conflictEvidenceId ?? proposal.values.duplicateEvidenceId,
    ) ?? "unknown-evidence",
    conflictLabel: normalizeJsonString(
      proposal.values.duplicateReceiptLabel ?? proposal.values.relatedEvidenceFileName,
    ) ?? "Existing receipt",
    matchedRecordIds: asStringArray(proposal.values.matchedRecordIds),
    overlapEntryCount: readFirstNumber(
      proposal.values.overlapEntryCount,
      proposal.values.overlappingEntryCount,
      proposal.values.duplicateEntryCount,
    ) ?? 1,
  };
}

function mergeResolutionWithRemoteProposal(
  resolution: CounterpartyResolution | undefined,
  remoteProposal: WorkflowWriteProposalPayload | null,
  role: "source" | "target",
): CounterpartyResolution | null {
  const displayName =
    resolution?.displayName ??
    normalizeJsonString(remoteProposal?.values.parsedDisplayName) ??
    normalizeJsonString(remoteProposal?.values.displayName) ??
    "";
  const matchedCounterpartyIds = resolution?.matchedCounterpartyIds.length
    ? resolution.matchedCounterpartyIds
    : asStringArray(remoteProposal?.values.existingCounterpartyId).length
      ? asStringArray(remoteProposal?.values.existingCounterpartyId)
      : [];
  const matchedDisplayNames = resolution?.matchedDisplayNames.length
    ? resolution.matchedDisplayNames
    : asStringArray(remoteProposal?.values.existingDisplayName).length
      ? asStringArray(remoteProposal?.values.existingDisplayName)
      : [];

  if (!displayName) {
    return null;
  }

  return {
    confidence: resolution?.confidence ?? "medium",
    displayName,
    matchedDisplayNames,
    matchedCounterpartyIds,
    role,
    status: matchedCounterpartyIds.length > 0
      ? (resolution?.status === "matched" ? "matched" : "ambiguous")
      : (resolution?.status ?? "proposed_new"),
  };
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readFirstNumber(...values: unknown[]): number | null {
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
