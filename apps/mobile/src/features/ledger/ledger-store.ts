import type {
  CandidateRecordPayload,
  CandidateRecordState,
  DuplicateKind,
  EvidenceExtractedData,
  JsonValue,
  PlannerSummary,
  ReceiptPlannerPayload,
  UploadBatchState,
  WorkflowWriteProposalState,
} from "@ledgerly/schemas";
import {
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  type ReadableStorageDatabase,
  type WritableStorageDatabase,
} from "@ledgerly/storage";

import {
  createEmptyReviewValues,
  defaultEntityId,
  type DuplicateMatchedRecordSummary,
  type EvidenceQueueItem,
  type ImportedEvidenceBundle,
  type LedgerReviewValues,
  type ProposalApprovalOptions,
  type WorkflowCandidateRecord,
  type WorkflowWriteProposalItem,
} from "./ledger-domain";
import {
  buildReviewValuesFromPayload,
  deriveCandidateState,
  buildPlannerSummary,
  mergeReviewValuesWithPayload,
  shouldDefaultReviewDateToCurrentDate,
  type DuplicateReceiptMatch,
  type PlannerLookupMatch,
  type PlannerReadResults,
} from "./workflow-planner";

const defaultEntitySeed = {
  baseCurrency: "USD",
  defaultTimezone: "UTC",
  entityId: defaultEntityId,
  entityType: "sole_proprietorship",
  legalName: "Ledgerly Main Entity",
} as const;

interface PersistedExtractionRun {
  batchId: string;
  createdAt: string;
  evidenceId: string;
  extractionRunId: string;
}

interface PersistedPlannerRun {
  batchId: string;
  createdAt: string;
  evidenceId: string;
  plannerRunId: string;
}

interface QueueBaseRow {
  batchCreatedAt: string | null;
  batchId: string | null;
  batchState: UploadBatchState | null;
  capturedAmountCents: number;
  capturedDate: string;
  capturedDescription: string;
  capturedSource: string;
  capturedTarget: string;
  createdAt: string;
  duplicateKind: DuplicateKind | null;
  evidenceId: string;
  evidenceKind: string;
  extractionRunId: string | null;
  extractedData: string | null;
  filePath: string;
  mimeType: string | null;
  originalFileName: string;
  parseStatus: "failed" | "parsed" | "pending";
  plannerRunId: string | null;
  plannerSummaryJson: string | null;
}

interface CounterpartyLookupResult {
  exactMatches: PlannerLookupMatch[];
  suggestedMatches: PlannerLookupMatch[];
}

export async function ensureDefaultEntity(
  database: WritableStorageDatabase,
  createdAt: string,
): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO entities (
      entity_id,
      legal_name,
      entity_type,
      base_currency,
      default_timezone,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    defaultEntitySeed.entityId,
    defaultEntitySeed.legalName,
    defaultEntitySeed.entityType,
    defaultEntitySeed.baseCurrency,
    defaultEntitySeed.defaultTimezone,
    createdAt,
  );
}

export async function createUploadBatch(
  database: WritableStorageDatabase,
  input: {
    batchId: string;
    createdAt: string;
    entityId?: string;
    evidenceId: string;
    sourceSystem: string;
    state?: UploadBatchState;
  },
): Promise<void> {
  const entityId = input.entityId ?? defaultEntityId;
  const state = input.state ?? "uploaded";

  await database.runAsync(
    `INSERT INTO upload_batches (
      batch_id,
      evidence_id,
      entity_id,
      source_system,
      state,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.batchId,
    input.evidenceId,
    entityId,
    input.sourceSystem,
    state,
    input.createdAt,
    input.createdAt,
  );
}

export async function updateUploadBatchState(
  database: WritableStorageDatabase,
  input: {
    batchId: string;
    duplicateKind?: DuplicateKind | null;
    duplicateOfEvidenceId?: string | null;
    errorMessage?: string | null;
    state: UploadBatchState;
    updatedAt: string;
  },
): Promise<void> {
  await database.runAsync(
    `UPDATE upload_batches
     SET state = ?,
         duplicate_kind = ?,
         duplicate_of_evidence_id = ?,
         error_message = ?,
         updated_at = ?
     WHERE batch_id = ?;`,
    input.state,
    input.duplicateKind ?? null,
    input.duplicateOfEvidenceId ?? null,
    input.errorMessage ?? null,
    input.updatedAt,
    input.batchId,
  );
}

export async function insertImportedEvidenceBundle(
  database: WritableStorageDatabase,
  bundle: ImportedEvidenceBundle,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO evidences (
      evidence_id,
      entity_id,
      evidence_kind,
      file_path,
      parse_status,
      extracted_data,
      captured_date,
      captured_amount_cents,
      captured_source,
      captured_target,
      captured_description,
      source_system,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    bundle.evidenceId,
    bundle.entityId,
    bundle.evidenceKind,
    bundle.filePath,
    "pending",
    null,
    bundle.capturedAt.slice(0, 10),
    0,
    "",
    "",
    "",
    bundle.sourceSystem,
    bundle.capturedAt,
  );

  for (const file of bundle.files) {
    await database.runAsync(
      `INSERT INTO evidence_files (
        evidence_file_id,
        evidence_id,
        vault_collection,
        relative_path,
        original_file_name,
        mime_type,
        size_bytes,
        sha256_hex,
        captured_at,
        is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      file.evidenceFileId,
      bundle.evidenceId,
      file.vaultCollection,
      file.relativePath,
      file.originalFileName,
      file.mimeType,
      file.sizeBytes,
      file.sha256Hex,
      file.capturedAt,
      file.isPrimary ? 1 : 0,
    );
  }
}

export async function findDuplicateEvidenceForFingerprint(
  database: ReadableStorageDatabase,
  input: {
    evidenceId: string;
    sha256Hex: string;
    sizeBytes: number | null;
  },
): Promise<string | null> {
  const row = await database.getFirstAsync<{ evidenceId: string }>(
    `SELECT evidence_id AS evidenceId
     FROM evidence_files
     WHERE sha256_hex = ?
       AND ((size_bytes IS NULL AND ? IS NULL) OR size_bytes = ?)
       AND evidence_id != ?
     ORDER BY captured_at DESC
     LIMIT 1;`,
    input.sha256Hex,
    input.sizeBytes,
    input.sizeBytes,
    input.evidenceId,
  );

  return row?.evidenceId ?? null;
}

export async function createExtractionRun(
  database: WritableStorageDatabase,
  input: PersistedExtractionRun,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO extraction_runs (
      extraction_run_id,
      batch_id,
      evidence_id,
      state,
      parser_kind,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.extractionRunId,
    input.batchId,
    input.evidenceId,
    "parsing",
    "openai_gpt",
    input.createdAt,
    input.createdAt,
  );
}

export async function updateExtractionRun(
  database: WritableStorageDatabase,
  input: {
    errorMessage?: string | null;
    extractionRunId: string;
    model?: string | null;
    parsePayload?: JsonValue | null;
    state: "complete" | "failed" | "parsing";
    updatedAt: string;
  },
): Promise<void> {
  await database.runAsync(
    `UPDATE extraction_runs
     SET state = ?,
         model = ?,
         parse_payload = ?,
         error_message = ?,
         updated_at = ?
     WHERE extraction_run_id = ?;`,
    input.state,
    input.model ?? null,
    input.parsePayload ? JSON.stringify(input.parsePayload) : null,
    input.errorMessage ?? null,
    input.updatedAt,
    input.extractionRunId,
  );
}

export async function createPlannerRun(
  database: WritableStorageDatabase,
  input: PersistedPlannerRun & { extractionRunId: string },
): Promise<void> {
  await database.runAsync(
    `INSERT INTO planner_runs (
      planner_run_id,
      batch_id,
      evidence_id,
      extraction_run_id,
      state,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.plannerRunId,
    input.batchId,
    input.evidenceId,
    input.extractionRunId,
    "planning",
    input.createdAt,
    input.createdAt,
  );
}

export async function updatePlannerRun(
  database: WritableStorageDatabase,
  input: {
    errorMessage?: string | null;
    plannerPayload?: ReceiptPlannerPayload | null;
    plannerRunId: string;
    state: "complete" | "failed" | "planning";
    summary?: PlannerSummary | null;
    updatedAt: string;
  },
): Promise<void> {
  await database.runAsync(
    `UPDATE planner_runs
     SET state = ?,
         planner_payload_json = ?,
         summary_json = ?,
         error_message = ?,
         updated_at = ?
     WHERE planner_run_id = ?;`,
    input.state,
    input.plannerPayload ? JSON.stringify(input.plannerPayload) : null,
    input.summary ? JSON.stringify(input.summary) : null,
    input.errorMessage ?? null,
    input.updatedAt,
    input.plannerRunId,
  );
}

export async function loadPlannerReadResults(
  database: ReadableStorageDatabase,
  input: {
    amountCents: number | null;
    date: string | null;
    description: string | null;
    entityId?: string;
    sourceLabel: string | null;
    targetLabel: string | null;
  },
): Promise<PlannerReadResults> {
  const entityId = input.entityId ?? defaultEntityId;
  const sourceLookup = await lookupCounterparties(database, entityId, input.sourceLabel);
  const targetLookup = await lookupCounterparties(database, entityId, input.targetLabel);
  const duplicateReceiptMatches = await lookupDuplicateReceiptMatches(database, {
    amountCents: input.amountCents,
    date: input.date,
    description: input.description,
    entityId,
    sourceLabel: input.sourceLabel,
    targetLabel: input.targetLabel,
  });
  const duplicateRecordIds = dedupeStrings(
    duplicateReceiptMatches.flatMap((match) => match.matchedRecordIds),
  );

  return {
    duplicateRecordIds,
    duplicateReceiptMatches,
    sourceCounterpartyMatches: sourceLookup.exactMatches,
    sourceCounterpartySuggestions: sourceLookup.suggestedMatches,
    targetCounterpartyMatches: targetLookup.exactMatches,
    targetCounterpartySuggestions: targetLookup.suggestedMatches,
  };
}

export async function savePlannerArtifacts(
  database: WritableStorageDatabase,
  input: {
    batchId: string;
    createdAt: string;
    evidence: EvidenceQueueItem;
    plannerRunId: string;
    remotePlan: ReceiptPlannerPayload;
  },
): Promise<void> {
  const extractedData = input.evidence.extractedData;

  if (!extractedData) {
    throw new Error("Planner requires extracted data.");
  }

  const readResults = await loadPlannerReadResults(database, {
    amountCents: extractedData.fields.amountCents,
    date: extractedData.fields.date,
    description: extractedData.fields.description,
    sourceLabel: extractedData.fields.source,
    targetLabel: extractedData.fields.target,
  });
  const summary = buildPlannerSummary({
    evidence: input.evidence,
    extractedData,
    readResults,
    remotePlan: input.remotePlan,
  });
  const defaultReviewDate = shouldDefaultReviewDateToCurrentDate(summary)
    ? input.createdAt.slice(0, 10)
    : null;
  await updatePlannerRun(database, {
    plannerPayload: input.remotePlan,
    plannerRunId: input.plannerRunId,
    state: "complete",
    summary,
    updatedAt: input.createdAt,
  });

  for (const [index, readTask] of summary.readTasks.entries()) {
    await database.runAsync(
      `INSERT INTO planner_read_tasks (
        read_task_id,
        planner_run_id,
        task_type,
        status,
        input_json,
        result_json,
        rationale,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      `${input.plannerRunId}-read-${index + 1}`,
      input.plannerRunId,
      readTask.taskType,
      readTask.status,
      readTask.input ? JSON.stringify(readTask.input) : null,
      readTask.result ? JSON.stringify(readTask.result) : null,
      readTask.rationale,
      input.createdAt,
      input.createdAt,
    );
  }

  const candidateIds: string[] = [];

  for (const [index, payload] of summary.candidateRecords.entries()) {
    const candidateId = `${input.plannerRunId}-candidate-${index + 1}`;
    candidateIds.push(candidateId);
    const resolutions = summary.counterpartyResolutions.filter((resolution) =>
      resolution.displayName
        ? [payload.sourceLabel, payload.targetLabel].includes(resolution.displayName)
        : false,
    );
    const state = deriveCandidateState({
      duplicateHints: summary.duplicateHints,
      payload,
      resolutions,
    });

    await database.runAsync(
      `INSERT INTO candidate_records (
        candidate_id,
        batch_id,
        planner_run_id,
        evidence_id,
        state,
        payload_json,
        review_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      candidateId,
      input.batchId,
      input.plannerRunId,
      input.evidence.evidenceId,
      state,
      JSON.stringify(payload),
      JSON.stringify(
        buildReviewValuesFromPayload(payload, {
          defaultDate: defaultReviewDate,
        }),
      ),
      input.createdAt,
      input.createdAt,
    );
  }

  const candidateState = candidateIds.length ? await loadCandidateState(database, candidateIds[0]!) : "candidate";
  const insertedProposals: Array<{
    proposal: PlannerSummary["writeProposals"][number];
    writeProposalId: string;
  }> = [];
  for (const [index, proposal] of summary.writeProposals.entries()) {
    const writeProposalId = `${input.plannerRunId}-proposal-${index + 1}`;
    const dependencyIds = resolveStoredProposalDependencies(insertedProposals, proposal);

    const proposalState = determineInitialProposalState({
      candidateState,
      dependencyCount: dependencyIds.length,
      proposalType: proposal.proposalType,
    });

    await database.runAsync(
      `INSERT INTO workflow_write_proposals (
        write_proposal_id,
        planner_run_id,
        candidate_id,
        proposal_type,
        state,
        approval_required,
        dependency_ids,
        payload_json,
        rationale,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      writeProposalId,
      input.plannerRunId,
      candidateIds[0] ?? null,
      proposal.proposalType,
      proposalState,
      1,
      dependencyIds.length ? JSON.stringify(dependencyIds) : null,
      JSON.stringify(proposal.values),
      buildProposalRationale(proposal),
      input.createdAt,
      input.createdAt,
    );
    insertedProposals.push({ proposal, writeProposalId });
  }

  const duplicateReceiptProposal = summary.writeProposals.find(
    (proposal) => proposal.proposalType === "resolve_duplicate_receipt",
  );
  const batchState = determineBatchState(summary, candidateState);
  await updateUploadBatchState(database, {
    batchId: input.batchId,
    duplicateKind: duplicateReceiptProposal ? "near_duplicate" : null,
    duplicateOfEvidenceId: asString(duplicateReceiptProposal?.values.conflictEvidenceId ?? duplicateReceiptProposal?.values.duplicateEvidenceId),
    state: batchState,
    updatedAt: input.createdAt,
  });
  await appendWorkflowAuditEvent(database, {
    batchId: input.batchId,
    createdAt: input.createdAt,
    eventType: "planner_completed",
    message: summary.summary,
    plannerRunId: input.plannerRunId,
    payload: summary as unknown as Record<string, JsonValue>,
  });
}

export async function loadEvidenceQueue(
  database: ReadableStorageDatabase,
  entityId = defaultEntityId,
): Promise<EvidenceQueueItem[]> {
  const rows = await database.getAllAsync<QueueBaseRow>(
    `SELECT
      evidences.evidence_id AS evidenceId,
      evidences.evidence_kind AS evidenceKind,
      evidences.file_path AS filePath,
      evidences.parse_status AS parseStatus,
      evidences.extracted_data AS extractedData,
      evidences.captured_date AS capturedDate,
      evidences.captured_amount_cents AS capturedAmountCents,
      evidences.captured_source AS capturedSource,
      evidences.captured_target AS capturedTarget,
      evidences.captured_description AS capturedDescription,
      evidences.created_at AS createdAt,
      evidence_files.original_file_name AS originalFileName,
      evidence_files.mime_type AS mimeType,
      upload_batches.batch_id AS batchId,
      upload_batches.state AS batchState,
      upload_batches.duplicate_kind AS duplicateKind,
      upload_batches.created_at AS batchCreatedAt,
      extraction_runs.extraction_run_id AS extractionRunId,
      planner_runs.planner_run_id AS plannerRunId,
      planner_runs.summary_json AS plannerSummaryJson
    FROM evidences
    LEFT JOIN evidence_files
      ON evidence_files.evidence_id = evidences.evidence_id
     AND evidence_files.is_primary = 1
    LEFT JOIN upload_batches
      ON upload_batches.evidence_id = evidences.evidence_id
    LEFT JOIN extraction_runs
      ON extraction_runs.extraction_run_id = (
        SELECT extraction_run_id
        FROM extraction_runs latest_extraction
        WHERE latest_extraction.evidence_id = evidences.evidence_id
        ORDER BY latest_extraction.created_at DESC
        LIMIT 1
      )
    LEFT JOIN planner_runs
      ON planner_runs.planner_run_id = (
        SELECT planner_run_id
        FROM planner_runs latest_planner
        WHERE latest_planner.evidence_id = evidences.evidence_id
        ORDER BY latest_planner.created_at DESC
        LIMIT 1
      )
    WHERE evidences.entity_id = ?
      AND COALESCE(upload_batches.state, '') != 'duplicate_file'
      AND (
        evidences.parse_status IN ('pending', 'failed')
        OR COALESCE(upload_batches.state, '') NOT IN ('approved', 'rejected')
      )
    ORDER BY COALESCE(upload_batches.created_at, evidences.created_at) DESC;`,
    entityId,
  );

  return Promise.all(rows.map((row) => hydrateEvidenceQueueItem(database, row)));
}

export async function loadEvidenceById(
  database: ReadableStorageDatabase,
  evidenceId: string,
): Promise<EvidenceQueueItem | null> {
  const rows = await loadEvidenceQueueByIds(database, [evidenceId]);
  return rows[0] ?? null;
}

export async function updateEvidenceExtraction(
  database: WritableStorageDatabase,
  input: {
    evidenceId: string;
    extractedData: EvidenceExtractedData;
    parseStatus: "failed" | "pending";
  },
): Promise<void> {
  await database.runAsync(
    `UPDATE evidences
     SET extracted_data = ?,
         parse_status = ?
     WHERE evidence_id = ?;`,
    JSON.stringify(input.extractedData),
    input.parseStatus,
    input.evidenceId,
  );
}

export async function approveWorkflowWriteProposal(
  database: WritableStorageDatabase,
  input: {
    actor?: string;
    evidenceId: string;
    options?: ProposalApprovalOptions;
    review?: LedgerReviewValues;
    updatedAt: string;
    writeProposalId: string;
  },
): Promise<void> {
  const proposal = await loadProposalById(database, input.writeProposalId);

  if (!proposal) {
    throw new Error("Workflow proposal not found.");
  }

  if (proposal.proposalType === "create_counterparty") {
    await executeCreateCounterpartyProposal(database, {
      actor: input.actor ?? "local_user",
      proposal,
      review: input.review,
      updatedAt: input.updatedAt,
    });
    return;
  }

  if (proposal.proposalType === "merge_counterparty") {
    await executeMergeCounterpartyProposal(database, {
      actor: input.actor ?? "local_user",
      proposal,
      review: input.review,
      updatedAt: input.updatedAt,
    });
    return;
  }

  if (proposal.proposalType === "resolve_duplicate_receipt") {
    await executeResolveDuplicateReceiptProposal(database, {
      actor: input.actor ?? "local_user",
      evidenceId: input.evidenceId,
      options: input.options,
      review: input.review,
      proposal,
      updatedAt: input.updatedAt,
    });
    return;
  }

  await executePersistCandidateProposal(database, {
    actor: input.actor ?? "local_user",
    evidenceId: input.evidenceId,
    proposal,
    review: input.review,
    updatedAt: input.updatedAt,
  });
}

export async function rejectWorkflowWriteProposal(
  database: WritableStorageDatabase,
  input: {
    actor?: string;
    updatedAt: string;
    writeProposalId: string;
  },
): Promise<void> {
  const proposal = await loadProposalById(database, input.writeProposalId);

  if (!proposal) {
    throw new Error("Workflow proposal not found.");
  }

  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE write_proposal_id = ?;`,
    "rejected",
    input.updatedAt,
    input.writeProposalId,
  );

  if (proposal.candidateId) {
    await database.runAsync(
      `UPDATE candidate_records
       SET state = ?,
           updated_at = ?
       WHERE candidate_id = ?;`,
      proposal.proposalType === "persist_candidate_record" ? "rejected" : "needs_review",
      input.updatedAt,
      proposal.candidateId,
    );
  }

  if (proposal.proposalType === "create_counterparty") {
    await blockDependentProposals(database, proposal.writeProposalId, input.updatedAt);
    await updateUploadBatchState(database, {
      batchId: proposal.batchId,
      state: "rejected",
      updatedAt: input.updatedAt,
    });
  } else if (
    proposal.proposalType === "merge_counterparty" ||
    proposal.proposalType === "resolve_duplicate_receipt"
  ) {
    await releaseResolvedDecisionDependencies(database, input.updatedAt);
    await updateUploadBatchState(database, {
      batchId: proposal.batchId,
      state: "review_required",
      updatedAt: input.updatedAt,
    });
  } else if (proposal.proposalType === "persist_candidate_record") {
    await updateUploadBatchState(database, {
      batchId: proposal.batchId,
      state: "rejected",
      updatedAt: input.updatedAt,
    });
  }

  await appendWorkflowAuditEvent(database, {
    batchId: proposal.batchId,
    candidateId: proposal.candidateId,
    createdAt: input.updatedAt,
    eventType: "proposal_rejected",
    message: `${proposal.proposalType} was rejected by ${input.actor ?? "local_user"}.`,
    plannerRunId: proposal.plannerRunId,
    writeProposalId: proposal.writeProposalId,
  });
}

export async function finalizeEvidenceReview(
  database: WritableStorageDatabase,
  input: {
    createdAt: string;
    entityId?: string;
    evidenceId: string;
    review: LedgerReviewValues;
    sourceSystem: string;
  },
): Promise<string> {
  const evidence = await loadEvidenceById(database, input.evidenceId);

  if (!evidence) {
    throw new Error("Selected evidence no longer exists.");
  }

  if (!evidence.writeProposals.length) {
    const normalizedReview = normalizeReviewValues(input.review);
    const amountCents = Math.round(Number.parseFloat(normalizedReview.amountValue) * 100);
    const existingEvidence = await database.getFirstAsync<{ extractedData: string | null }>(
      "SELECT extracted_data AS extractedData FROM evidences WHERE evidence_id = ?;",
      input.evidenceId,
    );
    const existingExtractedData = existingEvidence?.extractedData
      ? (JSON.parse(existingEvidence.extractedData) as EvidenceExtractedData)
      : null;
    const extractedData = buildConfirmedExtractedData(
      normalizedReview,
      existingExtractedData,
      normalizedReview.failureReason,
    );
    const resolvedEntry = resolveStandardReceiptEntry(
      {
        amountCents,
        currency: "USD",
        description: normalizedReview.description,
        entityId: defaultEntityId,
        evidenceIds: [input.evidenceId],
        memo: normalizedReview.notes || null,
        occurredOn: normalizedReview.date,
        source: normalizedReview.source,
        target: normalizedReview.target,
        userClassification:
          normalizedReview.category === "income"
            ? "income"
            : normalizedReview.category === "non_business_income"
              ? "non_business_income"
            : normalizedReview.category === "spending"
              ? "personal_spending"
              : "expense",
      },
      {
        createdAt: input.createdAt,
        recordId: `record-${input.evidenceId}`,
        sourceSystem: input.sourceSystem,
        updatedAt: input.createdAt,
      },
    );

    await persistResolvedStandardReceiptEntry(database, resolvedEntry);
    await database.runAsync(
      `UPDATE evidences
       SET parse_status = 'parsed',
           extracted_data = ?,
           captured_date = ?,
           captured_amount_cents = ?,
           captured_source = ?,
           captured_target = ?,
           captured_description = ?
       WHERE evidence_id = ?;`,
      JSON.stringify(extractedData),
      normalizedReview.date,
      amountCents,
      normalizedReview.source,
      normalizedReview.target,
      normalizedReview.description,
      input.evidenceId,
    );

    return resolvedEntry.record.recordId;
  }

  for (const proposal of evidence.writeProposals.filter((item) => item.state === "pending_approval")) {
    await approveWorkflowWriteProposal(database, {
      evidenceId: input.evidenceId,
      review: proposal.proposalType === "persist_candidate_record" ? input.review : undefined,
      updatedAt: input.createdAt,
      writeProposalId: proposal.writeProposalId,
    });
  }

  const candidate = await loadLatestCandidateForEvidence(database, input.evidenceId);

  if (!candidate?.recordId) {
    throw new Error("Final record was not created.");
  }

  return candidate.recordId;
}

export async function loadEvidenceQueueByIds(
  database: ReadableStorageDatabase,
  evidenceIds: string[],
): Promise<EvidenceQueueItem[]> {
  if (!evidenceIds.length) {
    return [];
  }

  const placeholders = evidenceIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<QueueBaseRow>(
    `SELECT
      evidences.evidence_id AS evidenceId,
      evidences.evidence_kind AS evidenceKind,
      evidences.file_path AS filePath,
      evidences.parse_status AS parseStatus,
      evidences.extracted_data AS extractedData,
      evidences.captured_date AS capturedDate,
      evidences.captured_amount_cents AS capturedAmountCents,
      evidences.captured_source AS capturedSource,
      evidences.captured_target AS capturedTarget,
      evidences.captured_description AS capturedDescription,
      evidences.created_at AS createdAt,
      evidence_files.original_file_name AS originalFileName,
      evidence_files.mime_type AS mimeType,
      upload_batches.batch_id AS batchId,
      upload_batches.state AS batchState,
      upload_batches.duplicate_kind AS duplicateKind,
      upload_batches.created_at AS batchCreatedAt,
      extraction_runs.extraction_run_id AS extractionRunId,
      planner_runs.planner_run_id AS plannerRunId,
      planner_runs.summary_json AS plannerSummaryJson
    FROM evidences
    LEFT JOIN evidence_files
      ON evidence_files.evidence_id = evidences.evidence_id
     AND evidence_files.is_primary = 1
    LEFT JOIN upload_batches
      ON upload_batches.evidence_id = evidences.evidence_id
    LEFT JOIN extraction_runs
      ON extraction_runs.extraction_run_id = (
        SELECT extraction_run_id
        FROM extraction_runs latest_extraction
        WHERE latest_extraction.evidence_id = evidences.evidence_id
        ORDER BY latest_extraction.created_at DESC
        LIMIT 1
      )
    LEFT JOIN planner_runs
      ON planner_runs.planner_run_id = (
        SELECT planner_run_id
        FROM planner_runs latest_planner
        WHERE latest_planner.evidence_id = evidences.evidence_id
        ORDER BY latest_planner.created_at DESC
        LIMIT 1
      )
    WHERE evidences.evidence_id IN (${placeholders})
    ORDER BY COALESCE(upload_batches.created_at, evidences.created_at) DESC;`,
    ...evidenceIds,
  );

  return Promise.all(rows.map((row) => hydrateEvidenceQueueItem(database, row)));
}

export async function appendWorkflowAuditEvent(
  database: WritableStorageDatabase,
  input: {
    batchId: string;
    candidateId?: string | null;
    createdAt: string;
    eventType: string;
    message: string;
    payload?: Record<string, JsonValue> | null;
    plannerRunId?: string | null;
    writeProposalId?: string | null;
  },
): Promise<void> {
  await database.runAsync(
    `INSERT INTO workflow_audit_events (
      event_id,
      batch_id,
      planner_run_id,
      candidate_id,
      write_proposal_id,
      event_type,
      message,
      payload_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    `audit-${input.eventType}-${input.createdAt}`,
    input.batchId,
    input.plannerRunId ?? null,
    input.candidateId ?? null,
    input.writeProposalId ?? null,
    input.eventType,
    input.message,
    input.payload ? JSON.stringify(input.payload) : null,
    input.createdAt,
  );
}

async function hydrateEvidenceQueueItem(
  database: ReadableStorageDatabase,
  row: QueueBaseRow,
): Promise<EvidenceQueueItem> {
  const writeProposals = row.plannerRunId ? await loadWriteProposals(database, row.plannerRunId) : [];
  const candidateRecords = row.plannerRunId ? await loadCandidateRecords(database, row.plannerRunId) : [];
  const plannerSummary = row.plannerSummaryJson ? (JSON.parse(row.plannerSummaryJson) as PlannerSummary) : null;
  const readTasks = plannerSummary?.readTasks ?? [];
  const resolutions = plannerSummary?.counterpartyResolutions ?? [];

  return {
    batchCreatedAt: row.batchCreatedAt ?? row.createdAt,
    batchId: row.batchId ?? `batch-missing-${row.evidenceId}`,
    batchState: row.batchState ?? "uploaded",
    capturedAmountCents: row.capturedAmountCents,
    capturedDate: row.capturedDate,
    capturedDescription: row.capturedDescription,
    capturedSource: row.capturedSource,
    capturedTarget: row.capturedTarget,
    candidateRecords,
    createdAt: row.createdAt,
    duplicateKind: row.duplicateKind,
    evidenceId: row.evidenceId,
    evidenceKind: row.evidenceKind,
    extractionRunId: row.extractionRunId,
    extractedData: row.extractedData ? (JSON.parse(row.extractedData) as EvidenceExtractedData) : null,
    filePath: row.filePath,
    mimeType: row.mimeType,
    originalFileName: row.originalFileName,
    parseStatus: row.parseStatus,
    plannerRunId: row.plannerRunId,
    plannerSummary,
    readTasks,
    resolutions,
    writeProposals,
  };
}

async function lookupCounterparties(
  database: ReadableStorageDatabase,
  entityId: string,
  label: string | null,
): Promise<CounterpartyLookupResult> {
  const normalized = normalizeComparableText(label);

  if (!normalized) {
    return {
      exactMatches: [],
      suggestedMatches: [],
    };
  }

  const rows = await database.getAllAsync<PlannerLookupMatch>(
    `SELECT
      counterparty_id AS counterpartyId,
      display_name AS displayName
    FROM counterparties
    WHERE entity_id = ?
    ORDER BY created_at ASC;`,
    entityId,
  );

  const exactMatches = rows.filter((row) => normalizeComparableText(row.displayName) === normalized);
  const suggestedMatches = rows
    .filter((row) => !exactMatches.some((match) => match.counterpartyId === row.counterpartyId))
    .map((row) => ({
      ...row,
      matchScore: scoreTextSimilarity(normalized, normalizeComparableText(row.displayName)),
    }))
    .filter((row) => (row.matchScore ?? 0) >= 0.55)
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0))
    .slice(0, 3);

  return {
    exactMatches,
    suggestedMatches,
  };
}

async function lookupDuplicateReceiptMatches(
  database: ReadableStorageDatabase,
  input: {
    amountCents: number | null;
    date: string | null;
    description: string | null;
    entityId: string;
    sourceLabel: string | null;
    targetLabel: string | null;
  },
): Promise<DuplicateReceiptMatch[]> {
  if (!input.amountCents && !input.date && !normalizeText(input.description)) {
    return [];
  }

  const rows = await database.getAllAsync<{
    amountCents: number;
    conflictEvidenceId: string | null;
    conflictLabel: string | null;
    date: string;
    description: string;
    evidenceRecordCount: number;
    recordId: string;
    sourceLabel: string;
    targetLabel: string;
  }>(
    `SELECT
      records.record_id AS recordId,
      records.amount_cents AS amountCents,
      records.occurred_on AS date,
      records.description AS description,
      records.source_label AS sourceLabel,
      records.target_label AS targetLabel,
      links.evidence_id AS conflictEvidenceId,
      evidence_files.original_file_name AS conflictLabel,
      (
        SELECT COUNT(*)
        FROM record_evidence_links related_links
        WHERE related_links.evidence_id = links.evidence_id
      ) AS evidenceRecordCount
     FROM records
     LEFT JOIN record_evidence_links links
       ON links.record_id = records.record_id
     LEFT JOIN evidence_files
       ON evidence_files.evidence_id = links.evidence_id
      AND evidence_files.is_primary = 1
     WHERE records.entity_id = ?
       AND (
         (? IS NOT NULL AND records.occurred_on = ?)
         OR (? IS NOT NULL AND records.amount_cents = ?)
         OR (? IS NOT NULL AND LOWER(TRIM(records.description)) = LOWER(TRIM(?)))
         OR (? IS NOT NULL AND LOWER(TRIM(records.source_label)) = LOWER(TRIM(?)))
         OR (? IS NOT NULL AND LOWER(TRIM(records.target_label)) = LOWER(TRIM(?)))
       )
     ORDER BY records.created_at DESC;`,
    input.entityId,
    input.date,
    input.date,
    input.amountCents,
    input.amountCents,
    input.description,
    input.description,
    input.sourceLabel,
    input.sourceLabel,
    input.targetLabel,
    input.targetLabel,
  );

  const groupedMatches = new Map<string, DuplicateReceiptMatch>();

  for (const row of rows) {
    const conflictEvidenceId = normalizeText(row.conflictEvidenceId);

    if (!conflictEvidenceId) {
      continue;
    }

    const score = scoreDuplicateReceiptRow(row, input);

    if (score < 6) {
      continue;
    }

    const existing = groupedMatches.get(conflictEvidenceId) ?? {
      conflictEvidenceId,
      conflictLabel: normalizeText(row.conflictLabel) ?? conflictEvidenceId,
      matchedRecordIds: [],
      matchedRecords: [] as DuplicateMatchedRecordSummary[],
      overlapEntryCount: row.evidenceRecordCount > 0 ? row.evidenceRecordCount : 1,
    };

    if (!existing.matchedRecordIds.includes(row.recordId)) {
      existing.matchedRecordIds.push(row.recordId);
    }

    if (!existing.matchedRecords.some((record) => record.recordId === row.recordId)) {
      existing.matchedRecords.push({
        amountCents: row.amountCents,
        date: row.date,
        description: row.description,
        recordId: row.recordId,
        sourceLabel: row.sourceLabel,
        targetLabel: row.targetLabel,
      });
    }

    existing.overlapEntryCount = Math.max(
      existing.overlapEntryCount,
      row.evidenceRecordCount > 0 ? row.evidenceRecordCount : existing.matchedRecordIds.length,
    );
    groupedMatches.set(conflictEvidenceId, existing);
  }

  return [...groupedMatches.values()].sort((left, right) =>
    right.overlapEntryCount - left.overlapEntryCount ||
    right.matchedRecordIds.length - left.matchedRecordIds.length ||
    left.conflictLabel.localeCompare(right.conflictLabel),
  );
}

async function loadCandidateState(
  database: ReadableStorageDatabase,
  candidateId: string,
): Promise<CandidateRecordState> {
  const row = await database.getFirstAsync<{ state: CandidateRecordState }>(
    `SELECT state FROM candidate_records WHERE candidate_id = ?;`,
    candidateId,
  );

  return row?.state ?? "candidate";
}

async function loadCandidateRecords(
  database: ReadableStorageDatabase,
  plannerRunId: string,
): Promise<WorkflowCandidateRecord[]> {
  const rows = await database.getAllAsync<{
    candidateId: string;
    createdAt: string;
    errorMessage: string | null;
    payloadJson: string;
    recordId: string | null;
    reviewJson: string | null;
    state: CandidateRecordState;
    updatedAt: string;
  }>(
    `SELECT
      candidate_id AS candidateId,
      state,
      payload_json AS payloadJson,
      review_json AS reviewJson,
      record_id AS recordId,
      error_message AS errorMessage,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM candidate_records
    WHERE planner_run_id = ?
    ORDER BY created_at ASC;`,
    plannerRunId,
  );

  return rows.map((row) => {
    const payload = JSON.parse(row.payloadJson) as CandidateRecordPayload;

    return {
      candidateId: row.candidateId,
      createdAt: row.createdAt,
      errorMessage: row.errorMessage,
      payload,
      recordId: row.recordId,
      reviewValues: row.reviewJson
        ? (JSON.parse(row.reviewJson) as LedgerReviewValues)
        : buildReviewValuesFromPayload(payload),
      state: row.state,
      updatedAt: row.updatedAt,
    };
  });
}

async function loadWriteProposals(
  database: ReadableStorageDatabase,
  plannerRunId: string,
): Promise<WorkflowWriteProposalItem[]> {
  const rows = await database.getAllAsync<{
    approvalRequired: number;
    candidateId: string | null;
    createdAt: string;
    dependencyIds: string | null;
    payloadJson: string;
    proposalType: WorkflowWriteProposalItem["proposalType"];
    rationale: string;
    state: WorkflowWriteProposalState;
    updatedAt: string;
    writeProposalId: string;
  }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      candidate_id AS candidateId,
      proposal_type AS proposalType,
      state,
      approval_required AS approvalRequired,
      dependency_ids AS dependencyIds,
      payload_json AS payloadJson,
      rationale,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM workflow_write_proposals
    WHERE planner_run_id = ?
    ORDER BY created_at ASC;`,
    plannerRunId,
  );

  return rows.map((row) => ({
    approvalRequired: row.approvalRequired === 1,
    candidateId: row.candidateId,
    createdAt: row.createdAt,
    dependencyIds: row.dependencyIds ? (JSON.parse(row.dependencyIds) as string[]) : [],
    payload: JSON.parse(row.payloadJson) as Record<string, JsonValue>,
    proposalType: row.proposalType,
    rationale: row.rationale,
    state: row.state,
    updatedAt: row.updatedAt,
    writeProposalId: row.writeProposalId,
  }));
}

async function loadProposalById(
  database: ReadableStorageDatabase,
  writeProposalId: string,
): Promise<{
  batchId: string;
  candidateId: string | null;
  payload: Record<string, JsonValue>;
  plannerRunId: string;
  proposalType: WorkflowWriteProposalItem["proposalType"];
  writeProposalId: string;
} | null> {
  const row = await database.getFirstAsync<{
    batchId: string;
    candidateId: string | null;
    payloadJson: string;
    plannerRunId: string;
    proposalType: WorkflowWriteProposalItem["proposalType"];
    writeProposalId: string;
  }>(
    `SELECT
      workflow_write_proposals.write_proposal_id AS writeProposalId,
      workflow_write_proposals.candidate_id AS candidateId,
      workflow_write_proposals.payload_json AS payloadJson,
      workflow_write_proposals.proposal_type AS proposalType,
      workflow_write_proposals.planner_run_id AS plannerRunId,
      candidate_records.batch_id AS batchId
    FROM workflow_write_proposals
    LEFT JOIN candidate_records
      ON candidate_records.candidate_id = workflow_write_proposals.candidate_id
    WHERE workflow_write_proposals.write_proposal_id = ?;`,
    writeProposalId,
  );

  if (!row) {
    return null;
  }

  return {
    batchId: row.batchId,
    candidateId: row.candidateId,
    payload: JSON.parse(row.payloadJson) as Record<string, JsonValue>,
    plannerRunId: row.plannerRunId,
    proposalType: row.proposalType,
    writeProposalId: row.writeProposalId,
  };
}

async function executeCreateCounterpartyProposal(
  database: WritableStorageDatabase,
  input: {
    actor: string;
    proposal: NonNullable<Awaited<ReturnType<typeof loadProposalById>>>;
    review?: LedgerReviewValues;
    updatedAt: string;
  },
): Promise<void> {
  const role = normalizeText(asString(input.proposal.payload.role)) === "target" ? "target" : "source";
  const displayName = normalizeText(asString(input.proposal.payload.displayName));

  if (!displayName || !input.proposal.candidateId) {
    throw new Error("Counterparty proposal is missing displayName or candidate.");
  }

  const counterpartyId = `counterparty-${sanitizeId(displayName)}-${input.updatedAt.replace(/[^0-9]/g, "").slice(-10)}`;
  await database.runAsync(
    `INSERT INTO counterparties (
      counterparty_id,
      entity_id,
      counterparty_type,
      display_name,
      raw_reference,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    counterpartyId,
    defaultEntityId,
    role,
    displayName,
    displayName,
    "Created from upload planner approval.",
    input.updatedAt,
  );

  const candidate = await loadCandidateById(database, input.proposal.candidateId);

  if (!candidate) {
    throw new Error("Candidate row no longer exists.");
  }

  const nextPayload = {
    ...candidate.payload,
    ...(role === "source"
      ? { sourceCounterpartyId: counterpartyId, sourceLabel: displayName }
      : { targetCounterpartyId: counterpartyId, targetLabel: displayName }),
  } satisfies CandidateRecordPayload;
  const nextReview = mergeReviewValuesWithPayload(
    input.review ?? candidate.reviewValues,
    nextPayload,
    {
      overwriteFields: role === "source" ? ["source"] : ["target"],
    },
  );

  await database.runAsync(
    `UPDATE candidate_records
     SET payload_json = ?,
         review_json = ?,
         state = ?,
         updated_at = ?
     WHERE candidate_id = ?;`,
    JSON.stringify(nextPayload),
    JSON.stringify(nextReview),
    "validated",
    input.updatedAt,
    candidate.candidateId,
  );
  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE write_proposal_id = ?;`,
    "executed",
    input.updatedAt,
    input.proposal.writeProposalId,
  );
  await unblockDependentProposals(database, input.proposal.writeProposalId, input.updatedAt);
  await releaseResolvedDecisionDependencies(database, input.updatedAt);
  await appendWorkflowAuditEvent(database, {
    batchId: input.proposal.batchId,
    candidateId: input.proposal.candidateId,
    createdAt: input.updatedAt,
    eventType: "counterparty_created",
    message: `${displayName} approved and persisted as a counterparty.`,
    plannerRunId: input.proposal.plannerRunId,
    writeProposalId: input.proposal.writeProposalId,
  });
  await updateUploadBatchState(database, {
    batchId: input.proposal.batchId,
    state: "review_required",
    updatedAt: input.updatedAt,
  });
}

async function executeMergeCounterpartyProposal(
  database: WritableStorageDatabase,
  input: {
    actor: string;
    proposal: NonNullable<Awaited<ReturnType<typeof loadProposalById>>>;
    review?: LedgerReviewValues;
    updatedAt: string;
  },
): Promise<void> {
  const role = normalizeText(asString(input.proposal.payload.role)) === "target" ? "target" : "source";
  const existingCounterpartyId = normalizeText(
    asString(input.proposal.payload.existingCounterpartyId),
  );
  const existingDisplayName = normalizeText(
    asString(input.proposal.payload.existingDisplayName),
  );

  if (!existingCounterpartyId || !existingDisplayName || !input.proposal.candidateId) {
    throw new Error("Counterparty merge proposal is missing the existing counterparty reference.");
  }

  const candidate = await loadCandidateById(database, input.proposal.candidateId);

  if (!candidate) {
    throw new Error("Candidate row no longer exists.");
  }

  const nextPayload = {
    ...candidate.payload,
    ...(role === "source"
      ? { sourceCounterpartyId: existingCounterpartyId, sourceLabel: existingDisplayName }
      : { targetCounterpartyId: existingCounterpartyId, targetLabel: existingDisplayName }),
  } satisfies CandidateRecordPayload;
  const nextReview = mergeReviewValuesWithPayload(
    input.review ?? candidate.reviewValues,
    nextPayload,
    {
      overwriteFields: role === "source" ? ["source"] : ["target"],
    },
  );

  await database.runAsync(
    `UPDATE candidate_records
     SET payload_json = ?,
         review_json = ?,
         state = ?,
         updated_at = ?
     WHERE candidate_id = ?;`,
    JSON.stringify(nextPayload),
    JSON.stringify(nextReview),
    "validated",
    input.updatedAt,
    candidate.candidateId,
  );
  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE write_proposal_id = ?;`,
    "executed",
    input.updatedAt,
    input.proposal.writeProposalId,
  );

  const siblingCreateProposal = await findSiblingCounterpartyCreateProposal(database, {
    plannerRunId: input.proposal.plannerRunId,
    role,
  });

  if (siblingCreateProposal && siblingCreateProposal.state !== "executed") {
    await database.runAsync(
      `UPDATE workflow_write_proposals
       SET state = ?,
           updated_at = ?
       WHERE write_proposal_id = ?;`,
      "rejected",
      input.updatedAt,
      siblingCreateProposal.writeProposalId,
    );
    await removeProposalDependency(database, siblingCreateProposal.writeProposalId, input.updatedAt);
  }

  await releaseResolvedDecisionDependencies(database, input.updatedAt);
  await appendWorkflowAuditEvent(database, {
    batchId: input.proposal.batchId,
    candidateId: input.proposal.candidateId,
    createdAt: input.updatedAt,
    eventType: "counterparty_merged",
    message: `${existingDisplayName} kept as the local counterparty after approval by ${input.actor}.`,
    plannerRunId: input.proposal.plannerRunId,
    writeProposalId: input.proposal.writeProposalId,
  });
  await updateUploadBatchState(database, {
    batchId: input.proposal.batchId,
    state: "review_required",
    updatedAt: input.updatedAt,
  });
}

async function executeResolveDuplicateReceiptProposal(
  database: WritableStorageDatabase,
  input: {
    actor: string;
    evidenceId: string;
    options?: ProposalApprovalOptions;
    proposal: NonNullable<Awaited<ReturnType<typeof loadProposalById>>>;
    review?: LedgerReviewValues;
    updatedAt: string;
  },
): Promise<void> {
  const keepMode =
    input.options?.duplicateResolution?.keepMode === "keep_new"
      ? "keep_new"
      : "keep_existing";
  const conflictEvidenceId = normalizeText(
    asString(input.proposal.payload.conflictEvidenceId ?? input.proposal.payload.duplicateEvidenceId),
  );
  const matchedRecordIds = conflictEvidenceId
    ? (await database.getAllAsync<{ recordId: string }>(
        `SELECT record_id AS recordId
         FROM record_evidence_links
         WHERE evidence_id = ?
         ORDER BY record_id ASC;`,
        conflictEvidenceId,
      )).map((row) => row.recordId)
    : asStringArrayValue(input.proposal.payload.matchedRecordIds);

  if (!matchedRecordIds.length || !input.proposal.candidateId) {
    throw new Error("Duplicate receipt proposal is missing matched record references.");
  }

  if (keepMode === "keep_new") {
    const candidate = await loadCandidateById(database, input.proposal.candidateId);

    if (!candidate) {
      throw new Error("Candidate row no longer exists.");
    }

    const review = normalizeReviewValues(input.review ?? candidate.reviewValues);
    const amountCents = Math.round(Number.parseFloat(review.amountValue) * 100);
    const nextPayload: CandidateRecordPayload = {
      ...candidate.payload,
      amountCents,
      date: review.date,
      description: review.description,
      sourceLabel: review.source,
      targetLabel: review.target,
      taxCategoryCode: review.taxCategory || null,
    };
    const retainedEvidenceIds = dedupeStrings([
      input.evidenceId,
      ...(await loadEvidenceIdsForRecords(database, matchedRecordIds)),
    ]);
    const resolvedEntry = resolveStandardReceiptEntry(
      {
        amountCents,
        currency: "USD",
        description: review.description,
        entityId: defaultEntityId,
        evidenceIds: retainedEvidenceIds,
        memo: review.notes || null,
        occurredOn: review.date,
        source: review.source,
        target: review.target,
        userClassification:
          review.category === "income"
            ? "income"
            : review.category === "non_business_income"
              ? "non_business_income"
            : review.category === "spending"
              ? "personal_spending"
              : "expense",
      },
      {
        createdAt: input.updatedAt,
        recordId: candidate.recordId ?? `record-${input.evidenceId}`,
        sourceCounterpartyId: nextPayload.sourceCounterpartyId ?? null,
        sourceSystem: "ledger-upload-workflow",
        targetCounterpartyId: nextPayload.targetCounterpartyId ?? null,
        updatedAt: input.updatedAt,
      },
    );

    await deleteMatchedRecords(database, matchedRecordIds);
    await persistResolvedStandardReceiptEntry(database, resolvedEntry);
    await database.runAsync(
      `UPDATE candidate_records
       SET payload_json = ?,
           review_json = ?,
           record_id = ?,
           state = ?,
           updated_at = ?
       WHERE candidate_id = ?;`,
      JSON.stringify(nextPayload),
      JSON.stringify({
        amount: review.amountValue,
        category: review.category,
        date: review.date,
        description: review.description,
        notes: review.notes,
        source: review.source,
        target: review.target,
        taxCategory: review.taxCategory,
      }),
      resolvedEntry.record.recordId,
      "persisted_final",
      input.updatedAt,
      candidate.candidateId,
    );
    await database.runAsync(
      `UPDATE workflow_write_proposals
       SET state = ?,
           updated_at = ?
       WHERE write_proposal_id = ?;`,
      "executed",
      input.updatedAt,
      input.proposal.writeProposalId,
    );
    await database.runAsync(
      `UPDATE workflow_write_proposals
       SET state = ?,
           updated_at = ?
       WHERE planner_run_id = ?
         AND write_proposal_id != ?
         AND state IN ('pending_approval', 'blocked');`,
      "rejected",
      input.updatedAt,
      input.proposal.plannerRunId,
      input.proposal.writeProposalId,
    );

    const extractedData = buildConfirmedExtractedData(review, candidate.extractedData, null);
    await database.runAsync(
      `UPDATE evidences
       SET parse_status = 'parsed',
           extracted_data = ?,
           captured_date = ?,
           captured_amount_cents = ?,
           captured_source = ?,
           captured_target = ?,
           captured_description = ?
       WHERE evidence_id = ?;`,
      JSON.stringify(extractedData),
      review.date,
      amountCents,
      review.source,
      review.target,
      review.description,
      input.evidenceId,
    );
    await updateUploadBatchState(database, {
      batchId: input.proposal.batchId,
      duplicateKind: "near_duplicate",
      duplicateOfEvidenceId:
        asString(
          input.proposal.payload.conflictEvidenceId ??
            input.proposal.payload.duplicateEvidenceId,
        ) || conflictEvidenceId,
      state: "approved",
      updatedAt: input.updatedAt,
    });
    await appendWorkflowAuditEvent(database, {
      batchId: input.proposal.batchId,
      candidateId: input.proposal.candidateId,
      createdAt: input.updatedAt,
      eventType: "duplicate_receipt_merged",
      message: `Duplicate receipt merge kept the new record and replaced ${matchedRecordIds.length} older record${matchedRecordIds.length === 1 ? "" : "s"} after approval by ${input.actor}.`,
      plannerRunId: input.proposal.plannerRunId,
      writeProposalId: input.proposal.writeProposalId,
    });
    return;
  }

  for (const recordId of matchedRecordIds) {
    await database.runAsync(
      `INSERT OR IGNORE INTO record_evidence_links (
        record_id,
        evidence_id,
        link_role,
        is_primary,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
      recordId,
      input.evidenceId,
      "supporting",
      0,
      input.updatedAt,
    );
  }

  await database.runAsync(
    `UPDATE candidate_records
     SET state = ?,
         updated_at = ?
     WHERE candidate_id = ?;`,
    "approved",
    input.updatedAt,
    input.proposal.candidateId,
  );
  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE write_proposal_id = ?;`,
    "executed",
    input.updatedAt,
    input.proposal.writeProposalId,
  );
  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE planner_run_id = ?
       AND write_proposal_id != ?
       AND state IN ('pending_approval', 'blocked');`,
    "rejected",
    input.updatedAt,
    input.proposal.plannerRunId,
    input.proposal.writeProposalId,
  );
  await database.runAsync(
    `UPDATE evidences
     SET parse_status = 'parsed'
     WHERE evidence_id = ?;`,
    input.evidenceId,
  );
  await updateUploadBatchState(database, {
    batchId: input.proposal.batchId,
    duplicateKind: "near_duplicate",
    duplicateOfEvidenceId: asString(input.proposal.payload.conflictEvidenceId ?? input.proposal.payload.duplicateEvidenceId),
    state: "approved",
    updatedAt: input.updatedAt,
  });
  await appendWorkflowAuditEvent(database, {
    batchId: input.proposal.batchId,
    candidateId: input.proposal.candidateId,
    createdAt: input.updatedAt,
    eventType: "duplicate_receipt_merged",
    message: `Duplicate receipt merge approved by ${input.actor}; duplicate final writes were suppressed.`,
    plannerRunId: input.proposal.plannerRunId,
    writeProposalId: input.proposal.writeProposalId,
  });
}

async function executePersistCandidateProposal(
  database: WritableStorageDatabase,
  input: {
    actor: string;
    evidenceId: string;
    proposal: NonNullable<Awaited<ReturnType<typeof loadProposalById>>>;
    review?: LedgerReviewValues;
    updatedAt: string;
  },
): Promise<void> {
  if (!input.proposal.candidateId) {
    throw new Error("Persistence proposal is missing a candidate.");
  }

  const candidate = await loadCandidateById(database, input.proposal.candidateId);

  if (!candidate) {
    throw new Error("Candidate row no longer exists.");
  }

  const review = normalizeReviewValues(input.review ?? candidate.reviewValues);
  const amountCents = Math.round(Number.parseFloat(review.amountValue) * 100);
  const nextPayload: CandidateRecordPayload = {
    ...candidate.payload,
    amountCents,
    date: review.date,
    description: review.description,
    sourceLabel: review.source,
    targetLabel: review.target,
    taxCategoryCode: review.taxCategory || null,
  };
  const resolvedEntry = resolveStandardReceiptEntry(
    {
      amountCents,
      currency: "USD",
      description: review.description,
      entityId: defaultEntityId,
      evidenceIds: [input.evidenceId],
      memo: review.notes || null,
      occurredOn: review.date,
      source: review.source,
      target: review.target,
      userClassification:
        review.category === "income"
          ? "income"
          : review.category === "non_business_income"
            ? "non_business_income"
          : review.category === "spending"
            ? "personal_spending"
            : "expense",
    },
    {
      createdAt: input.updatedAt,
      recordId: candidate.recordId ?? `record-${input.evidenceId}`,
      sourceCounterpartyId: nextPayload.sourceCounterpartyId ?? null,
      sourceSystem: "ledger-upload-workflow",
      targetCounterpartyId: nextPayload.targetCounterpartyId ?? null,
      updatedAt: input.updatedAt,
    },
  );

  await persistResolvedStandardReceiptEntry(database, resolvedEntry);
  await database.runAsync(
    `UPDATE candidate_records
     SET payload_json = ?,
         review_json = ?,
         record_id = ?,
         state = ?,
         updated_at = ?
     WHERE candidate_id = ?;`,
    JSON.stringify(nextPayload),
    JSON.stringify({
      amount: review.amountValue,
      category: review.category,
      date: review.date,
      description: review.description,
      notes: review.notes,
      source: review.source,
      target: review.target,
      taxCategory: review.taxCategory,
    }),
    resolvedEntry.record.recordId,
    "persisted_final",
    input.updatedAt,
    candidate.candidateId,
  );
  await database.runAsync(
    `UPDATE workflow_write_proposals
     SET state = ?,
         updated_at = ?
     WHERE write_proposal_id = ?;`,
    "executed",
    input.updatedAt,
    input.proposal.writeProposalId,
  );

  const extractedData = buildConfirmedExtractedData(review, candidate.extractedData, null);
  await database.runAsync(
    `UPDATE evidences
     SET parse_status = 'parsed',
         extracted_data = ?,
         captured_date = ?,
         captured_amount_cents = ?,
         captured_source = ?,
         captured_target = ?,
         captured_description = ?
     WHERE evidence_id = ?;`,
    JSON.stringify(extractedData),
    review.date,
    amountCents,
    review.source,
    review.target,
    review.description,
    input.evidenceId,
  );
  await updateUploadBatchState(database, {
    batchId: input.proposal.batchId,
    state: "approved",
    updatedAt: input.updatedAt,
  });
  await appendWorkflowAuditEvent(database, {
    batchId: input.proposal.batchId,
    candidateId: input.proposal.candidateId,
    createdAt: input.updatedAt,
    eventType: "candidate_persisted",
    message: `${resolvedEntry.record.recordId} persisted after approval by ${input.actor}.`,
    plannerRunId: input.proposal.plannerRunId,
    writeProposalId: input.proposal.writeProposalId,
  });
}

async function loadEvidenceIdsForRecords(
  database: ReadableStorageDatabase,
  recordIds: string[],
): Promise<string[]> {
  if (!recordIds.length) {
    return [];
  }

  const placeholders = recordIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<{ evidenceId: string }>(
    `SELECT DISTINCT evidence_id AS evidenceId
     FROM record_evidence_links
     WHERE record_id IN (${placeholders})
     ORDER BY evidence_id ASC;`,
    ...recordIds,
  );

  return rows.map((row) => row.evidenceId);
}

async function deleteMatchedRecords(
  database: WritableStorageDatabase,
  recordIds: string[],
): Promise<void> {
  if (!recordIds.length) {
    return;
  }

  const placeholders = recordIds.map(() => "?").join(", ");

  await database.runAsync(
    `DELETE FROM record_evidence_links
     WHERE record_id IN (${placeholders});`,
    ...recordIds,
  );
  await database.runAsync(
    `DELETE FROM record_entry_classifications
     WHERE record_id IN (${placeholders});`,
    ...recordIds,
  );
  await database.runAsync(
    `DELETE FROM records
     WHERE record_id IN (${placeholders});`,
    ...recordIds,
  );
}

async function loadCandidateById(
  database: ReadableStorageDatabase,
  candidateId: string,
): Promise<(WorkflowCandidateRecord & { extractedData: EvidenceExtractedData | null }) | null> {
  const row = await database.getFirstAsync<{
    candidateId: string;
    evidenceId: string;
    extractedData: string | null;
    payloadJson: string;
    recordId: string | null;
    reviewJson: string | null;
    state: CandidateRecordState;
  }>(
    `SELECT
      candidate_records.candidate_id AS candidateId,
      candidate_records.evidence_id AS evidenceId,
      candidate_records.payload_json AS payloadJson,
      candidate_records.review_json AS reviewJson,
      candidate_records.record_id AS recordId,
      candidate_records.state AS state,
      evidences.extracted_data AS extractedData
    FROM candidate_records
    LEFT JOIN evidences
      ON evidences.evidence_id = candidate_records.evidence_id
    WHERE candidate_records.candidate_id = ?;`,
    candidateId,
  );

  if (!row) {
    return null;
  }

  const payload = JSON.parse(row.payloadJson) as CandidateRecordPayload;

  return {
    candidateId: row.candidateId,
    createdAt: "",
    errorMessage: null,
    extractedData: row.extractedData ? (JSON.parse(row.extractedData) as EvidenceExtractedData) : null,
    payload,
    recordId: row.recordId,
    reviewValues: row.reviewJson
      ? (JSON.parse(row.reviewJson) as LedgerReviewValues)
      : buildReviewValuesFromPayload(payload),
    state: row.state,
    updatedAt: "",
  };
}

async function loadLatestCandidateForEvidence(
  database: ReadableStorageDatabase,
  evidenceId: string,
): Promise<WorkflowCandidateRecord | null> {
  const rows = await database.getAllAsync<{
    candidateId: string;
    createdAt: string;
    errorMessage: string | null;
    payloadJson: string;
    recordId: string | null;
    reviewJson: string | null;
    state: CandidateRecordState;
    updatedAt: string;
  }>(
    `SELECT
      candidate_id AS candidateId,
      state,
      payload_json AS payloadJson,
      review_json AS reviewJson,
      record_id AS recordId,
      error_message AS errorMessage,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM candidate_records
    WHERE evidence_id = ?
    ORDER BY created_at DESC
    LIMIT 1;`,
    evidenceId,
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const payload = JSON.parse(row.payloadJson) as CandidateRecordPayload;

  return {
    candidateId: row.candidateId,
    createdAt: row.createdAt,
    errorMessage: row.errorMessage,
    payload,
    recordId: row.recordId,
    reviewValues: row.reviewJson
      ? (JSON.parse(row.reviewJson) as LedgerReviewValues)
      : buildReviewValuesFromPayload(payload),
    state: row.state,
    updatedAt: row.updatedAt,
  };
}

async function findSiblingCounterpartyCreateProposal(
  database: ReadableStorageDatabase,
  input: {
    plannerRunId: string;
    role: "source" | "target";
  },
): Promise<{ state: WorkflowWriteProposalState; writeProposalId: string } | null> {
  const rows = await database.getAllAsync<{
    payloadJson: string;
    state: WorkflowWriteProposalState;
    writeProposalId: string;
  }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      state,
      payload_json AS payloadJson
    FROM workflow_write_proposals
    WHERE planner_run_id = ?
      AND proposal_type = 'create_counterparty'
    ORDER BY created_at ASC;`,
    input.plannerRunId,
  );

  return rows.find((row) => normalizeText(asString((JSON.parse(row.payloadJson) as Record<string, JsonValue>).role)) === input.role) ?? null;
}

async function unblockDependentProposals(
  database: WritableStorageDatabase,
  dependencyProposalId: string,
  updatedAt: string,
): Promise<void> {
  const rows = await database.getAllAsync<{ dependencyIds: string | null; writeProposalId: string }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      dependency_ids AS dependencyIds
    FROM workflow_write_proposals
    WHERE dependency_ids IS NOT NULL;`,
  );

  for (const row of rows) {
    const dependencyIds = row.dependencyIds ? (JSON.parse(row.dependencyIds) as string[]) : [];

    if (!dependencyIds.includes(dependencyProposalId)) {
      continue;
    }

    const remainingStates = await database.getAllAsync<{ state: WorkflowWriteProposalState }>(
      `SELECT state
       FROM workflow_write_proposals
       WHERE write_proposal_id IN (${dependencyIds.map(() => "?").join(", ")});`,
      ...dependencyIds,
    );

    if (remainingStates.every((state) => state.state === "executed")) {
      await database.runAsync(
        `UPDATE workflow_write_proposals
         SET state = ?,
             updated_at = ?
         WHERE write_proposal_id = ?;`,
        "pending_approval",
        updatedAt,
        row.writeProposalId,
      );
    }
  }
}

async function releaseResolvedDecisionDependencies(
  database: WritableStorageDatabase,
  updatedAt: string,
): Promise<void> {
  const rows = await database.getAllAsync<{ dependencyIds: string | null; writeProposalId: string }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      dependency_ids AS dependencyIds
    FROM workflow_write_proposals
    WHERE dependency_ids IS NOT NULL
      AND state = 'blocked';`,
  );

  for (const row of rows) {
    const dependencyIds = row.dependencyIds ? (JSON.parse(row.dependencyIds) as string[]) : [];

    if (!dependencyIds.length) {
      continue;
    }

    const dependencyStates = await database.getAllAsync<{
      proposalType: WorkflowWriteProposalItem["proposalType"];
      state: WorkflowWriteProposalState;
    }>(
      `SELECT
        proposal_type AS proposalType,
        state
       FROM workflow_write_proposals
       WHERE write_proposal_id IN (${dependencyIds.map(() => "?").join(", ")});`,
      ...dependencyIds,
    );

    const allDependenciesResolved = dependencyStates.every((dependency) =>
      dependency.state === "executed" || dependency.state === "rejected",
    );
    const rejectedCreateDependency = dependencyStates.some((dependency) =>
      dependency.proposalType === "create_counterparty" && dependency.state === "rejected",
    );

    if (allDependenciesResolved && !rejectedCreateDependency) {
      await database.runAsync(
        `UPDATE workflow_write_proposals
         SET state = ?,
             updated_at = ?
         WHERE write_proposal_id = ?;`,
        "pending_approval",
        updatedAt,
        row.writeProposalId,
      );
    }
  }
}

async function removeProposalDependency(
  database: WritableStorageDatabase,
  dependencyProposalId: string,
  updatedAt: string,
): Promise<void> {
  const rows = await database.getAllAsync<{ dependencyIds: string | null; writeProposalId: string }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      dependency_ids AS dependencyIds
    FROM workflow_write_proposals
    WHERE dependency_ids IS NOT NULL;`,
  );

  for (const row of rows) {
    const dependencyIds = row.dependencyIds ? (JSON.parse(row.dependencyIds) as string[]) : [];

    if (!dependencyIds.includes(dependencyProposalId)) {
      continue;
    }

    const nextDependencyIds = dependencyIds.filter((dependencyId) => dependencyId !== dependencyProposalId);

    await database.runAsync(
      `UPDATE workflow_write_proposals
       SET dependency_ids = ?,
           updated_at = ?
       WHERE write_proposal_id = ?;`,
      nextDependencyIds.length ? JSON.stringify(nextDependencyIds) : null,
      updatedAt,
      row.writeProposalId,
    );
  }
}

async function blockDependentProposals(
  database: WritableStorageDatabase,
  dependencyProposalId: string,
  updatedAt: string,
): Promise<void> {
  const rows = await database.getAllAsync<{ dependencyIds: string | null; writeProposalId: string }>(
    `SELECT
      write_proposal_id AS writeProposalId,
      dependency_ids AS dependencyIds
    FROM workflow_write_proposals
    WHERE dependency_ids IS NOT NULL;`,
  );

  for (const row of rows) {
    const dependencyIds = row.dependencyIds ? (JSON.parse(row.dependencyIds) as string[]) : [];

    if (!dependencyIds.includes(dependencyProposalId)) {
      continue;
    }

    await database.runAsync(
      `UPDATE workflow_write_proposals
       SET state = ?,
           updated_at = ?
       WHERE write_proposal_id = ?;`,
      "blocked",
      updatedAt,
      row.writeProposalId,
    );
  }
}

function determineInitialProposalState(input: {
  candidateState: CandidateRecordState;
  dependencyCount: number;
  proposalType: WorkflowWriteProposalItem["proposalType"];
}): WorkflowWriteProposalState {
  if (
    input.proposalType === "persist_candidate_record" &&
    input.candidateState !== "validated" &&
    input.candidateState !== "needs_review"
  ) {
    return "blocked";
  }

  if (input.dependencyCount > 0) {
    return "blocked";
  }

  return "pending_approval";
}

function determineBatchState(summary: PlannerSummary, candidateState: CandidateRecordState): UploadBatchState {
  if (!summary.writeProposals.length && !summary.candidateRecords.length) {
    return "no_match";
  }

  if (candidateState === "duplicate" || candidateState === "needs_review") {
    return "review_required";
  }

  if (summary.writeProposals.length) {
    return "write_proposal_ready";
  }

  return "candidates_generated";
}

function buildProposalRationale(proposal: PlannerSummary["writeProposals"][number]): string {
  if (proposal.proposalType === "create_counterparty") {
    return "Parsed label does not match an existing local counterparty, so creation requires approval.";
  }

  if (proposal.proposalType === "merge_counterparty") {
    return "A likely existing local counterparty was found, so the operator must decide whether to merge it or keep a new counterparty.";
  }

  if (proposal.proposalType === "persist_candidate_record") {
    return "Candidate record is ready for final persistence after approval and local validation.";
  }

  if (proposal.proposalType === "resolve_duplicate_receipt") {
    return "A likely duplicate receipt was found, so the operator must decide whether to merge the evidence or keep the uploads separate.";
  }

  return "Workflow update requires approval.";
}

function buildConfirmedExtractedData(
  review: ReturnType<typeof normalizeReviewValues>,
  existingExtractedData: EvidenceExtractedData | null,
  failureReason: string | null,
): EvidenceExtractedData {
  const fields = {
    amountCents: Math.round(Number.parseFloat(review.amountValue) * 100),
    category: review.category,
    date: review.date,
    description: review.description,
    notes: review.notes || null,
    source: review.source,
    target: review.target,
    taxCategory: review.taxCategory || null,
  };

  return {
    candidates: fields,
    failureReason,
    fields,
    model: existingExtractedData?.model ?? null,
    originData: existingExtractedData?.originData ?? null,
    parser: existingExtractedData?.parser ?? "rule_fallback",
    rawLines: existingExtractedData?.rawLines ?? [],
    rawSummary: existingExtractedData?.rawSummary ?? "Confirmed after local review.",
    rawText: existingExtractedData?.rawText ?? "",
    scheme: existingExtractedData?.scheme,
    sourceLabel: existingExtractedData?.sourceLabel ?? "confirmed_review",
    warnings: existingExtractedData?.warnings ?? [],
  };
}

function normalizeReviewValues(review: LedgerReviewValues) {
  const amountValue = review.amount.trim().replace(/[^0-9.]+/g, "");
  const base = {
    ...createEmptyReviewValues(),
    ...review,
    amountValue,
    category: review.category,
    date: review.date.trim(),
    description: review.description.trim(),
    failureReason: review.notes.includes("parse failed") ? review.notes : null,
    notes: review.notes.trim(),
    source: review.source.trim(),
    target: review.target.trim(),
    taxCategory: review.taxCategory.trim(),
  };

  if (!base.date || !base.description || !base.amountValue) {
    throw new Error("date, amount, and description are required.");
  }

  return base;
}

function asString(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asStringArrayValue(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreTextSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.8;
  }

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  return union > 0 ? intersection / union : 0;
}

function scoreDuplicateReceiptRow(
  row: {
    amountCents: number;
    date: string;
    description: string;
    sourceLabel: string;
    targetLabel: string;
  },
  input: {
    amountCents: number | null;
    date: string | null;
    description: string | null;
    sourceLabel: string | null;
    targetLabel: string | null;
  },
): number {
  let score = 0;

  if (input.amountCents != null && row.amountCents === input.amountCents) {
    score += 4;
  }

  if (input.date && row.date === input.date) {
    score += 3;
  }

  if (scoreTextSimilarity(normalizeComparableText(row.description), normalizeComparableText(input.description)) >= 0.75) {
    score += 2;
  }

  if (scoreTextSimilarity(normalizeComparableText(row.sourceLabel), normalizeComparableText(input.sourceLabel)) >= 0.6) {
    score += 1;
  }

  if (scoreTextSimilarity(normalizeComparableText(row.targetLabel), normalizeComparableText(input.targetLabel)) >= 0.6) {
    score += 1;
  }

  return score;
}

function resolveStoredProposalDependencies(
  insertedProposals: Array<{
    proposal: PlannerSummary["writeProposals"][number];
    writeProposalId: string;
  }>,
  proposal: PlannerSummary["writeProposals"][number],
): string[] {
  if (proposal.proposalType === "create_counterparty") {
    const role = proposal.role ?? normalizeText(asString(proposal.values.role));

    return insertedProposals
      .filter((item) =>
        item.proposal.proposalType === "merge_counterparty" &&
        (item.proposal.role ?? normalizeText(asString(item.proposal.values.role))) === role,
      )
      .map((item) => item.writeProposalId);
  }

  if (proposal.proposalType === "persist_candidate_record") {
    return insertedProposals
      .filter((item) =>
        item.proposal.proposalType === "create_counterparty" ||
        item.proposal.proposalType === "merge_counterparty" ||
        item.proposal.proposalType === "resolve_duplicate_receipt",
      )
      .map((item) => item.writeProposalId);
  }

  return [];
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
