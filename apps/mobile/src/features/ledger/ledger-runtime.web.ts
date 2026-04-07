import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { JsonValue, PlannerSummary, ReceiptPlannerPayload } from "@creator-cfo/schemas";

import { parseFileWithOpenAiFromBlob, planEvidenceDbUpdates, type ParseResult } from "./remote-parse";
import {
  buildExtractedData,
  type LedgerReviewValues,
  type WorkflowCandidateRecord,
  type WorkflowWriteProposalItem,
} from "./ledger-domain";
import { buildPlannerSummary, buildReviewValuesFromPayload, deriveCandidateState, type PlannerReadResults } from "./workflow-planner";
import { createTrendPointsFromTotals, homeRecentPageSize, type HomeRecentRecord } from "./ledger-domain";
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

const plannerStateStore = new Map<string, PlannerResult>();

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
    kind: inferUploadKind(asset.mimeType ?? null, asset.name ?? ""),
    mimeType: asset.mimeType ?? null,
    originalFileName: asset.name ?? `document-${index + 1}`,
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

export async function parseFile(
  fileUri: string,
  fileName: string,
  mimeType: string | null,
): Promise<ParseResult> {
  const response = await fetch(fileUri);

  if (!response.ok) {
    return {
      rawJson: null,
      rawText: "",
      model: "",
      error: `Unable to read selected file: ${response.status}`,
    };
  }

  const blob = await response.blob();
  return parseFileWithOpenAiFromBlob({ fileName, blob, mimeType });
}

export async function loadHomeScreenSnapshot(input: {
  limit?: number;
  now?: string;
  offset?: number;
} = {}): Promise<HomeSnapshot> {
  const now = input.now ?? new Date().toISOString().slice(0, 10);
  const offset = input.offset ?? 0;
  const limit = input.limit ?? homeRecentPageSize;
  const records = loadRecords();
  const monthStart = `${now.slice(0, 7)}-01`;
  const monthEnd = endOfMonth(now);
  const trendStart = shiftIsoDate(now, -29);
  const metricRows = records.filter((r) => r.occurredOn >= monthStart && r.occurredOn <= monthEnd);
  const incomeCents = metricRows.filter((r) => r.recordKind === "income").reduce((s, r) => s + r.amountCents, 0);
  const outflowCents = metricRows.filter((r) => r.recordKind !== "income").reduce((s, r) => s + r.amountCents, 0);
  const trendRows = records.filter((r) => r.recordKind === "income" && r.occurredOn >= trendStart && r.occurredOn <= now);
  const totalsByDate = Object.fromEntries(
    trendRows.map((row) => [row.occurredOn, trendRows.filter((r) => r.occurredOn === row.occurredOn).reduce((s, r) => s + r.amountCents, 0)]),
  );

  return {
    hasMore: records.length > offset + limit,
    metrics: { incomeCents, netCents: incomeCents - outflowCents, outflowCents },
    recentRecords: records.slice(offset, offset + limit),
    trend: createTrendPointsFromTotals(totalsByDate, now),
  };
}

export async function runPlanner(input: {
  fileName: string;
  mimeType: string | null;
  model: string;
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
    rawJson: input.rawJson,
  });

  // Build extracted data for planner summary
  const extractedData = buildExtractedData({
    fallbackDate: now.slice(0, 10),
    fileName: input.fileName,
    parser: "openai_gpt",
    rawLines: input.rawText.split("\n").filter((l) => l.trim()),
    rawText: input.rawText,
    sourceLabel: "openai_upload",
  });
  extractedData.model = input.model;
  extractedData.originData = input.rawJson as JsonValue;

  // Build read results (empty for web - no local DB)
  const readResults: PlannerReadResults = {
    duplicateRecordIds: [],
    sourceCounterpartyMatches: [],
    targetCounterpartyMatches: [],
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

  // Build candidate records and write proposals for UI
  const candidateRecords: WorkflowCandidateRecord[] = summary.candidateRecords.map((payload, index) => {
    const candidateId = `${plannerRunId}-candidate-${index + 1}`;
    const state = deriveCandidateState({
      duplicateHints: summary.duplicateHints,
      payload,
      resolutions: summary.counterpartyResolutions,
    });

    return {
      candidateId,
      createdAt: now,
      errorMessage: null,
      payload,
      recordId: null,
      reviewValues: buildReviewValuesFromPayload(payload),
      state,
      updatedAt: now,
    };
  });

  const counterpartyProposalIds: string[] = [];
  const writeProposals: WorkflowWriteProposalItem[] = summary.writeProposals.map((proposal, index) => {
    const writeProposalId = `${plannerRunId}-proposal-${index + 1}`;
    const isCounterparty = proposal.proposalType === "create_counterparty";

    if (isCounterparty) {
      counterpartyProposalIds.push(writeProposalId);
    }

    const isPersist = proposal.proposalType === "persist_candidate_record";
    const isBlocked = isPersist && counterpartyProposalIds.length > 0;

    return {
      approvalRequired: true,
      candidateId: candidateRecords[0]?.candidateId ?? null,
      createdAt: now,
      dependencyIds: isPersist ? [...counterpartyProposalIds.slice(0, -1)] : [],
      payload: proposal.values,
      proposalType: proposal.proposalType,
      rationale: isCounterparty
        ? "Parsed label does not match an existing local counterparty, so creation requires approval."
        : "Candidate record is ready for final persistence after approval and local validation.",
      state: isBlocked ? "blocked" : "pending_approval",
      updatedAt: now,
      writeProposalId,
    };
  });

  const primaryCandidate = candidateRecords[0];

  const result: PlannerResult = {
    batchId,
    batchState: "write_proposal_ready",
    candidateRecords,
    error: null,
    evidenceId,
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

  plannerStateStore.set(batchId, result);
  return result;
}

export async function approveWriteProposal(
  batchId: string,
  writeProposalId: string,
  review?: LedgerReviewValues,
): Promise<PlannerResult> {
  const state = plannerStateStore.get(batchId);

  if (!state) {
    throw new Error("Planner state not found for batch.");
  }

  const proposalIndex = state.writeProposals.findIndex((p) => p.writeProposalId === writeProposalId);
  const proposal = state.writeProposals[proposalIndex];

  if (!proposal) {
    throw new Error("Write proposal not found.");
  }

  // Mark proposal as executed
  proposal.state = "executed";
  proposal.updatedAt = new Date().toISOString();

  if (proposal.proposalType === "create_counterparty") {
    // Unblock dependent proposals
    for (const p of state.writeProposals) {
      if (p.dependencyIds.includes(writeProposalId) && p.state === "blocked") {
        const allDepsExecuted = p.dependencyIds.every(
          (depId) => state.writeProposals.find((wp) => wp.writeProposalId === depId)?.state === "executed",
        );

        if (allDepsExecuted) {
          p.state = "pending_approval";
          p.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  if (proposal.proposalType === "persist_candidate_record" && state.candidateRecords[0]) {
    state.candidateRecords[0].state = "persisted_final";
    state.candidateRecords[0].updatedAt = new Date().toISOString();

    if (review) {
      state.candidateRecords[0].reviewValues = review;
      state.reviewValues = review;
    }

    state.batchState = "approved";
  }

  return state;
}

export async function rejectWriteProposal(
  batchId: string,
  writeProposalId: string,
): Promise<PlannerResult> {
  const state = plannerStateStore.get(batchId);

  if (!state) {
    throw new Error("Planner state not found for batch.");
  }

  const proposal = state.writeProposals.find((p) => p.writeProposalId === writeProposalId);

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
  }

  if (proposal.proposalType === "persist_candidate_record" && state.candidateRecords[0]) {
    state.candidateRecords[0].state = "rejected";
  }

  state.batchState = "rejected";
  return state;
}

export async function loadPlannerState(batchId: string): Promise<PlannerResult | null> {
  return plannerStateStore.get(batchId) ?? null;
}

function inferUploadKind(mimeType: string | null, fileName: string): UploadCandidate["kind"] {
  const normalized = `${mimeType ?? ""} ${fileName}`.toLowerCase();
  if (normalized.includes("pdf")) return "document";
  if (normalized.includes("live")) return "live_photo";
  return "image";
}

function endOfMonth(dateValue: string): string {
  const date = new Date(`${dateValue.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(dateValue: string, offsetDays: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const storageKey = "creator-cfo-web-records-v1";

function loadRecords(): HomeRecentRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as HomeRecentRecord[];
  } catch {
    return [];
  }
}

export function resetLedgerWebRuntimeStateForTests() {
  plannerStateStore.clear();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(storageKey);
  }
}
