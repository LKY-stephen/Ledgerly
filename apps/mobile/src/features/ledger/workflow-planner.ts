import type {
  CandidateRecordPayload,
  CandidateRecordState,
  ClassifiedParseField,
  CounterpartyResolution,
  DuplicateKind,
  EvidenceExtractedData,
  EvidenceFieldCandidates,
  JsonObject,
  JsonValue,
  PlannerReadTask,
  PlannerSummary,
  ReceiptPlannerPayload,
  WorkflowWriteProposalPayload,
} from "@ledgerly/schemas";
import {
  getReceiptParseRecords,
  normalizeReceiptParsePayload,
} from "@ledgerly/schemas";

import type {
  DuplicateMatchedRecordSummary,
  EvidenceQueueItem,
  LedgerReviewValues,
} from "./ledger-domain";

export interface PlannerLookupMatch {
  counterpartyId: string;
  displayName: string;
  matchScore?: number;
}

export interface DuplicateReceiptMatch {
  conflictEvidenceId: string;
  conflictLabel: string;
  matchedRecordIds: string[];
  matchedRecords: DuplicateMatchedRecordSummary[];
  overlapEntryCount: number;
}

export interface PlannerReadResults {
  candidates: CandidatePlannerReadResult[];
}

export interface CandidatePlannerReadResult {
  candidateIndex: number;
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
    duplicateHints,
    remoteWriteProposals: input.remotePlan.writeProposals,
    readResults: input.readResults,
    resolutions: counterpartyResolutions,
  });
  const duplicateWarnings = input.readResults.candidates.flatMap((candidateResult) => {
    const primaryDuplicateMatch = selectPrimaryDuplicateMatch(candidateResult.duplicateReceiptMatches);

    if (!primaryDuplicateMatch) {
      return [];
    }

    return [formatDuplicateReceiptWarning(primaryDuplicateMatch, candidateResult.candidateIndex)];
  });
  const warnings = dedupeStrings([
    ...input.extractedData.warnings,
    ...input.remotePlan.warnings,
    ...duplicateWarnings,
    ...(duplicateHints.includes("record_duplicate") && duplicateWarnings.length === 0
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

export function materializeCandidateRecordDraft(input: {
  candidate: CandidateRecordPayload;
  candidateIndex: number;
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
}): CandidateRecordPayload {
  const parseRecord = getParseRecordForCandidateIndex(input.extractedData, input.candidateIndex);
  const fieldFallback = parseRecord?.fields ?? input.extractedData.fields;
  const candidateFallback = parseRecord?.candidates ?? input.extractedData.candidates;

  return {
    ...input.candidate,
    amountCents:
      input.candidate.amountCents ??
      fieldFallback.amountCents ??
      candidateFallback.amountCents ??
      (input.evidence.capturedAmountCents > 0 ? input.evidence.capturedAmountCents : null),
    currency: normalizeText(input.candidate.currency) ?? "USD",
    date:
      normalizeText(input.candidate.date) ??
      fieldFallback.date ??
      candidateFallback.date ??
      input.evidence.capturedDate,
    description:
      normalizeText(input.candidate.description) ??
      normalizeText(fieldFallback.description) ??
      normalizeText(candidateFallback.description) ??
      normalizeText(input.evidence.capturedDescription) ??
      input.evidence.originalFileName,
    evidenceId: input.evidence.evidenceId,
    sourceCounterpartyId: null,
    sourceLabel:
      normalizeText(input.candidate.sourceLabel) ??
      normalizeText(fieldFallback.source) ??
      normalizeText(candidateFallback.source) ??
      normalizeText(input.evidence.capturedSource),
    targetCounterpartyId: null,
    targetLabel:
      normalizeText(input.candidate.targetLabel) ??
      normalizeText(fieldFallback.target) ??
      normalizeText(candidateFallback.target) ??
      normalizeText(input.evidence.capturedTarget),
    taxCategoryCode:
      normalizeText(input.candidate.taxCategoryCode) ??
      normalizeText(fieldFallback.taxCategory) ??
      normalizeText(candidateFallback.taxCategory),
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

export function buildReviewValuesFromPayload(
  payload: CandidateRecordPayload,
  options?: {
    defaultDate?: string | null;
  },
): LedgerReviewValues {
  return {
    amount: payload.amountCents ? (payload.amountCents / 100).toFixed(2) : "",
    category:
      payload.recordKind === "income"
        ? "income"
        : payload.recordKind === "personal_spending"
          ? "spending"
          : "expense",
    date: normalizeText(options?.defaultDate) ?? normalizeText(payload.date) ?? "",
    description: payload.description ?? "",
    notes: "",
    source: payload.sourceLabel ?? "",
    target: payload.targetLabel ?? "",
    taxCategory: payload.taxCategoryCode ?? "",
  };
}

export function mergeReviewValuesWithPayload(
  currentReview: LedgerReviewValues,
  payload: CandidateRecordPayload,
  options?: {
    defaultDate?: string | null;
    overwriteFields?: ReadonlyArray<keyof LedgerReviewValues>;
  },
): LedgerReviewValues {
  const nextReview = buildReviewValuesFromPayload(payload, options);
  const merged: LedgerReviewValues = {
    amount: currentReview.amount.trim() ? currentReview.amount : nextReview.amount,
    category: currentReview.category,
    date: currentReview.date.trim() ? currentReview.date : nextReview.date,
    description: currentReview.description.trim()
      ? currentReview.description
      : nextReview.description,
    notes: currentReview.notes,
    source: currentReview.source.trim() ? currentReview.source : nextReview.source,
    target: currentReview.target.trim() ? currentReview.target : nextReview.target,
    taxCategory: currentReview.taxCategory.trim()
      ? currentReview.taxCategory
      : nextReview.taxCategory,
  };

  for (const field of options?.overwriteFields ?? []) {
    switch (field) {
      case "amount":
        merged.amount = nextReview.amount;
        break;
      case "category":
        merged.category = nextReview.category;
        break;
      case "date":
        merged.date = nextReview.date;
        break;
      case "description":
        merged.description = nextReview.description;
        break;
      case "notes":
        merged.notes = nextReview.notes;
        break;
      case "source":
        merged.source = nextReview.source;
        break;
      case "target":
        merged.target = nextReview.target;
        break;
      case "taxCategory":
        merged.taxCategory = nextReview.taxCategory;
        break;
    }
  }

  return merged;
}

export function shouldDefaultReviewDateToCurrentDate(input: {
  classifiedFacts: ClassifiedParseField[];
  warnings: string[];
}): boolean {
  const dateFact = input.classifiedFacts.find((fact) => fact.field === "date");

  if (dateFact && dateFact.status !== "confirmed") {
    return true;
  }

  return input.warnings.some((warning) => {
    const normalized = warning.toLowerCase();
    return normalized.includes("date") && (
      normalized.includes("ambigu") ||
      normalized.includes("uncertain") ||
      normalized.includes("infer") ||
      normalized.includes("estimated") ||
      normalized.includes("footer")
    );
  });
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

  if (remotePlan.candidateRecords.length <= 1) {
    return;
  }

  const persistCandidateIndexes = new Set<number>();

  for (const proposal of remotePlan.writeProposals) {
    if (!isCandidateScopedProposalType(proposal.proposalType)) {
      continue;
    }

    const candidateIndex = resolveProposalCandidateIndex(proposal);

    if (candidateIndex === null) {
      throw new Error(
        `Planner payload must include explicit candidateIndex routing for ${proposal.proposalType} when multiple candidate records exist.`,
      );
    }

    if (candidateIndex >= remotePlan.candidateRecords.length) {
      throw new Error(
        `Planner payload candidateIndex ${candidateIndex} is out of range for ${remotePlan.candidateRecords.length} candidate records.`,
      );
    }

    if (proposal.proposalType === "persist_candidate_record") {
      persistCandidateIndexes.add(candidateIndex);
    }
  }

  for (const [candidateIndex] of remotePlan.candidateRecords.entries()) {
    if (!persistCandidateIndexes.has(candidateIndex)) {
      throw new Error(
        `Planner payload is missing persist_candidate_record routing for candidate ${candidateIndex}.`,
      );
    }
  }

  for (const resolution of remotePlan.counterpartyResolutions) {
    if (resolution.candidateIndex === undefined) {
      throw new Error(
        "Planner payload must include candidateIndex on counterparty resolutions when multiple candidate records exist.",
      );
    }

    if (resolution.candidateIndex < 0 || resolution.candidateIndex >= remotePlan.candidateRecords.length) {
      throw new Error(
        `Planner payload counterparty resolution candidateIndex ${resolution.candidateIndex} is out of range.`,
      );
    }
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
  return input.remoteCandidateRecords.map((candidate, candidateIndex) => {
    const readResult = findCandidateReadResult(input.readResults, candidateIndex);
    const draft = materializeCandidateRecordDraft({
      candidate,
      candidateIndex,
      evidence: input.evidence,
      extractedData: input.extractedData,
    });

    return {
      ...draft,
      sourceCounterpartyId:
        readResult.sourceCounterpartyMatches.length === 1
          ? readResult.sourceCounterpartyMatches[0]?.counterpartyId ?? null
          : null,
      targetCounterpartyId:
        readResult.targetCounterpartyMatches.length === 1
          ? readResult.targetCounterpartyMatches[0]?.counterpartyId ?? null
          : null,
    };
  });
}

function buildCounterpartyResolutions(input: {
  evidence: Pick<EvidenceQueueItem, "capturedSource" | "capturedTarget">;
  readResults: PlannerReadResults;
  remoteResolutions: CounterpartyResolution[];
  candidateRecords: CandidateRecordPayload[];
}): CounterpartyResolution[] {
  return input.candidateRecords.flatMap((candidateRecord, candidateIndex) =>
    (["source", "target"] as const).map((role) => {
      const readResult = findCandidateReadResult(input.readResults, candidateIndex);
      const displayName =
        normalizeText(role === "source" ? candidateRecord.sourceLabel : candidateRecord.targetLabel) ??
        normalizeText(role === "source" ? input.evidence.capturedSource : input.evidence.capturedTarget) ??
        "";
      const remoteResolution = findCandidateResolution(input.remoteResolutions, {
        candidateIndex,
        displayName,
        role,
      });
      const matches =
        role === "source" ? readResult.sourceCounterpartyMatches : readResult.targetCounterpartyMatches;
      const suggestions =
        role === "source" ? readResult.sourceCounterpartySuggestions : readResult.targetCounterpartySuggestions;

      if (!displayName) {
        return {
          candidateIndex,
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
          candidateIndex,
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
          candidateIndex,
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
          candidateIndex,
          confidence: "medium",
          displayName,
          matchedDisplayNames: suggestions.map((match) => match.displayName),
          matchedCounterpartyIds: suggestions.map((match) => match.counterpartyId),
          role,
          status: "ambiguous",
        } satisfies CounterpartyResolution;
      }

      if (
        remoteResolution &&
        remoteResolution.status !== "proposed_new" &&
        remoteResolution.matchedCounterpartyIds.length > 0
      ) {
        return {
          candidateIndex,
          confidence: remoteResolution.confidence,
          displayName,
          matchedDisplayNames: remoteResolution.matchedDisplayNames,
          matchedCounterpartyIds: remoteResolution.matchedCounterpartyIds,
          role,
          status: remoteResolution.status,
        } satisfies CounterpartyResolution;
      }

      return {
        candidateIndex,
        confidence: remoteResolution?.confidence ?? "medium",
        displayName,
        matchedDisplayNames: [],
        matchedCounterpartyIds: [],
        role,
        status: "proposed_new",
      } satisfies CounterpartyResolution;
    }),
  );
}

function buildDuplicateHints(
  readResults: PlannerReadResults,
  remoteDuplicateHints: DuplicateKind[],
): DuplicateKind[] {
  return dedupeDuplicateKinds([
    ...remoteDuplicateHints,
    ...(readResults.candidates.some((candidate) => candidate.duplicateReceiptMatches.length)
      ? (["near_duplicate"] as const)
      : []),
    ...(readResults.candidates.some((candidate) => candidate.duplicateRecordIds.length)
      ? (["record_duplicate"] as const)
      : []),
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
          candidates: readResults.candidates.map((candidateResult) => ({
            candidateIndex: candidateResult.candidateIndex,
            sourceMatches: candidateResult.sourceCounterpartyMatches,
            sourceSuggestions: candidateResult.sourceCounterpartySuggestions,
            targetMatches: candidateResult.targetCounterpartyMatches,
            targetSuggestions: candidateResult.targetCounterpartySuggestions,
          })) as unknown as JsonValue[],
        } as JsonObject,
        status: "completed",
      };
    }

      return {
        ...task,
        input: task.input ?? {},
        result: {
          candidates: readResults.candidates.map((candidateResult) => ({
            candidateIndex: candidateResult.candidateIndex,
            duplicateRecordIds: candidateResult.duplicateRecordIds,
            duplicateReceiptMatches: candidateResult.duplicateReceiptMatches.map((match) => ({
              conflictEvidenceId: match.conflictEvidenceId,
              conflictLabel: match.conflictLabel,
              matchedRecordIds: match.matchedRecordIds,
              matchedRecords: match.matchedRecords,
              overlapEntryCount: match.overlapEntryCount,
            })),
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
  duplicateHints: DuplicateKind[];
  remoteWriteProposals: WorkflowWriteProposalPayload[];
  readResults: PlannerReadResults;
  resolutions: CounterpartyResolution[];
}): WorkflowWriteProposalPayload[] {
  const proposals: WorkflowWriteProposalPayload[] = [];
  const passthroughRemoteProposals = input.remoteWriteProposals.filter((proposal) =>
    proposal.proposalType !== "create_counterparty" &&
    proposal.proposalType !== "merge_counterparty" &&
    proposal.proposalType !== "persist_candidate_record" &&
    proposal.proposalType !== "resolve_duplicate_receipt",
  );
  const consumedPassthroughIndexes = new Set<number>();

  for (const [candidateIndex, candidateRecord] of input.candidateRecords.entries()) {
    const candidateReadResult = findCandidateReadResult(input.readResults, candidateIndex);
    const candidateDuplicateMatch = selectPrimaryDuplicateMatch(candidateReadResult.duplicateReceiptMatches);
    const remoteDuplicateProposal = findProposal(input.remoteWriteProposals, "resolve_duplicate_receipt", {
      candidateIndex,
    });

    if (candidateDuplicateMatch || remoteDuplicateProposal) {
      proposals.push(
        buildResolveDuplicateReceiptProposal(
          remoteDuplicateProposal,
          candidateDuplicateMatch ?? buildDuplicateReceiptMatchFromProposal(remoteDuplicateProposal!),
          candidateIndex,
        ),
      );
    }

    for (const role of ["source", "target"] as const) {
      const resolution = input.resolutions.find((item) =>
        item.candidateIndex === candidateIndex && item.role === role,
      );
      const remoteMergeProposal = findProposal(input.remoteWriteProposals, "merge_counterparty", {
        candidateIndex,
        role,
      });
      const effectiveResolution = mergeResolutionWithRemoteProposal(
        resolution,
        remoteMergeProposal,
        role,
        candidateIndex,
      );

      if (!effectiveResolution?.displayName || effectiveResolution.status === "matched") {
        continue;
      }

      const remoteCreateProposal = findProposal(input.remoteWriteProposals, "create_counterparty", {
        candidateIndex,
        role,
      });

      if (
        effectiveResolution.status === "ambiguous" &&
        effectiveResolution.matchedCounterpartyIds.length > 0
      ) {
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

    passthroughRemoteProposals.forEach((proposal, index) => {
      if (
        resolveProposalCandidateIndex(proposal) === candidateIndex &&
        !consumedPassthroughIndexes.has(index)
      ) {
        proposals.push(proposal);
        consumedPassthroughIndexes.add(index);
      }
    });

    proposals.push(
      createPersistProposal(
        findProposal(input.remoteWriteProposals, "persist_candidate_record", {
          candidateIndex,
        }),
        buildCandidateDuplicateHints(candidateReadResult, input.duplicateHints),
        candidateDuplicateMatch,
        candidateRecord,
        candidateIndex,
      ),
    );
  }

  passthroughRemoteProposals.forEach((proposal, index) => {
    if (
      !consumedPassthroughIndexes.has(index) &&
      resolveProposalCandidateIndex(proposal) === null
    ) {
      proposals.push(proposal);
    }
  });

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

function findCandidateReadResult(
  readResults: PlannerReadResults,
  candidateIndex: number,
): CandidatePlannerReadResult {
  return readResults.candidates.find((candidate) => candidate.candidateIndex === candidateIndex) ?? {
    candidateIndex,
    duplicateRecordIds: [],
    duplicateReceiptMatches: [],
    sourceCounterpartyMatches: [],
    sourceCounterpartySuggestions: [],
    targetCounterpartyMatches: [],
    targetCounterpartySuggestions: [],
  };
}

function getParseRecordForCandidateIndex(
  extractedData: EvidenceExtractedData,
  candidateIndex: number,
): { candidates: EvidenceFieldCandidates; fields: EvidenceFieldCandidates } | null {
  const originData = extractedData.originData;

  if (!originData || typeof originData !== "object" || Array.isArray(originData)) {
    return null;
  }

  const parsePayload = normalizeReceiptParsePayload(originData as JsonValue, {
    defaultModel: extractedData.model ?? null,
    defaultParser: extractedData.parser,
  });

  if (!parsePayload) {
    return null;
  }

  return getReceiptParseRecords(parsePayload)[candidateIndex] ?? getReceiptParseRecords(parsePayload)[0] ?? null;
}

function findCandidateResolution(
  resolutions: CounterpartyResolution[],
  input: {
    candidateIndex: number;
    displayName: string;
    role: "source" | "target";
  },
): CounterpartyResolution | undefined {
  return (
    resolutions.find((resolution) =>
      resolution.role === input.role &&
      resolution.candidateIndex === input.candidateIndex,
    ) ??
    resolutions.find((resolution) =>
      resolution.role === input.role &&
      normalizeText(resolution.displayName) === normalizeText(input.displayName),
    ) ??
    resolutions.find((resolution) =>
      resolution.role === input.role &&
      resolution.candidateIndex === undefined,
    )
  );
}

function buildCandidateDuplicateHints(
  candidateReadResult: CandidatePlannerReadResult,
  duplicateHints: DuplicateKind[],
): DuplicateKind[] {
  return dedupeDuplicateKinds([
    ...duplicateHints.filter((hint) => hint !== "near_duplicate" && hint !== "record_duplicate"),
    ...(candidateReadResult.duplicateReceiptMatches.length ? (["near_duplicate"] as const) : []),
    ...(candidateReadResult.duplicateRecordIds.length ? (["record_duplicate"] as const) : []),
  ]);
}

function isCandidateScopedProposalType(
  proposalType: WorkflowWriteProposalPayload["proposalType"],
): boolean {
  return proposalType === "create_counterparty" ||
    proposalType === "merge_counterparty" ||
    proposalType === "persist_candidate_record" ||
    proposalType === "resolve_duplicate_receipt" ||
    proposalType === "update_candidate_record";
}

function resolveProposalCandidateIndex(proposal: WorkflowWriteProposalPayload | null): number | null {
  if (!proposal) {
    return null;
  }

  const candidateIndex = readFirstNumber(proposal.values.candidateIndex);

  return candidateIndex === null || candidateIndex < 0 ? null : candidateIndex;
}

function findProposal(
  proposals: WorkflowWriteProposalPayload[],
  proposalType: WorkflowWriteProposalPayload["proposalType"],
  options: {
    candidateIndex?: number;
    role?: "source" | "target";
  } = {},
): WorkflowWriteProposalPayload | null {
  const matches = proposals.filter((proposal) => {
    if (proposal.proposalType !== proposalType) {
      return false;
    }

    if (
      options.role !== undefined &&
      (proposal.role ?? normalizeProposalRole(proposal.values.role)) !== options.role
    ) {
      return false;
    }

    if (options.candidateIndex !== undefined) {
      const proposalCandidateIndex = resolveProposalCandidateIndex(proposal);
      return proposalCandidateIndex === options.candidateIndex || proposalCandidateIndex === null;
    }

    return true;
  });

  if (options.candidateIndex !== undefined) {
    return (
      matches.find((proposal) => resolveProposalCandidateIndex(proposal) === options.candidateIndex) ??
      (options.candidateIndex === 0
        ? matches.find((proposal) => resolveProposalCandidateIndex(proposal) === null)
        : null) ??
      null
    );
  }

  return matches[0] ?? null;
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
      candidateIndex: resolution.candidateIndex ?? resolveProposalCandidateIndex(remoteProposal) ?? 0,
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
      candidateIndex: resolution.candidateIndex ?? resolveProposalCandidateIndex(remoteProposal) ?? 0,
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
  candidateIndex: number,
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
      candidateIndex,
      conflictEvidenceId: match.conflictEvidenceId,
      duplicateEvidenceId: match.conflictEvidenceId,
      duplicateReceiptLabel: match.conflictLabel,
      matchedRecordIds: match.matchedRecordIds,
      matchedRecords: match.matchedRecords as unknown as JsonValue,
      overlapEntryCount: match.overlapEntryCount,
      relatedEvidenceFileName: match.conflictLabel,
    },
  };
}

function createPersistProposal(
  remoteProposal: WorkflowWriteProposalPayload | null,
  duplicateHints: DuplicateKind[],
  duplicateReceiptMatch: DuplicateReceiptMatch | null,
  candidateRecord: CandidateRecordPayload,
  candidateIndex: number,
): WorkflowWriteProposalPayload {
  return {
    candidateId: remoteProposal?.candidateId,
    counterpartyId: remoteProposal?.counterpartyId,
    dependencyIds: remoteProposal?.dependencyIds,
    proposalType: "persist_candidate_record",
    reviewFields: remoteProposal?.reviewFields?.length ? remoteProposal.reviewFields : ["amount", "date", "source", "target"],
    role: remoteProposal?.role,
    values: {
      ...(remoteProposal?.values ?? {}),
      candidateIndex,
      duplicateHints,
      duplicateReceiptMatch: duplicateReceiptMatch
          ? {
            conflictEvidenceId: duplicateReceiptMatch.conflictEvidenceId,
            conflictLabel: duplicateReceiptMatch.conflictLabel,
            matchedRecordIds: duplicateReceiptMatch.matchedRecordIds,
            matchedRecords:
              duplicateReceiptMatch.matchedRecords as unknown as JsonValue,
            overlapEntryCount: duplicateReceiptMatch.overlapEntryCount,
          }
        : null,
      payload: candidateRecord as unknown as JsonObject,
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

function formatDuplicateReceiptWarning(match: DuplicateReceiptMatch, candidateIndex: number): string {
  return `Candidate ${candidateIndex + 1}: potential duplicate receipt detected: ${match.overlapEntryCount} overlapping ${
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
    matchedRecords: asRecordSummaries(proposal.values.matchedRecords),
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
  candidateIndex: number,
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
    candidateIndex,
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

function asRecordSummaries(value: JsonValue | undefined): DuplicateMatchedRecordSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, JsonValue>;
    const recordId = normalizeJsonString(record.recordId);

    if (!recordId) {
      return [];
    }

    return [
      {
        amountCents: readFirstNumber(record.amountCents) ?? 0,
        date: normalizeJsonString(record.date) ?? "",
        description: normalizeJsonString(record.description) ?? "",
        recordId,
        sourceLabel: normalizeJsonString(record.sourceLabel) ?? "",
        targetLabel: normalizeJsonString(record.targetLabel) ?? "",
      },
    ];
  });
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
