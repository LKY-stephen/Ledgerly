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
}

export interface PlannerReadResults {
  duplicateRecordIds: string[];
  sourceCounterpartyMatches: PlannerLookupMatch[];
  targetCounterpartyMatches: PlannerLookupMatch[];
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
    resolutions: counterpartyResolutions,
  });
  const warnings = dedupeStrings([
    ...input.extractedData.warnings,
    ...input.remotePlan.warnings,
    ...(duplicateHints.includes("record_duplicate")
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
  if (input.duplicateHints.includes("record_duplicate")) {
    return "duplicate";
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

    if (!displayName) {
      return {
        confidence: "low",
        displayName: "",
        matchedCounterpartyIds: [],
        role,
        status: "proposed_new",
      } satisfies CounterpartyResolution;
    }

    if (matches.length === 1) {
      return {
        confidence: "high",
        displayName,
        matchedCounterpartyIds: [matches[0]!.counterpartyId],
        role,
        status: "matched",
      } satisfies CounterpartyResolution;
    }

    if (matches.length > 1) {
      return {
        confidence: "medium",
        displayName,
        matchedCounterpartyIds: matches.map((match) => match.counterpartyId),
        role,
        status: "ambiguous",
      } satisfies CounterpartyResolution;
    }

    return {
      confidence: remoteResolution?.confidence ?? "medium",
      displayName,
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
          targetMatches: readResults.targetCounterpartyMatches as unknown as JsonValue[],
        } as JsonObject,
        status: "completed",
      };
    }

    return {
      ...task,
      input: task.input ?? {},
      result: {
        duplicateRecordIds: readResults.duplicateRecordIds,
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
  resolutions: CounterpartyResolution[];
}): WorkflowWriteProposalPayload[] {
  const primaryCandidate = input.candidateRecords[0] ?? null;

  return input.remoteWriteProposals.map((proposal) => {
    if (proposal.proposalType === "persist_candidate_record" && primaryCandidate) {
      return {
        ...proposal,
        candidateId: primaryCandidate.evidenceId,
        dependencyIds: input.remoteWriteProposals
          .filter((item) => item.proposalType === "create_counterparty")
          .map((item, index) => asProposalDependencyId(item, index)),
        reviewFields: proposal.reviewFields?.length ? proposal.reviewFields : ["amount", "date", "source", "target"],
        values: {
          ...proposal.values,
          duplicateHints: input.duplicateHints,
          payload: primaryCandidate as unknown as JsonObject,
        },
      };
    }

    if (proposal.proposalType === "create_counterparty") {
      const role = proposal.role ?? normalizeProposalRole(proposal.values.role);
      const resolution = role ? input.resolutions.find((item) => item.role === role) : null;

      return {
        ...proposal,
        reviewFields: proposal.reviewFields?.length ? proposal.reviewFields : role === "target" ? ["target"] : ["source"],
        role: role ?? undefined,
        values: {
          ...proposal.values,
          displayName: normalizeJsonString(proposal.values.displayName) ?? resolution?.displayName ?? "",
          role: role ?? "source",
        },
      };
    }

    return proposal;
  });
}

function asProposalDependencyId(proposal: WorkflowWriteProposalPayload, index: number): string {
  return `${proposal.role ?? "counterparty"}-${index}`;
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
