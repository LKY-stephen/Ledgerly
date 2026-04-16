import type {
  CandidateRecordPayload,
  CandidateRecordState,
  CounterpartyResolution,
  DuplicateKind,
  EvidenceExtractedData,
  EvidenceFieldCandidates,
  EvidenceParserKind,
  JsonValue,
  PlannerReadTask,
  PlannerSummary,
  ParseEvidenceScheme,
  ReceiptParsePayload,
  UploadBatchState,
  WorkflowWriteProposalState,
} from "@creator-cfo/schemas";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import type { ResolvedLocale } from "../app-shell/types";
import {
  formatLedgerDisplayDate,
  formatTrendPointLabel,
} from "./ledger-localization";

export const defaultEntityId = "entity-main";
export const homeRecentPageSize = 20;

export type LedgerCategory = "expense" | "income" | "spending";

export interface LedgerReviewValues {
  amount: string;
  category: LedgerCategory;
  date: string;
  description: string;
  notes: string;
  source: string;
  target: string;
  taxCategory: string;
}

export interface EvidenceQueueItem {
  batchCreatedAt: string;
  batchId: string;
  batchState: UploadBatchState;
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
  extractedData: EvidenceExtractedData | null;
  filePath: string;
  mimeType: string | null;
  originalFileName: string;
  parseStatus: "failed" | "parsed" | "pending";
  plannerRunId: string | null;
  plannerSummary: PlannerSummary | null;
  readTasks: PlannerReadTask[];
  resolutions: CounterpartyResolution[];
  writeProposals: WorkflowWriteProposalItem[];
  candidateRecords: WorkflowCandidateRecord[];
}

export interface ImportedEvidenceBundle {
  batchId: string;
  capturedAt: string;
  entityId: string;
  evidenceId: string;
  evidenceKind: string;
  filePath: string;
  files: ImportedEvidenceFile[];
  sourceSystem: string;
}

export interface ImportedEvidenceFile {
  capturedAt: string;
  evidenceFileId: string;
  isPrimary: boolean;
  mimeType: string | null;
  originalFileName: string;
  relativePath: string;
  sha256Hex: string;
  sizeBytes: number | null;
  vaultCollection: "evidence-objects";
}

export interface WorkflowWriteProposalItem {
  approvalRequired: boolean;
  candidateId: string | null;
  createdAt: string;
  dependencyIds: string[];
  payload: Record<string, JsonValue>;
  proposalType:
    | "create_counterparty"
    | "merge_counterparty"
    | "persist_candidate_record"
    | "resolve_duplicate_receipt"
    | "update_candidate_record"
    | "update_workflow_state";
  rationale: string;
  state: WorkflowWriteProposalState;
  updatedAt: string;
  writeProposalId: string;
}

export interface WorkflowCandidateRecord {
  candidateId: string;
  createdAt: string;
  errorMessage: string | null;
  payload: CandidateRecordPayload;
  recordId: string | null;
  reviewValues: LedgerReviewValues;
  state: CandidateRecordState;
  updatedAt: string;
}

export interface HomeMetricSnapshot {
  incomeCents: number;
  netCents: number;
  outflowCents: number;
}

export interface HomeRecentRecord {
  amountCents: number;
  createdAt: string;
  description: string;
  occurredOn: string;
  recordId: string;
  recordKind: "expense" | "income" | "personal_spending";
  sourceLabel: string;
  targetLabel: string;
}

export interface HomeTrendPoint {
  amountCents: number;
  date: string;
  label: string;
}

export function buildStoredUploadFileName(
  entityId: string,
  capturedAt: string,
  sha256Hex: string,
  originalFileName: string,
): string {
  const extension = getFileExtension(originalFileName) ?? "bin";
  const timestamp =
    capturedAt.replace(/[-:.TZ]/g, "").slice(0, 14) || "00000000000000";
  const hashSuffix =
    sha256Hex.trim().toLowerCase().slice(0, 10) || "0000000000";

  return `${entityId}_${timestamp}_${hashSuffix}.${extension}`;
}

export function buildExtractedData(input: {
  fallbackDate: string;
  fileName: string;
  parser: EvidenceParserKind;
  rawLines: string[];
  rawText: string;
  sourceLabel: string;
}): EvidenceExtractedData {
  const normalizedLines = input.rawLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const normalizedText =
    input.rawText.trim() || normalizedLines.join("\n").trim() || input.fileName;
  const fields = extractFieldCandidates(
    normalizedText,
    normalizedLines,
    input.fileName,
    input.fallbackDate,
  );

  return {
    candidates: fields,
    fields,
    model: null,
    originData: null,
    parser: input.parser,
    rawLines: normalizedLines,
    rawSummary: normalizedText.slice(0, 160),
    rawText: normalizedText,
    sourceLabel: input.sourceLabel,
    warnings: [],
  };
}

export function buildFailedExtractedData(input: {
  errorReason?: string | null;
  fallbackDate: string;
  failureReason: string;
  fileName: string;
  originData?: JsonValue | null;
  parser: EvidenceParserKind;
  scheme?: ParseEvidenceScheme;
  sourceLabel: string;
}): EvidenceExtractedData {
  const rawText = input.originData
    ? JSON.stringify(input.originData, null, 2).trim()
    : "";
  const rawLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const fields = extractFieldCandidates(
    rawText,
    rawLines,
    input.fileName,
    input.fallbackDate,
  );

  return {
    candidates: fields,
    errorReason: input.errorReason ?? null,
    failureReason: input.failureReason,
    fields,
    model: null,
    originData: input.originData ?? null,
    parser: input.parser,
    rawLines,
    rawSummary: rawText ? rawText.slice(0, 160) : input.failureReason,
    rawText,
    scheme: input.scheme,
    sourceLabel: input.sourceLabel,
    warnings: [],
  };
}

export function buildRemoteExtractedData(input: {
  fileName: string;
  parsePayload: ReceiptParsePayload;
  scheme: ParseEvidenceScheme;
  sourceLabel: string;
}): EvidenceExtractedData {
  const rawLines = input.parsePayload.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const fields = normalizeFields(
    input.parsePayload.fields,
    input.parsePayload.fields.date,
    input.fileName,
  );
  const candidates = normalizeFields(
    input.parsePayload.candidates,
    input.parsePayload.candidates.date,
    input.fileName,
  );

  return {
    candidates,
    fields,
    model: input.parsePayload.model,
    originData: input.parsePayload as unknown as JsonValue,
    parser: input.parsePayload.parser,
    rawLines,
    rawSummary: input.parsePayload.rawSummary.trim(),
    rawText: input.parsePayload.rawText.trim(),
    scheme: input.scheme,
    sourceLabel: input.sourceLabel,
    warnings: input.parsePayload.warnings,
  };
}

export function buildRecordSchemeTemplate(): ParseEvidenceScheme {
  const createStatement = getLocalStorageBootstrapPlan().structuredTables.find(
    (table) => table.name === "records",
  )?.createStatement;

  if (!createStatement) {
    throw new Error("Unable to locate the records table contract.");
  }

  const scheme: ParseEvidenceScheme = {};

  for (const field of extractRecordTableFields(createStatement)) {
    scheme[field] = "";
  }

  return scheme;
}

export function createEmptyReviewValues(): LedgerReviewValues {
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

export function deriveReviewValues(
  item: EvidenceQueueItem,
): LedgerReviewValues {
  const candidateRecord = item.candidateRecords[0];
  const candidatePayload = candidateRecord?.payload;
  const candidates =
    item.extractedData?.fields ?? item.extractedData?.candidates;
  const amountCents =
    candidatePayload?.amountCents ??
    candidates?.amountCents ??
    item.capturedAmountCents;
  const description =
    candidatePayload?.description ??
    candidates?.description ??
    item.capturedDescription;
  const source =
    candidatePayload?.sourceLabel ?? candidates?.source ?? item.capturedSource;
  const target =
    candidatePayload?.targetLabel ?? candidates?.target ?? item.capturedTarget;
  const taxCategory =
    candidatePayload?.taxCategoryCode ?? candidates?.taxCategory ?? "";
  const notes =
    candidates?.notes ??
    item.extractedData?.failureReason ??
    item.plannerSummary?.warnings.join("\n") ??
    "";
  const occurredOn =
    candidatePayload?.date ?? candidates?.date ?? item.capturedDate;
  const recordKind = candidatePayload?.recordKind;

  return {
    amount: amountCents > 0 ? formatCentsInput(amountCents) : "",
    category:
      recordKind === "income"
        ? "income"
        : recordKind === "personal_spending"
          ? "spending"
          : deriveLedgerCategory(candidates),
    date: occurredOn,
    description: description || stripExtension(item.originalFileName),
    notes,
    source: source || "",
    target: target || "",
    taxCategory,
  };
}

export function deriveLedgerCategory(
  candidates: EvidenceFieldCandidates | undefined,
): LedgerCategory {
  const category = candidates?.category?.trim().toLowerCase();

  if (category === "income") {
    return "income";
  }

  if (category === "spending" || category === "personal_spending") {
    return "spending";
  }

  return "expense";
}

export function parseAmountInputToCents(value: string): number | null {
  const normalized = value.replace(/[^0-9.-]+/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function formatCurrencyFromCents(amountCents: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  });

  return formatter.format(amountCents / 100);
}

export function formatExtractedDataJson(
  extractedData: EvidenceExtractedData | null | undefined,
): string {
  if (!extractedData) {
    return "";
  }

  return JSON.stringify(extractedData, null, 2);
}

export function formatFirstParsePayloadJson(
  extractedData: EvidenceExtractedData | null | undefined,
): string {
  if (!extractedData?.originData) {
    return "";
  }

  return JSON.stringify(extractedData.originData, null, 2);
}

export function prioritizeEvidenceQueue(
  queue: EvidenceQueueItem[],
  focusEvidenceId: string | null | undefined,
): EvidenceQueueItem[] {
  const normalizedFocusEvidenceId = focusEvidenceId?.trim();

  if (!normalizedFocusEvidenceId) {
    return queue;
  }

  const focusedIndex = queue.findIndex(
    (item) => item.evidenceId === normalizedFocusEvidenceId,
  );

  if (focusedIndex <= 0) {
    return queue;
  }

  const focusedItem = queue[focusedIndex];

  if (!focusedItem) {
    return queue;
  }

  return [
    focusedItem,
    ...queue.slice(0, focusedIndex),
    ...queue.slice(focusedIndex + 1),
  ].sort((left, right) =>
    (right.batchCreatedAt ?? right.createdAt).localeCompare(
      left.batchCreatedAt ?? left.createdAt,
    ),
  );
}

export function formatDisplayDate(
  dateValue: string,
  locale: ResolvedLocale = "en",
): string {
  return formatLedgerDisplayDate(dateValue, locale);
}

export function createTrendPointsFromTotals(
  totalsByDate: Record<string, number>,
  endingOn: string,
  locale: ResolvedLocale = "en",
): HomeTrendPoint[] {
  const endDate = new Date(`${endingOn}T00:00:00Z`);
  const points: HomeTrendPoint[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const current = new Date(endDate);
    current.setUTCDate(endDate.getUTCDate() - offset);
    const date = current.toISOString().slice(0, 10);
    points.push({
      amountCents: totalsByDate[date] ?? 0,
      date,
      label: formatTrendPointLabel(date, locale),
    });
  }

  return points;
}

export function createTrendPointsFromDailyTotals(
  totalsByDate: Record<string, number>,
  endingOn: string,
  locale: ResolvedLocale = "en",
): HomeTrendPoint[] {
  return createTrendPointsFromTotals(totalsByDate, endingOn, locale);
}

function extractFieldCandidates(
  rawText: string,
  rawLines: string[],
  fileName: string,
  fallbackDate: string,
): EvidenceFieldCandidates {
  const descriptionLine =
    rawLines.find(
      (line) => line.length > 3 && !/\d{2,}/.test(line.slice(0, 3)),
    ) ?? stripExtension(fileName);
  const normalizedText = rawText || rawLines.join("\n");
  const lowerText = normalizedText.toLowerCase();

  return {
    amountCents: extractAmountCents(normalizedText),
    category: inferCategory(lowerText),
    date: extractIsoDate(normalizedText) ?? fallbackDate,
    description: descriptionLine,
    notes: null,
    source: inferSource(rawLines),
    target: inferTarget(rawLines),
    taxCategory: lowerText.includes("meal") ? "meals" : null,
  };
}

function extractAmountCents(value: string): number | null {
  const matches = value.match(
    /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\d+(?:\.\d{2})/g,
  );

  if (!matches?.length) {
    return null;
  }

  const parsed = matches
    .map((match) => Number.parseFloat(match.replace(/[^0-9.]+/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (!parsed.length) {
    return null;
  }

  return Math.round(Math.max(...parsed) * 100);
}

function extractIsoDate(value: string): string | null {
  const isoMatch = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);

  if (isoMatch) {
    return isoMatch[0];
  }

  const slashMatch = value.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);

  if (!slashMatch) {
    return null;
  }

  const month = slashMatch[1]?.padStart(2, "0");
  const day = slashMatch[2]?.padStart(2, "0");
  const year = slashMatch[3];

  return `${year}-${month}-${day}`;
}

function inferCategory(lowerText: string): string {
  if (
    /(payout|deposit|income|revenue|settlement|payment received)/.test(
      lowerText,
    )
  ) {
    return "income";
  }

  if (/(personal|family|gift)/.test(lowerText)) {
    return "spending";
  }

  return "expense";
}

function inferSource(lines: string[]): string | null {
  return lines[1] ?? null;
}

function inferTarget(lines: string[]): string | null {
  return lines[0] ?? null;
}

function formatCentsInput(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function normalizeFields(
  fields: EvidenceFieldCandidates,
  fallbackDate: string | null | undefined,
  fileName: string,
): EvidenceFieldCandidates {
  return {
    amountCents: fields.amountCents,
    category: fields.category,
    date: fields.date ?? fallbackDate ?? null,
    description: fields.description ?? stripExtension(fileName),
    notes: fields.notes,
    source: fields.source,
    target: fields.target,
    taxCategory: fields.taxCategory,
  };
}

function extractRecordTableFields(createStatement: string): string[] {
  const fields: string[] = [];

  for (const rawLine of createStatement.split("\n")) {
    const line = rawLine.trim();

    if (
      !line ||
      line.startsWith("CREATE TABLE") ||
      line.startsWith(");") ||
      line.startsWith("FOREIGN KEY")
    ) {
      continue;
    }

    const match = /^([a-z_]+)\s+/i.exec(line);

    if (match?.[1]) {
      fields.push(match[1]);
    }
  }

  return fields;
}

function getFileExtension(fileName: string): string | null {
  const match = /\.(?<extension>[a-z0-9]+)$/i.exec(fileName);
  return match?.groups?.extension?.toLowerCase() ?? null;
}

function stripExtension(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
