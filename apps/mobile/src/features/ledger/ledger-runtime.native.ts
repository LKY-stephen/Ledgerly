import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { buildEvidenceUploadPath } from "@creator-cfo/storage";
import type { EvidenceExtractedData } from "@creator-cfo/schemas";

import {
  buildFailedExtractedData,
  buildRemoteExtractedData,
  buildStoredUploadFileName,
  defaultEntityId,
  type EvidenceQueueItem,
  type ImportedEvidenceBundle,
  type ImportedEvidenceFile,
  type LedgerReviewValues,
} from "./ledger-domain";
import {
  ensureDefaultEntity,
  finalizeEvidenceReview,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  loadEvidenceQueue,
  updateEvidenceExtraction,
} from "./ledger-store";
import { parseEvidenceMultipartFromNative } from "./remote-parse";
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

export async function loadHomeScreenSnapshot(input: {
  limit?: number;
  now?: string;
  offset?: number;
} = {}): Promise<HomeSnapshot> {
  return withWritableLocalDatabase(async ({ writableDatabase }) => loadHomeSnapshot(writableDatabase, input));
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
    const result = await parseEvidenceMultipartFromNative({
      fileName: evidence.originalFileName,
      fileUri: absolutePath,
      mimeType: evidence.mimeType,
      sourcePlatform: Platform.OS === "ios" ? "ios" : "android",
    });

    return buildRemoteExtractedData({
      fallbackDate,
      fileName: evidence.originalFileName,
      response: result,
      sourceLabel: "Vercel OpenAI GPT",
    });
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
