import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { PlannerSummary, ReceiptParsePayload } from "@creator-cfo/schemas";
import {
  createReadableStorageDatabase,
  createWritableStorageDatabase,
  resolveStandardReceiptEntry,
  persistResolvedStandardReceiptEntry,
} from "@creator-cfo/storage";
import type { ResolvedLocale } from "../app-shell/types";

import {
  parseFileWithOpenAiFromBlob,
  planEvidenceDbUpdates,
  type ParseResult,
} from "./remote-parse";
import {
  buildRemoteExtractedData,
  defaultEntityId,
  type LedgerReviewValues,
  type WorkflowCandidateRecord,
  type WorkflowWriteProposalItem,
} from "./ledger-domain";
import {
  buildPlannerSummary,
  buildReviewValuesFromPayload,
  deriveCandidateState,
  type PlannerReadResults,
} from "./workflow-planner";
import {
  homeRecentPageSize,
  type HomeRecentRecord,
} from "./ledger-domain";
import type { HomeSnapshot } from "../home/home-data";
import { loadHomeSnapshot } from "../home/home-data";
import { getActiveWebDatabase, openWebSqliteDatabase } from "../../storage/web-sqlite";
import { initializeLocalDatabase } from "../../storage/database";
import { writeVaultFile } from "../../storage/web-file-vault";

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
): Promise<ParseResult> {
  const response = await fetch(fileUri);

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

  return parseFileWithOpenAiFromBlob({ fileName, blob, mimeType });
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

export async function runPlanner(input: {
  fileName: string;
  mimeType: string | null;
  model: string;
  parserKind?: string;
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
  });

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
    duplicateRecordIds: [],
    duplicateReceiptMatches: [],
    sourceCounterpartyMatches: [],
    sourceCounterpartySuggestions: [],
    targetCounterpartyMatches: [],
    targetCounterpartySuggestions: [],
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
  const candidateRecords: WorkflowCandidateRecord[] =
    summary.candidateRecords.map((payload, index) => {
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

  const writeProposals = buildWebWriteProposals({
    candidateId: candidateRecords[0]?.candidateId ?? null,
    candidateState: candidateRecords[0]?.state ?? "candidate",
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
    });
    releaseResolvedWebDependencies(state);
    state.batchState = "review_required";
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
    });
    rejectSiblingWebCounterpartyCreate(state, proposal);
    releaseResolvedWebDependencies(state);
    state.batchState = "review_required";
    return state;
  }

  if (proposal.proposalType === "resolve_duplicate_receipt") {
    if (state.candidateRecords[0]) {
      state.candidateRecords[0].state = "approved";
      state.candidateRecords[0].updatedAt = proposal.updatedAt;
    }

    for (const item of state.writeProposals) {
      if (
        item.writeProposalId !== writeProposalId &&
        (item.state === "pending_approval" || item.state === "blocked")
      ) {
        item.state = "rejected";
        item.updatedAt = proposal.updatedAt;
      }
    }

    state.batchState = "approved";
    return state;
  }

  if (
    proposal.proposalType === "persist_candidate_record" &&
    state.candidateRecords[0]
  ) {
    const candidate = state.candidateRecords[0];
    const now = new Date().toISOString();
    candidate.state = "persisted_final";
    candidate.updatedAt = now;

    if (review) {
      candidate.reviewValues = review;
      state.reviewValues = review;
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
          recordId: candidate.recordId ?? `record-${state.evidenceId}`,
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

    state.batchState = "rejected";
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
    state.candidateRecords[0]
  ) {
    state.candidateRecords[0].state = "rejected";
    state.candidateRecords[0].updatedAt = proposal.updatedAt;
  }

  state.batchState = "rejected";
  return state;
}

export async function loadPlannerState(
  batchId: string,
): Promise<PlannerResult | null> {
  return plannerStateStore.get(batchId) ?? null;
}

function buildWebWriteProposals(input: {
  candidateId: string | null;
  candidateState: WorkflowCandidateRecord["state"];
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
    const state =
      dependencyIds.length > 0 ||
      (proposal.proposalType === "persist_candidate_record" &&
        input.candidateState !== "validated" &&
        input.candidateState !== "needs_review")
        ? "blocked"
        : "pending_approval";

    inserted.push({ proposal, writeProposalId });

    return {
      approvalRequired: true,
      candidateId: input.candidateId,
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
  if (proposal.proposalType === "create_counterparty") {
    const role = readFirstString(proposal.values.role, proposal.role);

    return inserted
      .filter(
        (item) =>
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
          item.proposal.proposalType === "create_counterparty" ||
          item.proposal.proposalType === "merge_counterparty" ||
          item.proposal.proposalType === "resolve_duplicate_receipt",
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

function applyWebCounterpartySelection(
  state: PlannerResult,
  proposal: WorkflowWriteProposalItem,
  input: {
    counterpartyId: string;
    displayName: string | null;
  },
): void {
  const role =
    readFirstString(proposal.payload.role) === "target" ? "target" : "source";
  const displayName = input.displayName ?? "";
  const candidate = state.candidateRecords[0];

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
  candidate.reviewValues = buildReviewValuesFromPayload(candidate.payload);
  candidate.state = "validated";
  candidate.updatedAt = proposal.updatedAt;
  state.reviewValues = candidate.reviewValues;
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
    const rejectedCreateDependency = dependencyStates.some(
      (dependency) =>
        dependency.proposalType === "create_counterparty" &&
        dependency.state === "rejected",
    );

    if (allResolved && !rejectedCreateDependency) {
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
): Promise<import("./ledger-reporting").GeneralLedgerEntry[]> {
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
