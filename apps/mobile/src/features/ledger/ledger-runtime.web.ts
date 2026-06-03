import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import {
  type JsonValue,
  normalizeReceiptParsePayload,
  type PlannerSummary,
  type ReceiptParsePayload,
} from "@ledgerly/schemas";
import {
  createReadableStorageDatabase,
  createWritableStorageDatabase,
  buildEvidenceUploadPath,
  resolveStandardReceiptEntry,
  persistResolvedStandardReceiptEntry,
} from "@ledgerly/storage";
import type { ResolvedLocale } from "../app-shell/types";

import {
  parseFileWithOpenAiFromBlob,
  planEvidenceDbUpdates,
  type ProviderRuntimeConfig,
  type ParseResult,
} from "./remote-parse";
import {
  buildRecordSchemeTemplate,
  buildRemoteExtractedData,
  buildStoredUploadFileName,
  defaultEntityId,
  type EvidenceQueueItem,
  type ImportedEvidenceBundle,
  type ImportedEvidenceFile,
  type LedgerReviewValues,
  type ProposalApprovalOptions,
  type WorkflowCandidateRecord,
  type WorkflowWriteProposalItem,
} from "./ledger-domain";
import {
  buildPlannerSummary,
  buildReviewValuesFromPayload,
  deriveCandidateState,
  mergeReviewValuesWithPayload,
  shouldDefaultReviewDateToCurrentDate,
  type PlannerReadResults,
} from "./workflow-planner";
import type { HomeSnapshot, JournalListSnapshot } from "../home/home-data";
import type { GeneralLedgerEntry } from "./ledger-reporting";
import { loadHomeSnapshot, loadJournalListSnapshot } from "../home/home-data";
import { getActiveWebDatabase, openWebSqliteDatabase } from "../../storage/web-sqlite";
import { initializeLocalDatabase } from "../../storage/database";
import {
  computeSha256Hex,
  deleteVaultFile,
  readVaultFile,
  writeVaultFile,
} from "../../storage/web-file-vault";
import {
  approveWorkflowWriteProposal,
  buildFailedBatchClearPlan,
  clearFailedBatchRecords,
  createExtractionRun,
  createPlannerRun,
  createUploadBatch,
  ensureDefaultEntity,
  finalizeEvidenceReview,
  findDuplicateEvidenceForFingerprint,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  loadEvidenceQueue,
  reconcileInactiveReviewBatch,
  rejectWorkflowWriteProposal,
  savePlannerArtifacts,
  updateEvidenceExtraction,
  updateExtractionRun,
  updatePlannerRun,
  updateUploadBatchState,
} from "./ledger-store";

interface UploadCandidate {
  evidenceGroupKey: string;
  isPrimary: boolean;
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
  uri: string;
}

export interface PlannerResult {
  batchId: string;
  batchState: string;
  candidateRecords: WorkflowCandidateRecord[];
  error: string | null;
  evidenceId: string;
  fileName: string;
  rawJson: JsonValue | null;
  rawText: string;
  plannerSummary: PlannerSummary | null;
  reviewValues: LedgerReviewValues;
  writeProposals: WorkflowWriteProposalItem[];
}

const plannerStateStore = new Map<string, PlannerResult>();
const staleBackgroundThresholdMs = 15_000;

function createWebWritableDatabase(
  database: Awaited<ReturnType<typeof openWebSqliteDatabase>>,
) {
  return createWritableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      database.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      database.getFirstAsync<Row>(source, ...(params as [])),
    runAsync: (source: string, ...params: unknown[]) =>
      database.runAsync(source, ...(params as [])),
  });
}

export async function pickDocumentUploadCandidates(): Promise<
  UploadCandidate[]
> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
    type: ["application/pdf", "image/*"],
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset, index) => ({
    evidenceGroupKey: asset.name || `${asset.uri}-${index}`,
    isPrimary: true,
    kind: inferUploadKind(asset.mimeType ?? null, asset.name ?? ""),
    mimeType: asset.mimeType ?? null,
    originalFileName: asset.name ?? `document-${index + 1}`,
    sizeBytes: asset.size ?? null,
    uri: asset.uri,
  }));
}

export async function pickPhotoUploadCandidates(
  locale?: ResolvedLocale,
): Promise<UploadCandidate[]> {
  void locale;

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: true,
    mediaTypes: ["images"] as never,
    quality: 1,
    selectionLimit: 0,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset, index) => ({
    evidenceGroupKey:
      asset.assetId || asset.fileName || `${asset.uri}-${index}`,
    isPrimary: true,
    kind: "image",
    mimeType: asset.mimeType ?? null,
    originalFileName: asset.fileName ?? `photo-${index + 1}.jpg`,
    sizeBytes: asset.fileSize ?? null,
    uri: asset.uri,
  }));
}

export async function takeCameraPhoto(
  locale?: ResolvedLocale,
): Promise<UploadCandidate[]> {
  void locale;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    mediaTypes: ["images"] as never,
    quality: 1,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset, index) => ({
    evidenceGroupKey:
      asset.assetId || asset.fileName || `${asset.uri}-${index}`,
    isPrimary: true,
    kind: "image" as const,
    mimeType: asset.mimeType ?? "image/jpeg",
    originalFileName: asset.fileName ?? `camera-${Date.now()}.jpg`,
    sizeBytes: asset.fileSize ?? null,
    uri: asset.uri,
  }));
}

export async function parseFile(
  fileUri: string,
  fileName: string,
  mimeType: string | null,
  providerConfig?: Partial<ProviderRuntimeConfig>,
): Promise<ParseResult> {
  let response: Response;

  try {
    response = await fetch(fileUri);
  } catch {
    return {
      rawJson: null,
      rawText: "",
      model: "",
      error: `Unable to read selected file: network error`,
      parserKind: "openai_gpt",
    };
  }

  if (!response.ok) {
    return {
      rawJson: null,
      rawText: "",
      model: "",
      error: `Unable to read selected file: ${response.status}`,
      parserKind: "openai_gpt",
    };
  }

  const blob = await response.blob();

  // Store file in IndexedDB vault for later reference
  try {
    const buffer = await blob.arrayBuffer();
    const vaultPath = `uploads/${Date.now()}-${fileName}`;
    await writeVaultFile(vaultPath, new Uint8Array(buffer));
  } catch {
    // Non-critical: parsing can proceed even if vault write fails
  }

  return parseFileWithOpenAiFromBlob({ fileName, blob, mimeType }, providerConfig);
}

export async function enqueueUploadCandidates(
  candidates: UploadCandidate[],
): Promise<Array<{ batchId: string; evidenceId: string }>> {
  if (!candidates.length) {
    return [];
  }

  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const capturedAt = new Date().toISOString();
  const queueEntries: Array<{ batchId: string; evidenceId: string }> = [];

  await ensureDefaultEntity(writableDb, capturedAt);

  for (const candidate of candidates) {
    let response: Response;

    try {
      response = await fetch(candidate.uri);
    } catch (error) {
      console.error("[DEBUG-upload-fetch-uri]", {
        message: error instanceof Error ? error.message : String(error),
        mimeType: candidate.mimeType,
        originalFileName: candidate.originalFileName,
        uri: candidate.uri,
      });
      throw error;
    }
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const sha256Hex = await computeSha256Hex(bytes);
    const storedName = buildStoredUploadFileName(
      defaultEntityId,
      capturedAt,
      sha256Hex,
      candidate.originalFileName,
    );
    const relativePath = buildEvidenceUploadPath(
      defaultEntityId,
      capturedAt,
      storedName,
    );
    await writeVaultFile(relativePath, bytes);

    const evidenceId = `evidence-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const batchId = `batch-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const bundle: ImportedEvidenceBundle = {
      batchId,
      capturedAt,
      entityId: defaultEntityId,
      evidenceId,
      evidenceKind:
        candidate.mimeType?.startsWith("image/") ? "receipt_photo" : "receipt_document",
      filePath: relativePath,
      files: [
        {
          capturedAt,
          evidenceFileId: `evidence-file-web-${Math.random().toString(36).slice(2, 8)}`,
          isPrimary: true,
          mimeType: candidate.mimeType,
          originalFileName: candidate.originalFileName,
          relativePath,
          sha256Hex,
          sizeBytes: candidate.sizeBytes,
          vaultCollection: "evidence-objects",
        } satisfies ImportedEvidenceFile,
      ],
      sourceSystem: "ledger-upload-intake",
    };

    let duplicateEvidenceId: string | null = null;

    for (const file of bundle.files) {
      duplicateEvidenceId = await findDuplicateEvidenceForFingerprint(
        writableDb,
        {
          evidenceId,
          sha256Hex: file.sha256Hex,
          sizeBytes: file.sizeBytes,
        },
      );

      if (duplicateEvidenceId) {
        break;
      }
    }

    await insertImportedEvidenceBundle(writableDb, bundle);
    await createUploadBatch(writableDb, {
      batchId,
      createdAt: capturedAt,
      evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "uploaded",
    });
    await updateUploadBatchState(writableDb, {
      batchId,
      duplicateKind: duplicateEvidenceId ? "file_duplicate" : null,
      duplicateOfEvidenceId: duplicateEvidenceId,
      errorMessage: null,
      state: duplicateEvidenceId ? "duplicate_file" : "uploaded",
      updatedAt: capturedAt,
    });
    queueEntries.push({ batchId, evidenceId });
  }

  return queueEntries;
}

export async function loadParseQueue(): Promise<EvidenceQueueItem[]> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const queue = await loadEvidenceQueue(writableDb);
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);

  for (const item of queue) {
    if (item.displayState === "ready_for_review") {
      await reconcileInactiveReviewBatch(writableDb, {
        batchId: item.batchId,
        updatedAt: now,
      });
      continue;
    }

    if (
      item.displayState === "processing" ||
      item.displayState === "recovering" ||
      item.batchState === "parsing" ||
      item.batchState === "planning"
    ) {
      const itemRow = await writableDb.getFirstAsync<{
        batchUpdatedAt: string | null;
        extractionUpdatedAt: string | null;
        plannerUpdatedAt: string | null;
      }>(
        `SELECT
           upload_batches.updated_at AS batchUpdatedAt,
           extraction_runs.updated_at AS extractionUpdatedAt,
           planner_runs.updated_at AS plannerUpdatedAt
         FROM upload_batches
         LEFT JOIN extraction_runs
           ON extraction_runs.extraction_run_id = ?
         LEFT JOIN planner_runs
           ON planner_runs.planner_run_id = ?
         WHERE upload_batches.batch_id = ?;`,
        item.extractionRunId,
        item.plannerRunId,
        item.batchId,
      );
      const lastUpdatedMs = Math.max(
        Date.parse(itemRow?.batchUpdatedAt ?? "") || 0,
        Date.parse(itemRow?.extractionUpdatedAt ?? "") || 0,
        Date.parse(itemRow?.plannerUpdatedAt ?? "") || 0,
      );

      if (
        lastUpdatedMs > 0 &&
        nowMs - lastUpdatedMs < staleBackgroundThresholdMs
      ) {
        continue;
      }

      if (item.extractionRunId) {
        await updateExtractionRun(writableDb, {
          errorMessage:
            "This background task stopped responding and was moved back to retry.",
          extractionRunId: item.extractionRunId,
          state: "failed",
          updatedAt: now,
        });
      }
      if (item.plannerRunId) {
        await updatePlannerRun(writableDb, {
          errorMessage:
            "This background task stopped responding and was moved back to retry.",
          plannerRunId: item.plannerRunId,
          state: "failed",
          updatedAt: now,
        });
      }
      await updateUploadBatchState(writableDb, {
        batchId: item.batchId,
        duplicateKind: item.duplicateKind,
        errorMessage:
          "This background task stopped responding and was moved back to retry.",
        state: "failed",
        updatedAt: now,
      });
    }
  }

  return loadEvidenceQueue(writableDb);
}

export async function parseEvidence(
  evidenceId: string,
): Promise<EvidenceQueueItem | null> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const evidence = await loadEvidenceById(writableDb, evidenceId);

  if (!evidence) {
    return null;
  }

  if (
    evidence.batchState === "write_proposal_ready" ||
    evidence.batchState === "review_required" ||
    evidence.batchState === "partially_approved" ||
    evidence.batchState === "approved" ||
    evidence.batchState === "rejected"
  ) {
    return evidence;
  }
  const now = new Date().toISOString();

  if (
    evidence.batchState === "uploaded" ||
    evidence.batchState === "evidence_registered" ||
    evidence.batchState === "parsing" ||
    evidence.parseStatus === "pending"
  ) {
    const fileBytes = await readVaultFile(evidence.filePath);

    if (!fileBytes) {
      await updateUploadBatchState(writableDb, {
        batchId: evidence.batchId,
        duplicateKind: evidence.duplicateKind,
        errorMessage: "Queued file is missing from the local browser vault.",
        state: "failed",
        updatedAt: now,
      });

      return loadEvidenceById(writableDb, evidenceId);
    }

    const extractionRunId = `extraction-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await updateUploadBatchState(writableDb, {
      batchId: evidence.batchId,
      duplicateKind: evidence.duplicateKind,
      errorMessage: null,
      state: "parsing",
      updatedAt: now,
    });
    await createExtractionRun(writableDb, {
      batchId: evidence.batchId,
      createdAt: now,
      evidenceId: evidence.evidenceId,
      extractionRunId,
    });

    const parseResult = await parseFileWithOpenAiFromBlob(
      {
        blob: new Blob([fileBytes.slice().buffer], {
          type: evidence.mimeType ?? "application/octet-stream",
        }),
        fileName: evidence.originalFileName,
        mimeType: evidence.mimeType,
      },
    );

    if (parseResult.error || !parseResult.rawJson) {
      const message = parseResult.error ?? "Queued parsing failed.";
      await updateExtractionRun(writableDb, {
        errorMessage: message,
        extractionRunId,
        state: "failed",
        updatedAt: now,
      });
      await updateUploadBatchState(writableDb, {
        batchId: evidence.batchId,
        duplicateKind: evidence.duplicateKind,
        errorMessage: message,
        state: "failed",
        updatedAt: now,
      });

      return loadEvidenceById(writableDb, evidenceId);
    }

    const parsePayload = normalizeReceiptParsePayload(parseResult.rawJson as never, {
      defaultModel: parseResult.model || null,
      defaultParser:
        (parseResult.parserKind as "gemini" | "openai_gpt" | "rule_fallback" | undefined) ??
        "openai_gpt",
    });

    if (!parsePayload) {
      const message = "OpenAI response is not valid receipt parse JSON.";
      await updateExtractionRun(writableDb, {
        errorMessage: message,
        extractionRunId,
        state: "failed",
        updatedAt: now,
      });
      await updateUploadBatchState(writableDb, {
        batchId: evidence.batchId,
        duplicateKind: evidence.duplicateKind,
        errorMessage: message,
        state: "failed",
        updatedAt: now,
      });

      return loadEvidenceById(writableDb, evidenceId);
    }

    const extractedData = buildRemoteExtractedData({
      fileName: evidence.originalFileName,
      parsePayload,
      scheme: buildRecordSchemeTemplate(),
      sourceLabel:
        parseResult.parserKind === "gemini" ? "gemini_upload" : "openai_upload",
    });

    await updateEvidenceExtraction(writableDb, {
      evidenceId,
      extractedData,
      parseStatus: "parsed",
    });
    await updateExtractionRun(writableDb, {
      extractionRunId,
      model: extractedData.model ?? null,
      parsePayload: (extractedData.originData ?? null) as never,
      state: "complete",
      updatedAt: now,
    });
    await updateUploadBatchState(writableDb, {
      batchId: evidence.batchId,
      duplicateKind: evidence.duplicateKind,
      errorMessage: null,
      state: "parse_complete",
      updatedAt: now,
    });
  }

  const refreshedEvidence = await loadEvidenceById(writableDb, evidenceId);

  if (!refreshedEvidence) {
    return null;
  }

  const canPlan =
    refreshedEvidence.batchState === "parse_complete" ||
    refreshedEvidence.batchState === "planning";

  if (!canPlan || !refreshedEvidence.extractedData?.originData) {
    return refreshedEvidence;
  }

  const plannerRunId = `planner-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const latestExtractionRunId =
    refreshedEvidence.extractionRunId ??
    `extraction-web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await updateUploadBatchState(writableDb, {
    batchId: refreshedEvidence.batchId,
    duplicateKind: refreshedEvidence.duplicateKind,
    errorMessage: null,
    state: "planning",
    updatedAt: now,
  });
  await createPlannerRun(writableDb, {
    batchId: refreshedEvidence.batchId,
    createdAt: now,
    evidenceId: refreshedEvidence.evidenceId,
    extractionRunId: latestExtractionRunId,
    plannerRunId,
  });

  try {
    const remotePlan = await planEvidenceDbUpdates({
      evidenceId: refreshedEvidence.evidenceId,
      fileName: refreshedEvidence.originalFileName,
      mimeType: refreshedEvidence.mimeType,
      rawJson: refreshedEvidence.extractedData.originData,
    });

    await savePlannerArtifacts(writableDb, {
      batchId: refreshedEvidence.batchId,
      createdAt: now,
      evidence: refreshedEvidence,
      plannerRunId,
      remotePlan,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Planner response failed.";
    await updatePlannerRun(writableDb, {
      errorMessage: message,
      plannerRunId,
      state: "failed",
      updatedAt: now,
    });
    await updateUploadBatchState(writableDb, {
      batchId: refreshedEvidence.batchId,
      duplicateKind: refreshedEvidence.duplicateKind,
      errorMessage: message,
      state: "failed",
      updatedAt: now,
    });
  }

  const reloadedEvidence = await loadEvidenceById(writableDb, evidenceId);

  if (reloadedEvidence) {
    plannerStateStore.set(
      reloadedEvidence.batchId,
      buildPlannerResultFromEvidence(reloadedEvidence),
    );
  }

  return reloadedEvidence;
}

export async function retryEvidenceParsing(
  evidenceId: string,
): Promise<EvidenceQueueItem | null> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const evidence = await loadEvidenceById(writableDb, evidenceId);

  if (!evidence) {
    return null;
  }

  await updateUploadBatchState(writableDb, {
    batchId: evidence.batchId,
    duplicateKind: evidence.duplicateKind,
    errorMessage: null,
    state: "parsing",
    updatedAt: new Date().toISOString(),
  });

  return loadEvidenceById(writableDb, evidenceId);
}

export async function clearFailedEvidence(
  evidenceId: string,
): Promise<void> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const evidence = await loadEvidenceById(writableDb, evidenceId);

  if (!evidence || evidence.displayState !== "failed") {
    throw new Error("Failed task no longer exists.");
  }

  const plan = await buildFailedBatchClearPlan(writableDb, evidence.batchId);

  for (const relativePath of plan.filePathsToDelete) {
    await deleteVaultFile(relativePath);
  }

  await clearFailedBatchRecords(writableDb, plan);
  plannerStateStore.delete(plan.batchId);
}

export async function confirmEvidenceReview(
  evidenceId: string,
  review: LedgerReviewValues,
): Promise<string> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const evidence = await loadEvidenceById(writableDb, evidenceId);

  if (!evidence) {
    throw new Error("Selected evidence no longer exists.");
  }
  const createdAt = new Date().toISOString();

  return finalizeEvidenceReview(writableDb, {
    createdAt,
    evidenceId,
    review,
    sourceSystem: "ledger-parse-review",
  });
}

export async function loadHomeScreenSnapshot(
  input: {
    limit?: number;
    now?: string;
    offset?: number;
  } = {},
): Promise<HomeSnapshot> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const readableDb = createReadableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getFirstAsync<Row>(source, ...(params as [])),
  });

  return loadHomeSnapshot(readableDb, input);
}

export async function loadJournalListScreenSnapshot(
  input: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<JournalListSnapshot> {
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const readableDb = createReadableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getFirstAsync<Row>(source, ...(params as [])),
  });

  return loadJournalListSnapshot(readableDb, input);
}

export async function runPlanner(input: {
  fileName: string;
  mimeType: string | null;
  model: string;
  parserKind?: string;
  providerConfig?: Partial<ProviderRuntimeConfig>;
  profileInfo?: { name: string; email: string; phone: string };
  rawJson: unknown;
  rawText: string;
}): Promise<PlannerResult> {
  const now = new Date().toISOString();
  const evidenceId = `evidence-web-${Date.now().toString(36)}`;
  const batchId = `batch-web-${Date.now().toString(36)}`;
  const plannerRunId = `planner-web-${Date.now().toString(36)}`;

  // Call planner (second OpenAI call)
  const remotePlan = await planEvidenceDbUpdates({
    evidenceId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    profileInfo: input.profileInfo,
    rawJson: input.rawJson,
  }, input.providerConfig);

  // Build extracted data for planner summary
  const extractedData = buildRemoteExtractedData({
    fileName: input.fileName,
    parsePayload: input.rawJson as ReceiptParsePayload,
    scheme: {},
    sourceLabel:
      input.parserKind === "gemini" ? "gemini_upload" : "openai_upload",
  });

  // Build read results (empty for web - no local DB)
  const readResults: PlannerReadResults = {
    candidates: remotePlan.candidateRecords.map((_, candidateIndex) => ({
      candidateIndex,
      duplicateRecordIds: [],
      duplicateReceiptMatches: [],
      sourceCounterpartyMatches: [],
      sourceCounterpartySuggestions: [],
      targetCounterpartyMatches: [],
      targetCounterpartySuggestions: [],
    })),
  };

  const evidence = {
    capturedAmountCents: extractedData.fields.amountCents ?? 0,
    capturedDate: extractedData.fields.date ?? now.slice(0, 10),
    capturedDescription: extractedData.fields.description ?? input.fileName,
    capturedSource: extractedData.fields.source ?? "",
    capturedTarget: extractedData.fields.target ?? "",
    evidenceId,
    originalFileName: input.fileName,
  };

  const summary = buildPlannerSummary({
    evidence,
    extractedData,
    readResults,
    remotePlan,
  });
  const defaultReviewDate = shouldDefaultReviewDateToCurrentDate(summary)
    ? now.slice(0, 10)
    : null;

  // Build candidate records and write proposals for UI
  const candidateRecords: WorkflowCandidateRecord[] =
    summary.candidateRecords.map((payload, index) => {
      const candidateId = `${plannerRunId}-candidate-${index + 1}`;
      const state = deriveCandidateState({
        duplicateHints: readWebCandidateDuplicateHints(summary, index),
        payload,
        resolutions: summary.counterpartyResolutions.filter((resolution) => resolution.candidateIndex === index),
      });

      return {
        candidateId,
        createdAt: now,
        errorMessage: null,
        payload,
        recordId: null,
        reviewValues: buildReviewValuesFromPayload(payload, {
          defaultDate: defaultReviewDate,
        }),
        state,
        updatedAt: now,
      };
    });

  const writeProposals = buildWebWriteProposals({
    candidateRecords,
    createdAt: now,
    plannerRunId,
    proposals: summary.writeProposals,
  });

  const primaryCandidate = candidateRecords[0];

  const result: PlannerResult = {
    batchId,
    batchState: "write_proposal_ready",
    candidateRecords,
    error: null,
    evidenceId,
    fileName: input.fileName,
    rawJson: extractedData.originData ?? null,
    rawText: extractedData.rawText,
    plannerSummary: summary,
    reviewValues: primaryCandidate?.reviewValues ?? {
      amount: "",
      category: "expense",
      date: "",
      description: "",
      notes: "",
      source: "",
      target: "",
      taxCategory: "",
    },
    writeProposals,
  };
  result.batchState = deriveWebBatchState(result);

  plannerStateStore.set(batchId, result);
  return result;
}

export async function approveWriteProposal(
  batchId: string,
  writeProposalId: string,
  review?: LedgerReviewValues,
  options?: ProposalApprovalOptions,
): Promise<PlannerResult> {
  let db = getActiveWebDatabase();

  if (!db && typeof indexedDB !== "undefined") {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  if (db) {
    const writableDb = createWebWritableDatabase(db);
    const batch = await writableDb.getFirstAsync<{ evidenceId: string }>(
      "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
      batchId,
    );

    if (batch?.evidenceId) {
    const now = new Date().toISOString();

      await approveWorkflowWriteProposal(writableDb, {
        evidenceId: batch.evidenceId,
        options,
        review,
        updatedAt: now,
        writeProposalId,
      });

      const evidence = await loadEvidenceById(writableDb, batch.evidenceId);

      if (!evidence) {
        throw new Error("Evidence not found after approval.");
      }

      const result = buildPlannerResultFromEvidence(evidence);
      plannerStateStore.set(batchId, result);
      return result;
    }
  }

  const state = plannerStateStore.get(batchId);

  if (!state) {
    throw new Error("Planner state not found for batch.");
  }

  const proposal = state.writeProposals.find(
    (p) => p.writeProposalId === writeProposalId,
  );

  if (!proposal) {
    throw new Error("Write proposal not found.");
  }

  proposal.state = "executed";
  proposal.updatedAt = new Date().toISOString();

  if (proposal.proposalType === "create_counterparty") {
    applyWebCounterpartySelection(state, proposal, {
      displayName: readFirstString(
        proposal.payload.displayName,
        proposal.payload.parsedDisplayName,
      ),
      counterpartyId: `counterparty-web-${proposal.writeProposalId}`,
      currentReview: review,
    });
    releaseResolvedWebDependencies(state);
    state.batchState = deriveWebBatchState(state);
    return state;
  }

  if (proposal.proposalType === "merge_counterparty") {
    applyWebCounterpartySelection(state, proposal, {
      displayName: readFirstString(
        proposal.payload.existingDisplayName,
        proposal.payload.displayName,
      ),
      counterpartyId:
        readFirstString(proposal.payload.existingCounterpartyId) ??
        `counterparty-web-${proposal.writeProposalId}`,
      currentReview: review,
    });
    rejectSiblingWebCounterpartyCreate(state, proposal);
    releaseResolvedWebDependencies(state);
    state.batchState = deriveWebBatchState(state);
    return state;
  }

  if (proposal.proposalType === "resolve_duplicate_receipt") {
    const keepMode =
      options?.duplicateResolution?.keepMode === "keep_new"
        ? "keep_new"
        : "keep_existing";
    const candidate = resolveWebCandidateByProposal(state, proposal);

    if (candidate && keepMode === "keep_new") {
      const finalReview = review ?? candidate.reviewValues;
      const amountCents = Math.round(
        Number.parseFloat(finalReview.amount.replace(/[^0-9.]+/g, "")) * 100,
      );

      candidate.payload = {
        ...candidate.payload,
        amountCents: Number.isFinite(amountCents) ? amountCents : candidate.payload.amountCents,
        date: finalReview.date.trim() || candidate.payload.date,
        description: finalReview.description.trim() || candidate.payload.description,
        sourceLabel: finalReview.source.trim() || candidate.payload.sourceLabel,
        targetLabel: finalReview.target.trim() || candidate.payload.targetLabel,
        taxCategoryCode: finalReview.taxCategory.trim() || null,
      };
      candidate.reviewValues = finalReview;
      candidate.state = "persisted_final";
      candidate.updatedAt = proposal.updatedAt;
      if (candidate.candidateId === state.candidateRecords[0]?.candidateId) {
        state.reviewValues = finalReview;
      }

      const db = getActiveWebDatabase();

      if (db && finalReview.amount && finalReview.date && finalReview.description) {
        const matchedRecordIds = readStringArray(proposal.payload.matchedRecordIds);
        const placeholders = matchedRecordIds.map(() => "?").join(", ");
        const linkedEvidenceIds =
          matchedRecordIds.length > 0
            ? (
                await db.getAllAsync<{ evidenceId: string }>(
                  `SELECT DISTINCT evidence_id AS evidenceId
                   FROM record_evidence_links
                   WHERE record_id IN (${placeholders})
                   ORDER BY evidence_id ASC;`,
                  ...matchedRecordIds,
                )
              ).map((row) => row.evidenceId)
            : [
                readFirstString(
                  proposal.payload.conflictEvidenceId,
                  proposal.payload.duplicateEvidenceId,
                ) ?? "",
              ];
        const evidenceIds = dedupeStrings([state.evidenceId, ...linkedEvidenceIds]);
        const userClassification =
          finalReview.category === "income"
            ? ("income" as const)
            : finalReview.category === "non_business_income"
              ? ("non_business_income" as const)
              : finalReview.category === "spending"
                ? ("personal_spending" as const)
                : ("expense" as const);
        const writableDb = createWritableStorageDatabase({
          getAllAsync: <Row>(source: string, ...params: unknown[]) =>
            db.getAllAsync<Row>(source, ...(params as [])),
          getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
            db.getFirstAsync<Row>(source, ...(params as [])),
          runAsync: (source: string, ...params: unknown[]) =>
            db.runAsync(source, ...(params as [])),
        });

        try {
          if (matchedRecordIds.length > 0) {
            await db.runAsync(
              `DELETE FROM record_evidence_links
               WHERE record_id IN (${placeholders});`,
              ...matchedRecordIds,
            );
            await db.runAsync(
              `DELETE FROM record_entry_classifications
               WHERE record_id IN (${placeholders});`,
              ...matchedRecordIds,
            );
            await db.runAsync(
              `DELETE FROM records
               WHERE record_id IN (${placeholders});`,
              ...matchedRecordIds,
            );
          }

          const resolvedEntry = resolveStandardReceiptEntry(
            {
              amountCents,
              currency: "USD",
              description: finalReview.description.trim(),
              entityId: defaultEntityId,
              evidenceIds,
              memo: finalReview.notes?.trim() || null,
              occurredOn: finalReview.date.trim(),
              source: finalReview.source?.trim() || "",
              target: finalReview.target?.trim() || "",
              userClassification,
            },
            {
              createdAt: proposal.updatedAt,
              recordId: candidate.recordId ?? buildWebRecordId(state, candidate),
              sourceCounterpartyId: candidate.payload?.sourceCounterpartyId ?? null,
              sourceSystem: "ledger-upload-workflow",
              targetCounterpartyId: candidate.payload?.targetCounterpartyId ?? null,
              updatedAt: proposal.updatedAt,
            },
          );

          await persistResolvedStandardReceiptEntry(writableDb, resolvedEntry);
          candidate.recordId = resolvedEntry.record.recordId;
        } catch (error) {
          console.error("[web] Failed to replace older duplicate records:", error);
        }
      }
    } else if (candidate) {
      candidate.state = "approved";
      candidate.updatedAt = proposal.updatedAt;
    }

    rejectWebCandidateScopedProposals(state, proposal);
    state.batchState = deriveWebBatchState(state);
    return state;
  }

  if (
    proposal.proposalType === "persist_candidate_record" &&
    resolveWebCandidateByProposal(state, proposal)
  ) {
    const candidate = resolveWebCandidateByProposal(state, proposal)!;
    const now = new Date().toISOString();
    candidate.state = "persisted_final";
    candidate.updatedAt = now;

    if (review) {
      candidate.reviewValues = review;
      if (candidate.candidateId === state.candidateRecords[0]?.candidateId) {
        state.reviewValues = review;
      }
    }

    const finalReview = candidate.reviewValues;
    const db = getActiveWebDatabase();

    if (db && finalReview.amount && finalReview.date && finalReview.description) {
      const amountCents = Math.round(
        Number.parseFloat(finalReview.amount.replace(/[^0-9.]+/g, "")) * 100,
      );
      const userClassification =
        finalReview.category === "income"
          ? ("income" as const)
          : finalReview.category === "non_business_income"
            ? ("non_business_income" as const)
          : finalReview.category === "spending"
            ? ("personal_spending" as const)
            : ("expense" as const);

      const resolvedEntry = resolveStandardReceiptEntry(
        {
          amountCents,
          currency: "USD",
          description: finalReview.description.trim(),
          entityId: defaultEntityId,
          evidenceIds: [state.evidenceId],
          memo: finalReview.notes?.trim() || null,
          occurredOn: finalReview.date.trim(),
          source: finalReview.source?.trim() || "",
          target: finalReview.target?.trim() || "",
          userClassification,
        },
        {
          createdAt: now,
          recordId: candidate.recordId ?? buildWebRecordId(state, candidate),
          sourceCounterpartyId: candidate.payload?.sourceCounterpartyId ?? null,
          sourceSystem: "ledger-upload-workflow",
          targetCounterpartyId: candidate.payload?.targetCounterpartyId ?? null,
          updatedAt: now,
        },
      );

      const writableDb = createWritableStorageDatabase({
        getAllAsync: <Row>(source: string, ...params: unknown[]) =>
          db.getAllAsync<Row>(source, ...(params as [])),
        getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
          db.getFirstAsync<Row>(source, ...(params as [])),
        runAsync: (source: string, ...params: unknown[]) =>
          db.runAsync(source, ...(params as [])),
      });

      try {
        await persistResolvedStandardReceiptEntry(writableDb, resolvedEntry);
        candidate.recordId = resolvedEntry.record.recordId;
      } catch (error) {
        console.error("[web] Failed to persist record to sql.js:", error);
        }
      }

    state.batchState = deriveWebBatchState(state);
  }

  return state;
}

export async function rejectWriteProposal(
  batchId: string,
  writeProposalId: string,
): Promise<PlannerResult> {
  let db = getActiveWebDatabase();

  if (!db && typeof indexedDB !== "undefined") {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  if (db) {
    const writableDb = createWebWritableDatabase(db);
    const batch = await writableDb.getFirstAsync<{ evidenceId: string }>(
      "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
      batchId,
    );

    if (batch?.evidenceId) {
    const now = new Date().toISOString();

      await rejectWorkflowWriteProposal(writableDb, {
        updatedAt: now,
        writeProposalId,
      });

      const evidence = await loadEvidenceById(writableDb, batch.evidenceId);

      if (!evidence) {
        throw new Error("Evidence not found after rejection.");
      }

      const result = buildPlannerResultFromEvidence(evidence);
      plannerStateStore.set(batchId, result);
      return result;
    }
  }

  const state = plannerStateStore.get(batchId);

  if (!state) {
    throw new Error("Planner state not found for batch.");
  }

  const proposal = state.writeProposals.find(
    (p) => p.writeProposalId === writeProposalId,
  );

  if (!proposal) {
    throw new Error("Write proposal not found.");
  }

  proposal.state = "rejected";
  proposal.updatedAt = new Date().toISOString();

  if (proposal.proposalType === "create_counterparty") {
    for (const p of state.writeProposals) {
      if (p.dependencyIds.includes(writeProposalId)) {
        p.state = "blocked";
        p.updatedAt = new Date().toISOString();
      }
    }

    state.batchState = deriveWebBatchState(state);
    return state;
  }

  if (
    proposal.proposalType === "merge_counterparty" ||
    proposal.proposalType === "resolve_duplicate_receipt"
  ) {
    releaseResolvedWebDependencies(state);
    state.batchState = "review_required";
    return state;
  }

  if (
    proposal.proposalType === "persist_candidate_record" &&
    resolveWebCandidateByProposal(state, proposal)
  ) {
    const candidate = resolveWebCandidateByProposal(state, proposal)!;
    candidate.state = "rejected";
    candidate.updatedAt = proposal.updatedAt;
  }

  state.batchState = deriveWebBatchState(state);
  return state;
}

export async function loadPlannerState(
  batchId: string,
): Promise<PlannerResult | null> {
  const inMemory = plannerStateStore.get(batchId);
  let db = getActiveWebDatabase();

  if (!db) {
    if (inMemory && typeof indexedDB === "undefined") {
      return inMemory;
    }

    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const writableDb = createWebWritableDatabase(db);
  const batch = await db.getFirstAsync<{ evidenceId: string }>(
    "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
    batchId,
  );

  if (batch?.evidenceId) {
    await reconcileInactiveReviewBatch(writableDb, {
      batchId,
      updatedAt: new Date().toISOString(),
    });

    const evidence = await loadEvidenceById(writableDb, batch.evidenceId);

    if (!evidence) {
      return null;
    }

    const result = buildPlannerResultFromEvidence(evidence);
    plannerStateStore.set(batchId, result);
    return result;
  }

  if (inMemory) {
    return inMemory;
  }

  return null;
}

function buildPlannerResultFromEvidence(evidence: EvidenceQueueItem): PlannerResult {
  const primaryCandidate = evidence.candidateRecords[0];

  return {
    batchId: evidence.batchId,
    batchState: evidence.batchState,
    candidateRecords: evidence.candidateRecords,
    error: evidence.errorMessage,
    evidenceId: evidence.evidenceId,
    fileName: evidence.originalFileName,
    rawJson: evidence.extractedData?.originData ?? null,
    rawText: evidence.extractedData?.rawText ?? "",
    plannerSummary: evidence.plannerSummary,
    reviewValues:
      primaryCandidate?.reviewValues ?? {
        amount: "",
        category: "expense",
        date: "",
        description: "",
        notes: "",
        source: "",
        target: "",
        taxCategory: "",
      },
    writeProposals: evidence.writeProposals,
  };
}

function buildWebWriteProposals(input: {
  candidateRecords: WorkflowCandidateRecord[];
  createdAt: string;
  plannerRunId: string;
  proposals: PlannerSummary["writeProposals"];
}): WorkflowWriteProposalItem[] {
  const inserted: Array<{
    proposal: PlannerSummary["writeProposals"][number];
    writeProposalId: string;
  }> = [];

  return input.proposals.map((proposal, index) => {
    const writeProposalId = `${input.plannerRunId}-proposal-${index + 1}`;
    const dependencyIds = resolveWebProposalDependencies(inserted, proposal);
    const candidateIndex = readWebProposalCandidateIndex(proposal);
    const candidate = candidateIndex === null ? null : input.candidateRecords[candidateIndex] ?? null;
    const state =
      dependencyIds.length > 0 ||
      (proposal.proposalType === "persist_candidate_record" &&
        candidate?.state !== "validated" &&
        candidate?.state !== "needs_review")
        ? "blocked"
        : "pending_approval";

    inserted.push({ proposal, writeProposalId });

    return {
      approvalRequired: true,
      candidateId: candidate?.candidateId ?? null,
      createdAt: input.createdAt,
      dependencyIds,
      payload: proposal.values,
      proposalType: proposal.proposalType,
      rationale: buildWebProposalRationale(proposal),
      state,
      updatedAt: input.createdAt,
      writeProposalId,
    };
  });
}

function resolveWebProposalDependencies(
  inserted: Array<{
    proposal: PlannerSummary["writeProposals"][number];
    writeProposalId: string;
  }>,
  proposal: PlannerSummary["writeProposals"][number],
): string[] {
  const proposalCandidateIndex = readWebProposalCandidateIndex(proposal);

  if (proposal.proposalType === "create_counterparty") {
    const role = readFirstString(proposal.values.role, proposal.role);

    return inserted
      .filter(
        (item) =>
          readWebProposalCandidateIndex(item.proposal) === proposalCandidateIndex &&
          item.proposal.proposalType === "merge_counterparty" &&
          readFirstString(item.proposal.values.role, item.proposal.role) ===
            role,
      )
      .map((item) => item.writeProposalId);
  }

  if (proposal.proposalType === "persist_candidate_record") {
    return inserted
      .filter(
        (item) =>
          readWebProposalCandidateIndex(item.proposal) === proposalCandidateIndex &&
          (
            item.proposal.proposalType === "create_counterparty" ||
            item.proposal.proposalType === "merge_counterparty" ||
            item.proposal.proposalType === "resolve_duplicate_receipt"
          ),
      )
      .map((item) => item.writeProposalId);
  }

  return [];
}

function buildWebProposalRationale(
  proposal: PlannerSummary["writeProposals"][number],
): string {
  if (proposal.proposalType === "create_counterparty") {
    return "Parsed label does not match an existing local counterparty, so creation requires approval.";
  }

  if (proposal.proposalType === "merge_counterparty") {
    return "A likely existing local counterparty was found, so the operator must decide whether to merge it or keep a new counterparty.";
  }

  if (proposal.proposalType === "resolve_duplicate_receipt") {
    return "A likely duplicate receipt was found, so the operator must decide whether to merge the evidence or keep the uploads separate.";
  }

  return "Candidate record is ready for final persistence after approval and local validation.";
}

function readWebProposalCandidateIndex(
  proposal:
    | PlannerSummary["writeProposals"][number]
    | WorkflowWriteProposalItem,
): number | null {
  const payload = "payload" in proposal ? proposal.payload : proposal.values;
  const candidateIndex = readFirstNumber(payload?.candidateIndex);

  return candidateIndex === null || candidateIndex < 0 ? null : candidateIndex;
}

function resolveWebCandidateByProposal(
  state: PlannerResult,
  proposal: WorkflowWriteProposalItem,
): WorkflowCandidateRecord | null {
  return (
    (proposal.candidateId
      ? state.candidateRecords.find((candidate) => candidate.candidateId === proposal.candidateId)
      : null) ??
    (readWebProposalCandidateIndex(proposal) !== null
      ? state.candidateRecords[readWebProposalCandidateIndex(proposal)!] ?? null
      : null)
  );
}

function rejectWebCandidateScopedProposals(
  state: PlannerResult,
  proposal: WorkflowWriteProposalItem,
): void {
  for (const item of state.writeProposals) {
    if (
      item.writeProposalId !== proposal.writeProposalId &&
      item.candidateId === proposal.candidateId &&
      (item.state === "pending_approval" || item.state === "blocked")
    ) {
      item.state = "rejected";
      item.updatedAt = proposal.updatedAt;
    }
  }
}

function buildWebRecordId(
  state: PlannerResult,
  candidate: WorkflowCandidateRecord,
): string {
  return state.candidateRecords.length <= 1
    ? `record-${state.evidenceId}`
    : `record-${candidate.candidateId}`;
}

function readWebCandidateDuplicateHints(
  summary: PlannerSummary,
  candidateIndex: number,
): PlannerSummary["duplicateHints"] {
  const persistProposal = summary.writeProposals.find((proposal) =>
    proposal.proposalType === "persist_candidate_record" &&
    readWebProposalCandidateIndex(proposal) === candidateIndex,
  );
  const duplicateHints = persistProposal?.values.duplicateHints;

  if (!Array.isArray(duplicateHints)) {
    return summary.duplicateHints;
  }

  return duplicateHints.filter((hint): hint is PlannerSummary["duplicateHints"][number] => typeof hint === "string");
}

function deriveWebBatchState(state: PlannerResult): string {
  const resolvedStates = new Set<WorkflowCandidateRecord["state"]>([
    "approved",
    "failed",
    "persisted_final",
    "rejected",
  ]);
  const positiveStates = new Set<WorkflowCandidateRecord["state"]>([
    "approved",
    "persisted_final",
  ]);
  const candidateStates = state.candidateRecords.map((candidate) => candidate.state);
  const hasResolvedCandidates = candidateStates.some((candidateState) => resolvedStates.has(candidateState));
  const hasUnresolvedCandidates = candidateStates.some((candidateState) => !resolvedStates.has(candidateState));

  if (!state.candidateRecords.length && !state.writeProposals.length) {
    return "no_match";
  }

  const pendingProposalCount = state.writeProposals.filter(
    (proposal) => proposal.state === "pending_approval",
  ).length;

  if (
    pendingProposalCount === 0 &&
    state.candidateRecords.length > 0 &&
    state.candidateRecords.every((candidate) => candidate.state === "validated")
  ) {
    for (const proposal of state.writeProposals) {
      if (proposal.state === "blocked") {
        proposal.state = "rejected";
        proposal.updatedAt = new Date().toISOString();
      }
    }

    for (const candidate of state.candidateRecords) {
      candidate.state = "approved";
      candidate.updatedAt = new Date().toISOString();
    }
  }

  if (hasResolvedCandidates && hasUnresolvedCandidates) {
    return "partially_approved";
  }

  if (candidateStates.length > 0 && candidateStates.every((candidateState) => resolvedStates.has(candidateState))) {
    return candidateStates.some((candidateState) => positiveStates.has(candidateState))
      ? "approved"
      : "rejected";
  }

  if (candidateStates.some((candidateState) => candidateState === "duplicate" || candidateState === "needs_review")) {
    return "review_required";
  }

  if (state.writeProposals.length > 0) {
    return "write_proposal_ready";
  }

  return "candidates_generated";
}

function applyWebCounterpartySelection(
  state: PlannerResult,
  proposal: WorkflowWriteProposalItem,
  input: {
    counterpartyId: string;
    currentReview?: LedgerReviewValues;
    displayName: string | null;
  },
): void {
  const role =
    readFirstString(proposal.payload.role) === "target" ? "target" : "source";
  const displayName = input.displayName ?? "";
  const candidate = resolveWebCandidateByProposal(state, proposal);

  if (!candidate) {
    return;
  }

  candidate.payload = {
    ...candidate.payload,
    ...(role === "source"
      ? { sourceCounterpartyId: input.counterpartyId, sourceLabel: displayName }
      : {
          targetCounterpartyId: input.counterpartyId,
          targetLabel: displayName,
        }),
  };
  candidate.reviewValues = mergeReviewValuesWithPayload(
    input.currentReview ?? candidate.reviewValues,
    candidate.payload,
    {
      overwriteFields: role === "source" ? ["source"] : ["target"],
    },
  );
  candidate.state = "validated";
  candidate.updatedAt = proposal.updatedAt;
  if (proposal.candidateId === state.candidateRecords[0]?.candidateId) {
    state.reviewValues = candidate.reviewValues;
  }
}

function rejectSiblingWebCounterpartyCreate(
  state: PlannerResult,
  mergeProposal: WorkflowWriteProposalItem,
): void {
  const role = readFirstString(mergeProposal.payload.role);

  for (const proposal of state.writeProposals) {
    if (
      proposal.proposalType === "create_counterparty" &&
      proposal.writeProposalId !== mergeProposal.writeProposalId &&
      proposal.candidateId === mergeProposal.candidateId &&
      readFirstString(proposal.payload.role) === role &&
      proposal.state !== "executed"
    ) {
      proposal.state = "rejected";
      proposal.updatedAt = mergeProposal.updatedAt;
      removeWebProposalDependency(state, proposal.writeProposalId);
    }
  }
}

function releaseResolvedWebDependencies(state: PlannerResult): void {
  for (const proposal of state.writeProposals) {
    if (proposal.state !== "blocked" || proposal.dependencyIds.length === 0) {
      continue;
    }

    const dependencyStates = proposal.dependencyIds
      .map((dependencyId) =>
        state.writeProposals.find(
          (item) => item.writeProposalId === dependencyId,
        ),
      )
      .filter((item): item is WorkflowWriteProposalItem => Boolean(item));
    const allResolved = dependencyStates.every(
      (dependency) =>
        dependency.state === "executed" || dependency.state === "rejected",
    );

    if (allResolved) {
      proposal.state = "pending_approval";
      proposal.updatedAt = new Date().toISOString();
    }
  }
}

function removeWebProposalDependency(
  state: PlannerResult,
  dependencyProposalId: string,
): void {
  for (const proposal of state.writeProposals) {
    if (!proposal.dependencyIds.includes(dependencyProposalId)) {
      continue;
    }

    proposal.dependencyIds = proposal.dependencyIds.filter(
      (dependencyId) => dependencyId !== dependencyProposalId,
    );
    proposal.updatedAt = new Date().toISOString();
  }
}

function readFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
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

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function inferUploadKind(
  mimeType: string | null,
  fileName: string,
): UploadCandidate["kind"] {
  const normalized = `${mimeType ?? ""} ${fileName}`.toLowerCase();
  if (normalized.includes("pdf")) return "document";
  if (normalized.includes("live")) return "live_photo";
  return "image";
}

export function resetLedgerWebRuntimeStateForTests() {
  plannerStateStore.clear();
}

export async function loadJournalScreenEntries(
  input: { locale?: string } = {},
): Promise<GeneralLedgerEntry[]> {
  const { loadJournalEntries } = await import("./ledger-reporting");
  let db = getActiveWebDatabase();

  if (!db) {
    db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);
  }

  const readableDb = createReadableStorageDatabase({
    getAllAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getAllAsync<Row>(source, ...(params as [])),
    getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
      db.getFirstAsync<Row>(source, ...(params as [])),
  });

  return loadJournalEntries(readableDb, {
    locale: (input.locale as "en" | "zh-CN") ?? "en",
  });
}
