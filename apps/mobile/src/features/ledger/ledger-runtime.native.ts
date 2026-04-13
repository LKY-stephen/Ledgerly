import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { buildEvidenceUploadPath } from "@creator-cfo/storage";
import type { EvidenceExtractedData, ReceiptParsePayload } from "@creator-cfo/schemas";

import {
  buildFailedExtractedData,
  buildRemoteExtractedData,
  buildStoredUploadFileName,
  defaultEntityId,
  type EvidenceQueueItem,
  type ImportedEvidenceBundle,
  type ImportedEvidenceFile,
  type LedgerReviewValues,
  type WorkflowCandidateRecord,
  type WorkflowWriteProposalItem,
} from "./ledger-domain";
import {
  ensureDefaultEntity,
  finalizeEvidenceReview,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  loadEvidenceQueue,
  updateEvidenceExtraction,
} from "./ledger-store";
import { parseFileWithOpenAi, type ParseResult } from "./remote-parse";
import type { PlannerSummary } from "@creator-cfo/schemas";
import { loadHomeSnapshot, type HomeSnapshot } from "../home/home-data";
import { getActivePackageRootDirectory } from "../../storage/package-environment.native";
import { buildPackageAbsolutePath } from "../../storage/package-paths";
import { withWritableLocalDatabase } from "../../storage/runtime";

interface UploadCandidate {
  evidenceGroupKey: string;
  isPrimary: boolean;
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
  uri: string;
}

export async function pickDocumentUploadCandidates(): Promise<UploadCandidate[]> {
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
    kind: inferUploadKind(asset.mimeType, asset.name),
    mimeType: asset.mimeType ?? null,
    originalFileName: asset.name,
    sizeBytes: asset.size ?? null,
    uri: asset.uri,
  }));
}

export async function pickPhotoUploadCandidates(): Promise<UploadCandidate[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library access is required to upload receipt images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: true,
    mediaTypes: ["images", "livePhotos"] as never,
    quality: 1,
    selectionLimit: 0,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.flatMap((asset, index) => {
    const evidenceGroupKey = asset.assetId || asset.fileName || `${asset.uri}-${index}`;
    const baseCandidate: UploadCandidate = {
      evidenceGroupKey,
      isPrimary: true,
      kind: asset.type === "livePhoto" ? "live_photo" : "image",
      mimeType: asset.mimeType ?? null,
      originalFileName: asset.fileName ?? `photo-${index + 1}.jpg`,
      sizeBytes: asset.fileSize ?? null,
      uri: asset.uri,
    };
    const pairedVideoAsset = (asset as ImagePicker.ImagePickerAsset & {
      pairedVideoAsset?: ImagePicker.ImagePickerAsset;
    }).pairedVideoAsset;

    if (!pairedVideoAsset) {
      return [baseCandidate];
    }

    return [
      baseCandidate,
      {
        evidenceGroupKey,
        isPrimary: false,
        kind: "video",
        mimeType: pairedVideoAsset.mimeType ?? "video/quicktime",
        originalFileName: pairedVideoAsset.fileName ?? `${stripExtension(baseCandidate.originalFileName)}.mov`,
        sizeBytes: pairedVideoAsset.fileSize ?? null,
        uri: pairedVideoAsset.uri,
      },
    ];
  });
}

export async function importUploadCandidates(candidates: UploadCandidate[]): Promise<string[]> {
  if (!candidates.length) {
    return [];
  }

  const capturedAt = new Date().toISOString();
  const bundles = await createImportedBundles(candidates, capturedAt);

  await withWritableLocalDatabase(async ({ database, writableDatabase }) => {
    await database.withTransactionAsync(async () => {
      await ensureDefaultEntity(writableDatabase, capturedAt);

      for (const bundle of bundles) {
        await insertImportedEvidenceBundle(writableDatabase, bundle);
      }
    });
  });

  return bundles.map((bundle) => bundle.evidenceId);
}

export async function loadParseQueue(): Promise<EvidenceQueueItem[]> {
  return withWritableLocalDatabase(async ({ writableDatabase }) => loadEvidenceQueue(writableDatabase));
}

export async function parseEvidence(evidenceId: string): Promise<EvidenceQueueItem | null> {
  const extracted = await withWritableLocalDatabase(async ({ writableDatabase }) => {
    const evidence = await loadEvidenceById(writableDatabase, evidenceId);

    if (!evidence) {
      return null;
    }

    if (evidence.parseStatus === "pending" && evidence.extractedData?.rawText) {
      return evidence;
    }

    const extractedData = await extractEvidenceData(evidence);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId,
      extractedData,
      parseStatus: extractedData.failureReason ? "failed" : "pending",
    });

    return null;
  });

  if (extracted) {
    return extracted;
  }

  return withWritableLocalDatabase(async ({ writableDatabase }) => loadEvidenceById(writableDatabase, evidenceId));
}

export async function retryEvidenceParsing(evidenceId: string): Promise<EvidenceQueueItem | null> {
  return withWritableLocalDatabase(async ({ writableDatabase }) => {
    const evidence = await loadEvidenceById(writableDatabase, evidenceId);

    if (!evidence) {
      return null;
    }

    const resetExtractedData: EvidenceExtractedData = {
      candidates: {
        amountCents: null,
        category: null,
        date: evidence.capturedDate,
        description: evidence.capturedDescription || stripExtension(evidence.originalFileName),
        notes: null,
        source: null,
        target: null,
        taxCategory: null,
      },
      fields: {
        amountCents: null,
        category: null,
        date: evidence.capturedDate,
        description: evidence.capturedDescription || stripExtension(evidence.originalFileName),
        notes: null,
        source: null,
        target: null,
        taxCategory: null,
      },
      model: null,
      parser: "openai_gpt",
      rawLines: [],
      rawSummary: "",
      rawText: "",
      sourceLabel: "retry",
      warnings: [],
    };

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId,
      extractedData: resetExtractedData,
      parseStatus: "pending",
    });

    return null;
  }).then(() => parseEvidence(evidenceId));
}

export async function confirmEvidenceReview(
  evidenceId: string,
  review: LedgerReviewValues,
): Promise<string> {
  const createdAt = new Date().toISOString();

  return withWritableLocalDatabase(async ({ database, writableDatabase }) => {
    let recordId = "";

    await database.withTransactionAsync(async () => {
      await ensureDefaultEntity(writableDatabase, createdAt);
      recordId = await finalizeEvidenceReview(writableDatabase, {
        createdAt,
        evidenceId,
        review,
        sourceSystem: "ledger-parse-review",
      });
    });

    return recordId;
  });
}

export async function parseFile(
  fileUri: string,
  fileName: string,
  mimeType: string | null,
): Promise<ParseResult> {
  return parseFileWithOpenAi({ fileName, fileUri, mimeType });
}

export async function loadHomeScreenSnapshot(input: {
  limit?: number;
  now?: string;
  offset?: number;
} = {}): Promise<HomeSnapshot> {
  return withWritableLocalDatabase(async ({ writableDatabase }) => loadHomeSnapshot(writableDatabase, input));
}

export interface PlannerResult {
  batchId: string;
  batchState: string;
  candidateRecords: WorkflowCandidateRecord[];
  error: string | null;
  evidenceId: string;
  plannerSummary: PlannerSummary | null;
  reviewValues: LedgerReviewValues;
  writeProposals: WorkflowWriteProposalItem[];
}

export async function runPlanner(input: {
  fileName: string;
  mimeType: string | null;
  model: string;
  parserKind?: string;
  profileInfo?: { name: string; email: string; phone: string };
  rawJson: unknown;
  rawText: string;
}): Promise<PlannerResult> {
  const { planEvidenceDbUpdates } = await import("./remote-parse");
  const { buildRemoteExtractedData } = await import("./ledger-domain");
  const {
    createExtractionRun,
    createPlannerRun,
    createUploadBatch,
    savePlannerArtifacts,
    updateExtractionRun,
    updateUploadBatchState,
  } = await import("./ledger-store");

  return withWritableLocalDatabase(async ({ writableDatabase }) => {
    const now = new Date().toISOString();
    const evidenceId = `evidence-${Date.now().toString(36)}`;
    const batchId = `batch-${Date.now().toString(36)}`;
    const extractionRunId = `extraction-${Date.now().toString(36)}`;
    const plannerRunId = `planner-${Date.now().toString(36)}`;

    // 1. Ensure entity exists
    await ensureDefaultEntity(writableDatabase, now);

    // 2. Insert evidence bundle (must exist before batch due to FK)
    await insertImportedEvidenceBundle(writableDatabase, {
      batchId,
      capturedAt: now,
      entityId: defaultEntityId,
      evidenceId,
      evidenceKind: input.mimeType?.startsWith("image/") ? "receipt_photo" : "receipt_document",
      filePath: "",
      files: [
        {
          capturedAt: now,
          evidenceFileId: `ef-${Date.now().toString(36)}`,
          isPrimary: true,
          mimeType: input.mimeType,
          originalFileName: input.fileName,
          relativePath: "",
          sha256Hex: "0000000000",
          sizeBytes: null,
          vaultCollection: "evidence-objects",
        },
      ],
      sourceSystem: "ledger-upload-workflow",
    });

    // 3. Create upload batch (after evidence exists)
    await createUploadBatch(writableDatabase, {
      batchId,
      createdAt: now,
      evidenceId,
      sourceSystem: "ledger-upload-workflow",
      state: "uploaded",
    });

    // 4. Update batch state through parse flow
    await updateUploadBatchState(writableDatabase, {
      batchId,
      state: "evidence_registered",
      updatedAt: now,
    });
    await updateUploadBatchState(writableDatabase, {
      batchId,
      state: "parsing",
      updatedAt: now,
    });

    // 5. Create extraction run with rawJson
    await createExtractionRun(writableDatabase, {
      batchId,
      createdAt: now,
      evidenceId,
      extractionRunId,
    });
    await updateExtractionRun(writableDatabase, {
      extractionRunId,
      model: input.model,
      parsePayload: input.rawJson as never,
      state: "complete",
      updatedAt: now,
    });

    // 6. Update batch to parse_complete
    await updateUploadBatchState(writableDatabase, {
      batchId,
      state: "parse_complete",
      updatedAt: now,
    });

    // 7. Build extracted data for the evidence row from the validated parse payload
    const extractedData = buildRemoteExtractedData({
      fileName: input.fileName,
      parsePayload: input.rawJson as ReceiptParsePayload,
      scheme: {},
      sourceLabel: input.parserKind === "gemini" ? "gemini_upload" : "openai_upload",
    });

    await writableDatabase.runAsync(
      `UPDATE evidences SET parse_status = 'parsed', extracted_data = ? WHERE evidence_id = ?;`,
      JSON.stringify(extractedData),
      evidenceId,
    );

    // 8. Update batch to planning
    await updateUploadBatchState(writableDatabase, {
      batchId,
      state: "planning",
      updatedAt: now,
    });

    // 9. Call planner (second OpenAI call)
    const remotePlan = await planEvidenceDbUpdates({
      evidenceId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      profileInfo: input.profileInfo,
      rawJson: input.rawJson,
    });

    // 10. Create planner run
    await createPlannerRun(writableDatabase, {
      batchId,
      createdAt: now,
      evidenceId,
      extractionRunId,
      plannerRunId,
    });

    // 11. Reload evidence to get hydrated item
    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, evidenceId);

    if (!evidenceBeforeSave) {
      throw new Error("Evidence row was not found after insert.");
    }

    // 12. Save planner artifacts (read results + summary + candidates + proposals)
    await savePlannerArtifacts(writableDatabase, {
      batchId,
      createdAt: now,
      evidence: evidenceBeforeSave,
      plannerRunId,
      remotePlan,
    });

    // 13. Reload evidence to get final state
    const evidence = await loadEvidenceById(writableDatabase, evidenceId);

    if (!evidence) {
      throw new Error("Evidence row was not found after planner save.");
    }

    const primaryCandidate = evidence.candidateRecords[0];

    return {
      batchId,
      batchState: evidence.batchState,
      candidateRecords: evidence.candidateRecords,
      error: null,
      evidenceId,
      plannerSummary: evidence.plannerSummary,
      reviewValues: primaryCandidate?.reviewValues ?? emptyReviewValues(),
      writeProposals: evidence.writeProposals,
    };
  });
}

export async function approveWriteProposal(
  batchId: string,
  writeProposalId: string,
  review?: LedgerReviewValues,
): Promise<PlannerResult> {
  const { approveWorkflowWriteProposal } = await import("./ledger-store");

  return withWritableLocalDatabase(async ({ writableDatabase }) => {
    const now = new Date().toISOString();

    const batch = await writableDatabase.getFirstAsync<{ evidenceId: string }>(
      "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
      batchId,
    );

    if (!batch) {
      throw new Error("Upload batch not found.");
    }

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: batch.evidenceId,
      review,
      updatedAt: now,
      writeProposalId,
    });

    const evidence = await loadEvidenceById(writableDatabase, batch.evidenceId);

    if (!evidence) {
      throw new Error("Evidence not found after approval.");
    }

    const primaryCandidate = evidence.candidateRecords[0];

    return {
      batchId,
      batchState: evidence.batchState,
      candidateRecords: evidence.candidateRecords,
      error: null,
      evidenceId: batch.evidenceId,
      plannerSummary: evidence.plannerSummary,
      reviewValues: primaryCandidate?.reviewValues ?? emptyReviewValues(),
      writeProposals: evidence.writeProposals,
    };
  });
}

export async function rejectWriteProposal(
  batchId: string,
  writeProposalId: string,
): Promise<PlannerResult> {
  const { rejectWorkflowWriteProposal } = await import("./ledger-store");

  return withWritableLocalDatabase(async ({ writableDatabase }) => {
    const now = new Date().toISOString();

    const batch = await writableDatabase.getFirstAsync<{ evidenceId: string }>(
      "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
      batchId,
    );

    if (!batch) {
      throw new Error("Upload batch not found.");
    }

    await rejectWorkflowWriteProposal(writableDatabase, {
      updatedAt: now,
      writeProposalId,
    });

    const evidence = await loadEvidenceById(writableDatabase, batch.evidenceId);

    if (!evidence) {
      throw new Error("Evidence not found after rejection.");
    }

    const primaryCandidate = evidence.candidateRecords[0];

    return {
      batchId,
      batchState: evidence.batchState,
      candidateRecords: evidence.candidateRecords,
      error: null,
      evidenceId: batch.evidenceId,
      plannerSummary: evidence.plannerSummary,
      reviewValues: primaryCandidate?.reviewValues ?? emptyReviewValues(),
      writeProposals: evidence.writeProposals,
    };
  });
}

export async function loadPlannerState(batchId: string): Promise<PlannerResult | null> {
  return withWritableLocalDatabase(async ({ writableDatabase }) => {
    const batch = await writableDatabase.getFirstAsync<{ evidenceId: string }>(
      "SELECT evidence_id AS evidenceId FROM upload_batches WHERE batch_id = ?;",
      batchId,
    );

    if (!batch) {
      return null;
    }

    const evidence = await loadEvidenceById(writableDatabase, batch.evidenceId);

    if (!evidence) {
      return null;
    }

    const primaryCandidate = evidence.candidateRecords[0];

    return {
      batchId,
      batchState: evidence.batchState,
      candidateRecords: evidence.candidateRecords,
      error: null,
      evidenceId: batch.evidenceId,
      plannerSummary: evidence.plannerSummary,
      reviewValues: primaryCandidate?.reviewValues ?? emptyReviewValues(),
      writeProposals: evidence.writeProposals,
    };
  });
}

async function createImportedBundles(
  candidates: UploadCandidate[],
  capturedAt: string,
): Promise<ImportedEvidenceBundle[]> {
  const grouped = new Map<string, UploadCandidate[]>();

  for (const candidate of candidates) {
    const group = grouped.get(candidate.evidenceGroupKey) ?? [];
    group.push(candidate);
    grouped.set(candidate.evidenceGroupKey, group);
  }

  const bundles: ImportedEvidenceBundle[] = [];

  for (const [groupKey, groupCandidates] of grouped.entries()) {
    const evidenceId = `evidence-${createOpaqueId(groupKey)}`;
    const importedFiles: ImportedEvidenceFile[] = [];
    let primaryPath = "";

    for (const candidate of groupCandidates) {
      const sha256Hex = await hashFileAtUri(candidate.uri);
      const storedName = buildStoredUploadFileName(
        defaultEntityId,
        capturedAt,
        sha256Hex,
        candidate.originalFileName,
      );
      const relativePath = buildEvidenceUploadPath(defaultEntityId, capturedAt, storedName);
      const absolutePath = await buildAbsoluteVaultPath(relativePath);
      await ensureParentDirectory(absolutePath);
      await FileSystem.copyAsync({ from: candidate.uri, to: absolutePath });

      importedFiles.push({
        capturedAt,
        evidenceFileId: `evidence-file-${createOpaqueId(candidate.originalFileName)}`,
        isPrimary: candidate.isPrimary,
        mimeType: candidate.mimeType,
        originalFileName: candidate.originalFileName,
        relativePath,
        sha256Hex,
        sizeBytes: candidate.sizeBytes,
        vaultCollection: "evidence-objects",
      });

      if (candidate.isPrimary) {
        primaryPath = relativePath;
      }
    }

    bundles.push({
      batchId: `batch-${createOpaqueId(groupKey)}`,
      capturedAt,
      entityId: defaultEntityId,
      evidenceId,
      evidenceKind: inferEvidenceKind(groupCandidates),
      filePath: primaryPath || importedFiles[0]?.relativePath || "",
      files: importedFiles,
      sourceSystem: "ledger-upload-intake",
    });
  }

  return bundles;
}

async function extractEvidenceData(evidence: EvidenceQueueItem): Promise<EvidenceExtractedData> {
  const fallbackDate = evidence.createdAt.slice(0, 10);
  const absolutePath = await buildAbsoluteVaultPath(evidence.filePath);

  try {
    const result = await parseFileWithOpenAi({
      fileName: evidence.originalFileName,
      fileUri: absolutePath,
      mimeType: evidence.mimeType,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.rawJson) {
      throw new Error("Remote GPT parsing returned no validated parser payload.");
    }

    const extractedData = buildRemoteExtractedData({
      fileName: evidence.originalFileName,
      parsePayload: result.rawJson,
      scheme: {},
      sourceLabel: "Vercel OpenAI GPT",
    });

    return extractedData;
  } catch (error) {
    return buildFailedExtractedData({
      fallbackDate,
      failureReason: error instanceof Error ? error.message : "Remote GPT parsing failed.",
      fileName: evidence.originalFileName,
      parser: "openai_gpt",
      sourceLabel: "Vercel OpenAI GPT",
    });
  }
}

async function buildAbsoluteVaultPath(relativePath: string): Promise<string> {
  return buildPackageAbsolutePath(getActivePackageRootDirectory(), relativePath);
}

async function ensureParentDirectory(path: string): Promise<void> {
  const directory = path.slice(0, path.lastIndexOf("/"));
  const info = await FileSystem.getInfoAsync(directory);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
}

async function hashFileAtUri(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

function createOpaqueId(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-z0-9]+/gi, "").toLowerCase().slice(0, 12) || "item";
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${normalizedSeed}`;
}

function inferUploadKind(mimeType: string | null | undefined, fileName: string): UploadCandidate["kind"] {
  if (mimeType?.startsWith("image/") || /\.(heic|jpe?g|png)$/i.test(fileName)) {
    return "image";
  }

  return "document";
}

function inferEvidenceKind(candidates: UploadCandidate[]): string {
  if (candidates.some((candidate) => candidate.kind === "video")) {
    return "live_photo";
  }

  if (candidates.some((candidate) => candidate.kind === "image" || candidate.kind === "live_photo")) {
    return "image";
  }

  return "document";
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

function emptyReviewValues(): LedgerReviewValues {
  return {
    amount: "",
    category: "expense",
    date: "",
    description: "",
    notes: "",
    source: "",
    target: "",
    taxCategory: "",
  };
}
