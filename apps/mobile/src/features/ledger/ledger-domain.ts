import type { EvidenceExtractedData, EvidenceFieldCandidates, EvidenceParserKind } from "@creator-cfo/schemas";

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
  capturedAmountCents: number;
  capturedDate: string;
  capturedDescription: string;
  capturedSource: string;
  capturedTarget: string;
  createdAt: string;
  evidenceId: string;
  evidenceKind: string;
  extractedData: EvidenceExtractedData | null;
  filePath: string;
  mimeType: string | null;
  originalFileName: string;
  parseStatus: "failed" | "parsed" | "pending";
}

export interface ImportedEvidenceBundle {
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
  const timestamp = capturedAt.replace(/[-:.TZ]/g, "").slice(0, 14) || "00000000000000";
  const hashSuffix = sha256Hex.trim().toLowerCase().slice(0, 10) || "0000000000";

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
  const normalizedText = input.rawText.trim() || normalizedLines.join("\n").trim() || input.fileName;
  const candidates = extractFieldCandidates(normalizedText, normalizedLines, input.fileName, input.fallbackDate);

  return {
    candidates,
    parser: input.parser,
    rawLines: normalizedLines,
    rawText: normalizedText,
    sourceLabel: input.sourceLabel,
  };
}

export function buildFailedExtractedData(input: {
  fallbackDate: string;
  failureReason: string;
  fileName: string;
  parser: EvidenceParserKind;
  sourceLabel: string;
}): EvidenceExtractedData {
  return {
    candidates: extractFieldCandidates("", [], input.fileName, input.fallbackDate),
    failureReason: input.failureReason,
    parser: input.parser,
    rawLines: [],
    rawText: "",
    sourceLabel: input.sourceLabel,
  };
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

export function deriveReviewValues(item: EvidenceQueueItem): LedgerReviewValues {
  const candidates = item.extractedData?.candidates;
  const amountCents = candidates?.amountCents ?? item.capturedAmountCents;
  const description = candidates?.description ?? item.capturedDescription;
  const source = candidates?.source ?? item.capturedSource;
  const target = candidates?.target ?? item.capturedTarget;
  const taxCategory = candidates?.taxCategory ?? "";
  const notes = candidates?.notes ?? item.extractedData?.failureReason ?? "";

  return {
    amount: amountCents > 0 ? formatCentsInput(amountCents) : "",
    category: deriveLedgerCategory(candidates),
    date: candidates?.date ?? item.capturedDate,
    description: description || stripExtension(item.originalFileName),
    notes,
    source: source || "",
    target: target || "",
    taxCategory,
  };
}

export function deriveLedgerCategory(candidates: EvidenceFieldCandidates | undefined): LedgerCategory {
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

export function formatDisplayDate(dateValue: string): string {
  if (!dateValue) {
    return "Pending date";
  }

  const parsed = new Date(`${dateValue}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function createTrendPointsFromTotals(
  totalsByDate: Record<string, number>,
  endingOn: string,
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
      label: current.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    });
  }

  return points;
}

function extractFieldCandidates(
  rawText: string,
  rawLines: string[],
  fileName: string,
  fallbackDate: string,
): EvidenceFieldCandidates {
  const descriptionLine =
    rawLines.find((line) => line.length > 3 && !/\d{2,}/.test(line.slice(0, 3))) ??
    stripExtension(fileName);
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
  const matches = value.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\d+(?:\.\d{2})/g);

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
  if (/(payout|deposit|income|revenue|settlement|payment received)/.test(lowerText)) {
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

function getFileExtension(fileName: string): string | null {
  const match = /\.(?<extension>[a-z0-9]+)$/i.exec(fileName);
  return match?.groups?.extension?.toLowerCase() ?? null;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
}
