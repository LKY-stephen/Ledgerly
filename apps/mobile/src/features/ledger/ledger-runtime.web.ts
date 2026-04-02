import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { EvidenceExtractedData } from "@creator-cfo/schemas";

import {
  buildExtractedData,
  createTrendPointsFromTotals,
  defaultEntityId,
  homeRecentPageSize,
  type EvidenceQueueItem,
  type HomeRecentRecord,
  type LedgerReviewValues,
} from "./ledger-domain";
import type { HomeSnapshot } from "../home/home-data";

interface UploadCandidate {
  evidenceGroupKey: string;
  isPrimary: boolean;
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
  uri: string;
}

interface WebRuntimeState {
  evidences: EvidenceQueueItem[];
  records: HomeRecentRecord[];
}

const storageKey = "creator-cfo-web-ledger-runtime-v1";
let memoryState: WebRuntimeState = { evidences: [], records: [] };

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
    evidenceGroupKey: asset.assetId || asset.fileName || `${asset.uri}-${index}`,
    isPrimary: true,
    kind: "image",
    mimeType: asset.mimeType ?? null,
    originalFileName: asset.fileName ?? `photo-${index + 1}.jpg`,
    sizeBytes: asset.fileSize ?? null,
    uri: asset.uri,
  }));
}

export async function importUploadCandidates(candidates: UploadCandidate[]): Promise<string[]> {
  const state = loadState();
  const createdAt = new Date().toISOString();
  const grouped = new Map<string, UploadCandidate[]>();

  for (const candidate of candidates) {
    const group = grouped.get(candidate.evidenceGroupKey) ?? [];
    group.push(candidate);
    grouped.set(candidate.evidenceGroupKey, group);
  }

  const evidenceIds: string[] = [];

  for (const [groupKey, groupItems] of grouped.entries()) {
    const primary = groupItems.find((item) => item.isPrimary) ?? groupItems[0];
    const evidenceId = `web-evidence-${createOpaqueId(groupKey)}`;
    evidenceIds.push(evidenceId);
    state.evidences.push({
      capturedAmountCents: 0,
      capturedDate: createdAt.slice(0, 10),
      capturedDescription: "",
      capturedSource: "",
      capturedTarget: "",
      createdAt,
      evidenceId,
      evidenceKind: groupItems.some((item) => item.kind === "video") ? "live_photo" : inferUploadKind(primary?.mimeType, primary?.originalFileName ?? ""),
      extractedData: null,
      filePath: primary?.uri ?? "",
      mimeType: primary?.mimeType ?? null,
      originalFileName: primary?.originalFileName ?? "upload",
      parseStatus: "pending",
    });
  }

  saveState(state);
  return evidenceIds;
}

export async function loadParseQueue(): Promise<EvidenceQueueItem[]> {
  return loadState().evidences.filter((item) => item.parseStatus !== "parsed");
}

export async function parseEvidence(evidenceId: string): Promise<EvidenceQueueItem | null> {
  const state = loadState();
  const evidence = state.evidences.find((item) => item.evidenceId === evidenceId);

  if (!evidence) {
    return null;
  }

  if (evidence.extractedData?.rawText) {
    return evidence;
  }

  evidence.extractedData = buildExtractedData({
    fallbackDate: evidence.createdAt.slice(0, 10),
    fileName: evidence.originalFileName,
    parser: "rule_fallback",
    rawLines: [evidence.originalFileName],
    rawText: evidence.originalFileName,
    sourceLabel: "Web fallback",
  });
  evidence.parseStatus = "pending";
  saveState(state);
  return evidence;
}

export async function retryEvidenceParsing(evidenceId: string): Promise<EvidenceQueueItem | null> {
  const state = loadState();
  const evidence = state.evidences.find((item) => item.evidenceId === evidenceId);

  if (!evidence) {
    return null;
  }

  evidence.extractedData = null;
  evidence.parseStatus = "pending";
  saveState(state);
  return parseEvidence(evidenceId);
}

export async function confirmEvidenceReview(
  evidenceId: string,
  review: LedgerReviewValues,
): Promise<string> {
  const state = loadState();
  const evidence = state.evidences.find((item) => item.evidenceId === evidenceId);

  if (!evidence) {
    throw new Error("Selected evidence no longer exists.");
  }

  const amountCents = Math.round(Number.parseFloat(review.amount) * 100);

  if (!review.date || !review.description || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("date, amount, and description are required.");
  }

  evidence.capturedAmountCents = amountCents;
  evidence.capturedDate = review.date;
  evidence.capturedDescription = review.description;
  evidence.capturedSource = review.source;
  evidence.capturedTarget = review.target;
  evidence.parseStatus = "parsed";
  evidence.extractedData = buildConfirmedExtractedData(review, evidence.extractedData?.parser ?? "rule_fallback");

  const recordId = `record-${evidenceId}`;
  state.records.push({
    amountCents,
    createdAt: new Date().toISOString(),
    description: review.description,
    occurredOn: review.date,
    recordId,
    recordKind:
      review.category === "income"
        ? "income"
        : review.category === "spending"
          ? "personal_spending"
          : "expense",
    sourceLabel: review.source || defaultEntityId,
    targetLabel: review.target || review.description,
  });

  saveState(state);
  return recordId;
}

export async function loadHomeScreenSnapshot(input: {
  limit?: number;
  now?: string;
  offset?: number;
} = {}): Promise<HomeSnapshot> {
  const state = loadState();
  const now = input.now ?? new Date().toISOString().slice(0, 10);
  const monthPrefix = now.slice(0, 7);
  const offset = input.offset ?? 0;
  const limit = input.limit ?? homeRecentPageSize;
  const monthRecords = state.records.filter((record) => record.occurredOn.startsWith(monthPrefix));
  const incomeCents = monthRecords
    .filter((record) => record.recordKind === "income")
    .reduce((sum, record) => sum + record.amountCents, 0);
  const outflowCents = monthRecords
    .filter((record) => record.recordKind !== "income")
    .reduce((sum, record) => sum + record.amountCents, 0);
  const trendStart = shiftIsoDate(now, -29);
  const totalsByDate: Record<string, number> = {};

  for (const record of state.records) {
    if (record.recordKind !== "income" || record.occurredOn < trendStart || record.occurredOn > now) {
      continue;
    }

    totalsByDate[record.occurredOn] = (totalsByDate[record.occurredOn] ?? 0) + record.amountCents;
  }

  const sortedRecords = [...state.records].sort((left, right) =>
    right.occurredOn.localeCompare(left.occurredOn) || right.createdAt.localeCompare(left.createdAt),
  );
  const page = sortedRecords.slice(offset, offset + limit + 1);

  return {
    hasMore: page.length > limit,
    metrics: {
      incomeCents,
      netCents: incomeCents - outflowCents,
      outflowCents,
    },
    recentRecords: page.slice(0, limit),
    trend: createTrendPointsFromTotals(totalsByDate, now),
  };
}

function buildConfirmedExtractedData(
  review: LedgerReviewValues,
  parser: EvidenceExtractedData["parser"],
): EvidenceExtractedData {
  return {
    candidates: {
      amountCents: Math.round(Number.parseFloat(review.amount) * 100),
      category: review.category,
      date: review.date,
      description: review.description,
      notes: review.notes || null,
      source: review.source || null,
      target: review.target || null,
      taxCategory: review.taxCategory || null,
    },
    parser,
    rawLines: [],
    rawText: "",
    sourceLabel: "web-confirmed-review",
  };
}

function inferUploadKind(mimeType: string | null | undefined, fileName: string): UploadCandidate["kind"] {
  if (mimeType?.startsWith("image/") || /\.(heic|jpe?g|png)$/i.test(fileName)) {
    return "image";
  }

  return "document";
}

function shiftIsoDate(dateValue: string, offsetDays: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function createOpaqueId(seed: string): string {
  const normalizedSeed = seed.replace(/[^a-z0-9]+/gi, "").toLowerCase().slice(0, 12) || "item";
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${normalizedSeed}`;
}

function loadState(): WebRuntimeState {
  if (typeof window === "undefined" || !window.localStorage) {
    return memoryState;
  }

  const serialized = window.localStorage.getItem(storageKey);

  if (!serialized) {
    return { evidences: [], records: [] };
  }

  try {
    return JSON.parse(serialized) as WebRuntimeState;
  } catch {
    return { evidences: [], records: [] };
  }
}

function saveState(state: WebRuntimeState): void {
  memoryState = state;

  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}
