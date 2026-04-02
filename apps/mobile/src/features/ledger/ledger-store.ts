import type { EvidenceExtractedData } from "@creator-cfo/schemas";
import {
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  type ReadableStorageDatabase,
  type WritableStorageDatabase,
} from "@creator-cfo/storage";

import {
  createEmptyReviewValues,
  defaultEntityId,
  type EvidenceQueueItem,
  type ImportedEvidenceBundle,
  type LedgerReviewValues,
} from "./ledger-domain";

const defaultEntitySeed = {
  baseCurrency: "USD",
  defaultTimezone: "UTC",
  entityId: defaultEntityId,
  entityType: "sole_proprietorship",
  legalName: "Creator CFO Main Entity",
} as const;

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

export async function loadEvidenceQueue(
  database: ReadableStorageDatabase,
  entityId = defaultEntityId,
): Promise<EvidenceQueueItem[]> {
  const rows = await database.getAllAsync<{
    capturedAmountCents: number;
    capturedDate: string;
    capturedDescription: string;
    capturedSource: string;
    capturedTarget: string;
    createdAt: string;
    evidenceId: string;
    evidenceKind: string;
    extractedData: string | null;
    filePath: string;
    mimeType: string | null;
    originalFileName: string;
    parseStatus: "failed" | "parsed" | "pending";
  }>(
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
      evidence_files.mime_type AS mimeType
    FROM evidences
    LEFT JOIN evidence_files
      ON evidence_files.evidence_id = evidences.evidence_id
     AND evidence_files.is_primary = 1
    WHERE evidences.entity_id = ?
      AND evidences.parse_status IN ('pending', 'failed')
    ORDER BY evidences.created_at ASC;`,
    entityId,
  );

  return rows.map((row) => ({
    ...row,
    extractedData: row.extractedData ? (JSON.parse(row.extractedData) as EvidenceExtractedData) : null,
  }));
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
  const entityId = input.entityId ?? defaultEntityId;
  const normalizedReview = normalizeReviewValues(input.review);
  const recordId = `record-${input.evidenceId}`;
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
    existingExtractedData?.parser ?? "rule_fallback",
    normalizedReview.failureReason,
  );
  const resolvedEntry = resolveStandardReceiptEntry(
    {
      amountCents,
      currency: "USD",
      description: normalizedReview.description,
      entityId,
      evidenceIds: [input.evidenceId],
      memo: normalizedReview.notes || null,
      occurredOn: normalizedReview.date,
      source: normalizedReview.source,
      target: normalizedReview.target,
      userClassification:
        normalizedReview.category === "income"
          ? "income"
          : normalizedReview.category === "spending"
            ? "personal_spending"
            : "expense",
    },
    {
      createdAt: input.createdAt,
      recordId,
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

  return recordId;
}

export async function loadEvidenceQueueByIds(
  database: ReadableStorageDatabase,
  evidenceIds: string[],
): Promise<EvidenceQueueItem[]> {
  if (!evidenceIds.length) {
    return [];
  }

  const placeholders = evidenceIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<{
    capturedAmountCents: number;
    capturedDate: string;
    capturedDescription: string;
    capturedSource: string;
    capturedTarget: string;
    createdAt: string;
    evidenceId: string;
    evidenceKind: string;
    extractedData: string | null;
    filePath: string;
    mimeType: string | null;
    originalFileName: string;
    parseStatus: "failed" | "parsed" | "pending";
  }>(
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
      evidence_files.mime_type AS mimeType
    FROM evidences
    LEFT JOIN evidence_files
      ON evidence_files.evidence_id = evidences.evidence_id
     AND evidence_files.is_primary = 1
    WHERE evidences.evidence_id IN (${placeholders})
    ORDER BY evidences.created_at ASC;`,
    ...evidenceIds,
  );

  return rows.map((row) => ({
    ...row,
    extractedData: row.extractedData ? (JSON.parse(row.extractedData) as EvidenceExtractedData) : null,
  }));
}

function buildConfirmedExtractedData(
  review: ReturnType<typeof normalizeReviewValues>,
  parser: EvidenceExtractedData["parser"],
  failureReason: string | null,
): EvidenceExtractedData {
  return {
    candidates: {
      amountCents: Math.round(Number.parseFloat(review.amountValue) * 100),
      category: review.category,
      date: review.date,
      description: review.description,
      notes: review.notes || null,
      source: review.source,
      target: review.target,
      taxCategory: review.taxCategory || null,
    },
    failureReason,
    parser,
    rawLines: [],
    rawText: "",
    sourceLabel: "confirmed_review",
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
