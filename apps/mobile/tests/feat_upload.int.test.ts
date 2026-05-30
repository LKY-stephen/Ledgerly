import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { ReceiptPlannerPayload } from "@ledgerly/schemas";

import {
  createWritableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@ledgerly/storage";
import {
  buildExtractedData,
  buildFailedExtractedData,
  buildRemoteExtractedData,
  type ImportedEvidenceBundle,
} from "../src/features/ledger/ledger-domain";
import {
  buildFailedBatchClearPlan,
  clearFailedBatchRecords,
  approveWorkflowWriteProposal,
  createExtractionRun,
  createPlannerRun,
  createUploadBatch,
  ensureDefaultEntity,
  finalizeEvidenceReview,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  loadEvidenceQueue,
  reconcileInactiveReviewBatch,
  updateUploadBatchState,
  rejectWorkflowWriteProposal,
  savePlannerArtifacts,
  updateEvidenceExtraction,
} from "../src/features/ledger/ledger-store";

function createStorageDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  for (const statement of structuredStoreContract.maintenanceStatements) {
    database.exec(statement);
  }

  return database;
}

function createWritableDatabase(database: DatabaseSync) {
  return createWritableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).run(...params);
    },
  });
}

function createLivePhotoBundle(): ImportedEvidenceBundle {
  return {
    batchId: "batch-live-photo",
    capturedAt: "2026-04-01T09:00:00.000Z",
    entityId: "entity-main",
    evidenceId: "evidence-live-photo",
    evidenceKind: "live_photo",
    filePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_primary.heic",
    files: [
      {
        capturedAt: "2026-04-01T09:00:00.000Z",
        evidenceFileId: "evidence-file-primary",
        isPrimary: true,
        mimeType: "image/heic",
        originalFileName: "receipt.heic",
        relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_primary.heic",
        sha256Hex: "abc123",
        sizeBytes: 100,
        vaultCollection: "evidence-objects",
      },
      {
        capturedAt: "2026-04-01T09:00:00.000Z",
        evidenceFileId: "evidence-file-motion",
        isPrimary: false,
        mimeType: "video/quicktime",
        originalFileName: "receipt.mov",
        relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_motion.mov",
        sha256Hex: "def456",
        sizeBytes: 200,
        vaultCollection: "evidence-objects",
      },
    ],
    sourceSystem: "feat-upload-test",
  };
}

function createReceiptBundle(input: {
  batchId: string;
  capturedAt: string;
  evidenceId: string;
  evidenceKind?: string;
  fileName: string;
  filePath: string;
}): ImportedEvidenceBundle {
  return {
    batchId: input.batchId,
    capturedAt: input.capturedAt,
    entityId: "entity-main",
    evidenceId: input.evidenceId,
    evidenceKind: input.evidenceKind ?? "receipt_document",
    filePath: input.filePath,
    files: [
      {
        capturedAt: input.capturedAt,
        evidenceFileId: `${input.evidenceId}-file-primary`,
        isPrimary: true,
        mimeType: "application/pdf",
        originalFileName: input.fileName,
        relativePath: input.filePath,
        sha256Hex: `${input.evidenceId}-hash`,
        sizeBytes: 1_024,
        vaultCollection: "evidence-objects",
      },
    ],
    sourceSystem: "feat-upload-test",
  };
}

function createPlannerPayload(evidenceId: string): ReceiptPlannerPayload {
  return {
    businessEvents: ["Receipt payment"],
    candidateRecords: [
      {
        amountCents: 5299,
        currency: "USD",
        date: "2026-02-27",
        description: "Apple Store accessories",
        evidenceId,
        recordKind: "expense",
        sourceLabel: "Business Card",
        targetLabel: "Apple Store",
      },
    ],
    classifiedFacts: [
      {
        confidence: "high",
        field: "amountCents",
        reason: "Amount printed on the receipt.",
        status: "confirmed",
        value: 5299,
      },
    ],
    counterpartyResolutions: [
      {
        confidence: "high",
        displayName: "Business Card",
        matchedDisplayNames: [],
        matchedCounterpartyIds: [],
        role: "source",
        status: "proposed_new",
      },
      {
        confidence: "medium",
        displayName: "Apple Store",
        matchedDisplayNames: [],
        matchedCounterpartyIds: [],
        role: "target",
        status: "proposed_new",
      },
    ],
    duplicateHints: [],
    readTasks: [
      {
        readTaskId: "read-1",
        rationale: "Look up source counterparty.",
        status: "pending",
        taskType: "counterparty_lookup",
      },
      {
        readTaskId: "read-2",
        rationale: "Check for duplicate receipts.",
        status: "pending",
        taskType: "duplicate_lookup",
      },
    ],
    summary: "One expense record from the uploaded receipt.",
    warnings: [],
    writeProposals: [
      {
        proposalType: "create_counterparty",
        role: "source",
        values: { displayName: "Business Card", role: "source" },
      },
      {
        proposalType: "create_counterparty",
        role: "target",
        values: { displayName: "Apple Store", role: "target" },
      },
      {
        proposalType: "persist_candidate_record",
        reviewFields: ["amount", "date", "source", "target"],
        values: { candidateIndex: 0 },
      },
    ],
  };
}

async function seedCounterparty(
  database: ReturnType<typeof createWritableDatabase>,
  input: {
    counterpartyId: string;
    displayName: string;
    role: "source" | "target";
  },
) {
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
    input.counterpartyId,
    "entity-main",
    input.role,
    input.displayName,
    input.displayName,
    "seeded for workflow tests",
    "2026-02-27T08:00:00.000Z",
  );
}

async function seedConflictingReceiptEvidence(
  database: DatabaseSync,
  writableDatabase: ReturnType<typeof createWritableDatabase>,
) {
  const bundle = createReceiptBundle({
    batchId: "batch-existing-duplicate",
    capturedAt: "2026-02-27T08:30:00.000Z",
    evidenceId: "evidence-existing-duplicate",
    fileName: "receipt-2026-02-27.pdf",
    filePath: "evidence-objects/entity-main/uploads/2026/02/receipt-2026-02-27.pdf",
  });
  await insertImportedEvidenceBundle(writableDatabase, bundle);

  for (let index = 0; index < 5; index += 1) {
    const recordId = `record-existing-${index + 1}`;

    await writableDatabase.runAsync(
      `INSERT INTO records (
        record_id,
        entity_id,
        record_status,
        source_system,
        description,
        memo,
        occurred_on,
        currency,
        amount_cents,
        source_label,
        target_label,
        source_counterparty_id,
        target_counterparty_id,
        record_kind,
        category_code,
        subcategory_code,
        tax_category_code,
        tax_line_code,
        business_use_bps,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      recordId,
      "entity-main",
      "posted",
      "duplicate-fixture",
      index === 0 ? "Apple Store accessories" : `Linked line ${index + 1}`,
      null,
      "2026-02-27",
      "USD",
      index === 0 ? 5299 : 100 + index,
      "Business Card",
      index === 0 ? "Apple Store" : `Linked target ${index + 1}`,
      null,
      null,
      "expense",
      null,
      null,
      null,
      null,
      10_000,
      `2026-02-27T08:3${index}:00.000Z`,
      `2026-02-27T08:3${index}:00.000Z`,
    );
    database.prepare(
      `INSERT INTO record_evidence_links (
        record_id,
        evidence_id,
        link_role,
        is_primary,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
    ).run(recordId, "evidence-existing-duplicate", "supporting", index === 0 ? 1 : 0, `2026-02-27T08:3${index}:00.000Z`);
  }
}

describe("feat_upload data flow", () => {
  it("stores upload metadata, preserves live-photo pairs, and finalizes reviewed records", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "uploaded",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      evidenceId: "evidence-live-photo",
      filePath: bundle.filePath,
      parseStatus: "pending",
    });

    const evidenceFiles = database
      .prepare(
        `SELECT
          evidence_id AS evidenceId,
          is_primary AS isPrimary,
          relative_path AS relativePath
        FROM evidence_files
        WHERE evidence_id = ?
        ORDER BY is_primary DESC, relative_path ASC;`,
      )
      .all("evidence-live-photo") as Array<{
      evidenceId: string;
      isPrimary: number;
      relativePath: string;
    }>;

    expect(evidenceFiles).toEqual([
      {
        evidenceId: "evidence-live-photo",
        isPrimary: 1,
        relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_primary.heic",
      },
      {
        evidenceId: "evidence-live-photo",
        isPrimary: 0,
        relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_motion.mov",
      },
    ]);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-live-photo",
      extractedData: buildRemoteExtractedData({
        fileName: "receipt.heic",
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-04-01",
            description: "Apple accessories",
            notes: null,
            source: "Business card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-04-01",
            description: "Apple accessories",
            notes: null,
            source: "Business card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 04/01/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-04-01",
                description: "Apple accessories",
                notes: null,
                source: "Business card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-04-01",
                description: "Apple accessories",
                notes: null,
                source: "Business card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {
          amount_cents: 5299,
          description: "Apple accessories",
          memo: "",
          occurred_on: "2026-04-01",
          record_kind: "expense",
          source_label: "Business card",
          target_label: "Apple Store",
          tax_category_code: "office",
        },
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });

    const recordId = await finalizeEvidenceReview(writableDatabase, {
      createdAt: "2026-04-01T09:10:00.000Z",
      evidenceId: "evidence-live-photo",
      review: {
        amount: "52.99",
        category: "expense",
        date: "2026-04-01",
        description: "Apple accessories",
        notes: "Reviewed on device",
        source: "Business card",
        target: "Apple Store",
        taxCategory: "office",
      },
      sourceSystem: "feat-upload-test",
    });

    expect(recordId).toBe("record-evidence-live-photo");

    const storedEvidence = database
      .prepare(
        `SELECT
          parse_status AS parseStatus,
          captured_amount_cents AS capturedAmountCents,
          captured_description AS capturedDescription,
          extracted_data AS extractedData
        FROM evidences
        WHERE evidence_id = ?;`,
      )
      .get("evidence-live-photo") as {
      capturedAmountCents: number;
      capturedDescription: string;
      extractedData: string;
      parseStatus: string;
    };
    const storedLink = database
      .prepare(
        `SELECT
          record_id AS recordId,
          evidence_id AS evidenceId,
          is_primary AS isPrimary
        FROM record_evidence_links
        WHERE evidence_id = ?;`,
      )
      .get("evidence-live-photo") as {
      evidenceId: string;
      isPrimary: number;
      recordId: string;
    };

    expect(storedEvidence).toMatchObject({
      capturedAmountCents: 5299,
      capturedDescription: "Apple accessories",
      parseStatus: "parsed",
    });
    expect(JSON.parse(storedEvidence.extractedData)).toMatchObject({
      originData: {
        fields: {
          amountCents: 5299,
          description: "Apple accessories",
        },
      },
      scheme: {
        amount_cents: 5299,
        description: "Apple accessories",
      },
    });
    expect(storedLink).toEqual({
      evidenceId: "evidence-live-photo",
      isPrimary: 1,
      recordId: "record-evidence-live-photo",
    });
  });

  it("keeps failed OCR items retryable in the parse queue", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "failed",
    });

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-live-photo",
      extractedData: buildFailedExtractedData({
        fallbackDate: "2026-04-01",
        failureReason: "Remote GPT parsing failed.",
        fileName: "receipt.heic",
        parser: "openai_gpt",
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "failed",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue[0]?.parseStatus).toBe("failed");
    expect(queue[0]?.extractedData?.failureReason).toBe("Remote GPT parsing failed.");
  });

  it("moves a retried failed batch back into the in-progress queue immediately", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "failed",
    });
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildFailedExtractedData({
        fallbackDate: "2026-04-01",
        failureReason: "Remote GPT parsing failed.",
        fileName: "receipt.heic",
        parser: "openai_gpt",
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "failed",
    });

    await updateUploadBatchState(writableDatabase, {
      batchId: bundle.batchId,
      duplicateKind: null,
      errorMessage: null,
      state: "parsing",
      updatedAt: "2026-04-01T09:01:00.000Z",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue[0]?.displayState).toBe("recovering");
    expect(queue[0]?.sectionId).toBe("in_progress");
    expect(queue[0]?.errorMessage).toBeNull();
  });

  it("clears a failed batch completely when no persisted records depend on it", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "failed",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-failed-clear",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-failed-clear",
      plannerRunId: "planner-failed-clear",
    });
    await writableDatabase.runAsync(
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
      "audit-failed-clear",
      bundle.batchId,
      "planner-failed-clear",
      null,
      null,
      "planner_failed",
      "Planner failed for fixture.",
      null,
      bundle.capturedAt,
    );
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildFailedExtractedData({
        fallbackDate: "2026-04-01",
        failureReason: "Remote GPT parsing failed.",
        fileName: "receipt.heic",
        parser: "openai_gpt",
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "failed",
    });

    const plan = await buildFailedBatchClearPlan(writableDatabase, bundle.batchId);

    expect(plan.keepEvidenceRecord).toBe(false);
    expect(plan.filePathsToDelete).toEqual(bundle.files.map((file) => file.relativePath));

    await clearFailedBatchRecords(writableDatabase, plan);

    const remainingEvidence = database
      .prepare("SELECT COUNT(*) AS count FROM evidences WHERE evidence_id = ?;")
      .get(bundle.evidenceId) as { count: number };
    const remainingFiles = database
      .prepare("SELECT COUNT(*) AS count FROM evidence_files WHERE evidence_id = ?;")
      .get(bundle.evidenceId) as { count: number };
    const remainingBatches = database
      .prepare("SELECT COUNT(*) AS count FROM upload_batches WHERE batch_id = ?;")
      .get(bundle.batchId) as { count: number };
    const remainingAudits = database
      .prepare("SELECT COUNT(*) AS count FROM workflow_audit_events WHERE batch_id = ?;")
      .get(bundle.batchId) as { count: number };

    expect(remainingEvidence.count).toBe(0);
    expect(remainingFiles.count).toBe(0);
    expect(remainingBatches.count).toBe(0);
    expect(remainingAudits.count).toBe(0);
    expect(await loadEvidenceQueue(writableDatabase)).toHaveLength(0);
  });

  it("keeps shared evidence rows when clearing a failed batch that already supports persisted records", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "failed",
    });
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildFailedExtractedData({
        fallbackDate: "2026-04-01",
        failureReason: "Planner failed after partial success.",
        fileName: "receipt.heic",
        parser: "openai_gpt",
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "failed",
    });
    await writableDatabase.runAsync(
      `INSERT INTO records (
        record_id,
        entity_id,
        record_status,
        source_system,
        description,
        memo,
        occurred_on,
        currency,
        amount_cents,
        source_label,
        target_label,
        source_counterparty_id,
        target_counterparty_id,
        record_kind,
        category_code,
        subcategory_code,
        tax_category_code,
        tax_line_code,
        business_use_bps,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "record-preserved-1",
      "entity-main",
      "posted",
      "fixture",
      "Preserved record",
      null,
      "2026-04-01",
      "USD",
      5299,
      "Business Card",
      "Apple Store",
      null,
      null,
      "expense",
      null,
      null,
      null,
      null,
      10_000,
      "2026-04-01T09:12:00.000Z",
      "2026-04-01T09:12:00.000Z",
    );
    await writableDatabase.runAsync(
      `INSERT INTO record_evidence_links (
        record_id,
        evidence_id,
        link_role,
        is_primary,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
      "record-preserved-1",
      bundle.evidenceId,
      "primary",
      1,
      "2026-04-01T09:12:00.000Z",
    );

    const plan = await buildFailedBatchClearPlan(writableDatabase, bundle.batchId);

    expect(plan.keepEvidenceRecord).toBe(true);
    expect(plan.filePathsToDelete).toEqual([]);

    await clearFailedBatchRecords(writableDatabase, plan);

    const remainingEvidence = database
      .prepare(
        "SELECT parse_status AS parseStatus FROM evidences WHERE evidence_id = ?;",
      )
      .get(bundle.evidenceId) as { parseStatus: string };
    const remainingFiles = database
      .prepare("SELECT COUNT(*) AS count FROM evidence_files WHERE evidence_id = ?;")
      .get(bundle.evidenceId) as { count: number };
    const remainingLinks = database
      .prepare(
        "SELECT COUNT(*) AS count FROM record_evidence_links WHERE evidence_id = ?;",
      )
      .get(bundle.evidenceId) as { count: number };
    const remainingBatches = database
      .prepare("SELECT COUNT(*) AS count FROM upload_batches WHERE batch_id = ?;")
      .get(bundle.batchId) as { count: number };

    expect(remainingEvidence.parseStatus).toBe("parsed");
    expect(remainingFiles.count).toBe(bundle.files.length);
    expect(remainingLinks.count).toBe(1);
    expect(remainingBatches.count).toBe(0);
    expect(await loadEvidenceQueue(writableDatabase)).toHaveLength(0);
  });

  it("preserves queued work even when another batch is already review-ready", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const readyBundle = createReceiptBundle({
      batchId: "batch-ready",
      capturedAt: "2026-04-01T09:00:00.000Z",
      evidenceId: "evidence-ready",
      fileName: "ready.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/04/ready.pdf",
    });
    const queuedBundle = createReceiptBundle({
      batchId: "batch-queued",
      capturedAt: "2026-04-02T09:00:00.000Z",
      evidenceId: "evidence-queued",
      fileName: "queued.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/04/queued.pdf",
    });

    await ensureDefaultEntity(writableDatabase, readyBundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, readyBundle);
    await createUploadBatch(writableDatabase, {
      batchId: readyBundle.batchId,
      createdAt: readyBundle.capturedAt,
      evidenceId: readyBundle.evidenceId,
      sourceSystem: readyBundle.sourceSystem,
      state: "review_required",
    });

    await insertImportedEvidenceBundle(writableDatabase, queuedBundle);
    await createUploadBatch(writableDatabase, {
      batchId: queuedBundle.batchId,
      createdAt: queuedBundle.capturedAt,
      evidenceId: queuedBundle.evidenceId,
      sourceSystem: queuedBundle.sourceSystem,
      state: "uploaded",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue).toHaveLength(2);
    expect(
      queue.some(
        (item) =>
          item.evidenceId === "evidence-ready" &&
          item.sectionId === "needs_review",
      ),
    ).toBe(true);
    expect(
      queue.some(
        (item) =>
          item.evidenceId === "evidence-queued" && item.sectionId === "queued",
      ),
    ).toBe(true);
    expect(
      queue.find((item) => item.sectionId === "queued")?.evidenceId,
    ).toBe("evidence-queued");
  });

  it("allows re-uploading the same file payload into separate evidences", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const firstBundle = createLivePhotoBundle();
    const secondBundle: ImportedEvidenceBundle = {
      ...createLivePhotoBundle(),
      batchId: "batch-live-photo-duplicate",
      evidenceId: "evidence-live-photo-duplicate",
      filePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_primary_copy.heic",
      files: [
        {
          ...createLivePhotoBundle().files[0]!,
          evidenceFileId: "evidence-file-primary-duplicate",
          relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_primary_copy.heic",
        },
        {
          ...createLivePhotoBundle().files[1]!,
          evidenceFileId: "evidence-file-motion-duplicate",
          relativePath: "evidence-objects/entity-main/uploads/2026/04/entity-main_motion_copy.mov",
        },
      ],
    };

    await ensureDefaultEntity(writableDatabase, firstBundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, firstBundle);
    await insertImportedEvidenceBundle(writableDatabase, secondBundle);

    const evidenceFileCount = database
      .prepare("SELECT COUNT(*) AS count FROM evidence_files;")
      .get() as { count: number };

    expect(evidenceFileCount.count).toBe(4);
  });

  it("keeps extracted data intact when record persistence fails during review confirmation", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createLivePhotoBundle();
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);

    const parsedResult = buildExtractedData({
      fallbackDate: "2026-04-01",
      fileName: "receipt.heic",
      parser: "openai_gpt",
      rawLines: ["Apple Store", "04/01/2026", "$52.99"],
      rawText: "Apple Store 04/01/2026 $52.99",
      sourceLabel: "OpenAI GPT",
    });

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: "evidence-live-photo",
      extractedData: parsedResult,
      parseStatus: "pending",
    });

    await writableDatabase.runAsync(
      `INSERT INTO records (
        record_id,
        entity_id,
        record_status,
        source_system,
        description,
        memo,
        occurred_on,
        currency,
        amount_cents,
        source_label,
        target_label,
        source_counterparty_id,
        target_counterparty_id,
        record_kind,
        category_code,
        subcategory_code,
        tax_category_code,
        tax_line_code,
        business_use_bps,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "record-evidence-live-photo",
      "entity-main",
      "posted",
      "test-conflict",
      "Existing record",
      null,
      "2026-04-01",
      "USD",
      100,
      "Conflict source",
      "Conflict target",
      null,
      null,
      "expense",
      null,
      null,
      null,
      null,
      10_000,
      "2026-04-01T08:59:00.000Z",
      "2026-04-01T08:59:00.000Z",
    );

    await expect(
      finalizeEvidenceReview(writableDatabase, {
        createdAt: "2026-04-01T09:10:00.000Z",
        evidenceId: "evidence-live-photo",
        review: {
          amount: "52.99",
          category: "expense",
          date: "2026-04-01",
          description: "Apple accessories",
          notes: "Reviewed on device",
          source: "Business card",
          target: "Apple Store",
          taxCategory: "office",
        },
        sourceSystem: "feat-upload-test",
      }),
    ).rejects.toThrow();

    const storedEvidence = database
      .prepare(
        `SELECT
          parse_status AS parseStatus,
          extracted_data AS extractedData
        FROM evidences
        WHERE evidence_id = ?;`,
      )
      .get("evidence-live-photo") as {
      extractedData: string;
      parseStatus: string;
    };
    const parsedEvidence = JSON.parse(storedEvidence.extractedData);
    const recordLinkCount = database
      .prepare("SELECT COUNT(*) AS count FROM record_evidence_links WHERE evidence_id = ?;")
      .get("evidence-live-photo") as { count: number };

    expect(storedEvidence.parseStatus).toBe("pending");
    expect(parsedEvidence).toMatchObject({
      fields: parsedResult.fields,
      rawText: parsedResult.rawText,
      sourceLabel: "OpenAI GPT",
    });
    expect(recordLinkCount.count).toBe(0);
  });

  it("keeps duplicate and counterparty decisions durable when the operator chooses keep separate and keep new", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-duplicate-decision",
      capturedAt: "2026-02-27T09:00:00.000Z",
      evidenceId: "evidence-duplicate-decision",
      fileName: "receipt-feb-27.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/02/receipt-feb-27.pdf",
    });

    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-source-existing",
      displayName: "Business Card",
      role: "source",
    });
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-target-existing",
      displayName: "Apple Store LLC",
      role: "target",
    });
    await seedConflictingReceiptEvidence(database, writableDatabase);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });

    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: "feat-upload-test",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-decision",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-decision",
      plannerRunId: "planner-duplicate-decision",
    });

    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-duplicate-decision",
      remotePlan: createPlannerPayload(bundle.evidenceId),
    });

    let evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidence?.writeProposals).toHaveLength(4);
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt")?.state).toBe("pending_approval");
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "merge_counterparty")?.state).toBe("pending_approval");
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty")?.state).toBe("blocked");
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state).toBe("blocked");

    const mergeProposal = evidence!.writeProposals.find((proposal) => proposal.proposalType === "merge_counterparty");
    const duplicateProposal = evidence!.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt");
    const createProposal = evidence!.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty");
    const persistProposal = evidence!.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record");

    await rejectWorkflowWriteProposal(writableDatabase, {
      updatedAt: "2026-02-27T09:05:00.000Z",
      writeProposalId: mergeProposal!.writeProposalId,
    });
    evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "create_counterparty")?.state).toBe("pending_approval");
    expect(evidence?.batchState).toBe("review_required");

    await rejectWorkflowWriteProposal(writableDatabase, {
      updatedAt: "2026-02-27T09:06:00.000Z",
      writeProposalId: duplicateProposal!.writeProposalId,
    });
    evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state).toBe("blocked");

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: bundle.evidenceId,
      updatedAt: "2026-02-27T09:07:00.000Z",
      writeProposalId: createProposal!.writeProposalId,
    });
    evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidence?.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state).toBe("pending_approval");

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: bundle.evidenceId,
      review: {
        amount: "52.99",
        category: "expense",
        date: "2026-02-27",
        description: "Apple Store accessories",
        notes: "keep separate and keep new",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
      updatedAt: "2026-02-27T09:08:00.000Z",
      writeProposalId: persistProposal!.writeProposalId,
    });
    evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidence?.batchState).toBe("approved");
    expect(evidence?.candidateRecords[0]?.state).toBe("persisted_final");
  });

  it("merges duplicate receipts by linking the new evidence onto the existing five related records", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-duplicate-merge",
      capturedAt: "2026-02-27T10:00:00.000Z",
      evidenceId: "evidence-duplicate-merge",
      fileName: "receipt-feb-27-duplicate.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/02/receipt-feb-27-duplicate.pdf",
    });

    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-source-existing",
      displayName: "Business Card",
      role: "source",
    });
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-target-existing",
      displayName: "Apple Store",
      role: "target",
    });
    await seedConflictingReceiptEvidence(database, writableDatabase);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });

    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: "feat-upload-test",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-merge",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-merge",
      plannerRunId: "planner-duplicate-merge",
    });

    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-duplicate-merge",
      remotePlan: createPlannerPayload(bundle.evidenceId),
    });

    const evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    const duplicateProposal = evidence?.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt");
    expect(duplicateProposal?.payload).toMatchObject({
      duplicateReceiptLabel: "receipt-2026-02-27.pdf",
      matchedRecords: [
        expect.objectContaining({
          amountCents: 5299,
          date: "2026-02-27",
          description: "Apple Store accessories",
          recordId: "record-existing-1",
          sourceLabel: "Business Card",
          targetLabel: "Apple Store",
        }),
      ],
      overlapEntryCount: 5,
    });

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: bundle.evidenceId,
      updatedAt: "2026-02-27T10:05:00.000Z",
      writeProposalId: duplicateProposal!.writeProposalId,
    });

    const linkedRow = database
      .prepare("SELECT COUNT(*) AS count FROM record_evidence_links WHERE evidence_id = ?;")
      .get(bundle.evidenceId) as { count: number };
    const mergedEvidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(linkedRow.count).toBe(5);
    expect(mergedEvidence?.batchState).toBe("approved");
    expect(mergedEvidence?.candidateRecords[0]?.state).toBe("approved");
    expect(
      mergedEvidence?.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record")?.state,
    ).toBe("rejected");
  });

  it("replaces the older duplicate record set when the operator keeps the new record", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-duplicate-keep-new",
      capturedAt: "2026-02-27T10:30:00.000Z",
      evidenceId: "evidence-duplicate-keep-new",
      fileName: "receipt-feb-27-keep-new.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/02/receipt-feb-27-keep-new.pdf",
    });

    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-source-existing",
      displayName: "Business Card",
      role: "source",
    });
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-target-existing",
      displayName: "Apple Store",
      role: "target",
    });
    await seedConflictingReceiptEvidence(database, writableDatabase);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });

    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: "feat-upload-test",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-keep-new",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-keep-new",
      plannerRunId: "planner-duplicate-keep-new",
    });

    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-duplicate-keep-new",
      remotePlan: createPlannerPayload(bundle.evidenceId),
    });

    const evidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    const duplicateProposal = evidence?.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt");

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: bundle.evidenceId,
      options: {
        duplicateResolution: { keepMode: "keep_new" },
      },
      review: {
        amount: "52.99",
        category: "expense",
        date: "2026-02-27",
        description: "Apple Store accessories",
        notes: "keep new duplicate",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
      updatedAt: "2026-02-27T10:35:00.000Z",
      writeProposalId: duplicateProposal!.writeProposalId,
    });

    const finalEvidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    const totalRecords = database
      .prepare("SELECT COUNT(*) AS count FROM records;")
      .get() as { count: number };
    const replacedOlderRecords = database
      .prepare("SELECT COUNT(*) AS count FROM records WHERE record_id LIKE 'record-existing-%';")
      .get() as { count: number };
    const linkedCurrentEvidence = database
      .prepare("SELECT COUNT(*) AS count FROM record_evidence_links WHERE evidence_id = ?;")
      .get(bundle.evidenceId) as { count: number };
    const linkedExistingEvidence = database
      .prepare("SELECT COUNT(*) AS count FROM record_evidence_links WHERE evidence_id = ?;")
      .get("evidence-existing-duplicate") as { count: number };

    expect(totalRecords.count).toBe(1);
    expect(replacedOlderRecords.count).toBe(0);
    expect(linkedCurrentEvidence.count).toBe(1);
    expect(linkedExistingEvidence.count).toBe(1);
    expect(finalEvidence?.batchState).toBe("approved");
    expect(finalEvidence?.candidateRecords[0]?.state).toBe("persisted_final");
    expect(finalEvidence?.candidateRecords[0]?.recordId).toBe(
      `record-${bundle.evidenceId}`,
    );
  });

  it("removes a fully approved review item from the active queue", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-queue-approved",
      capturedAt: "2026-04-01T09:00:00.000Z",
      evidenceId: "evidence-queue-approved",
      fileName: "queue-approved.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/04/queue-approved.pdf",
    });
    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: bundle.sourceSystem,
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-queue-approved",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-queue-approved",
      plannerRunId: "planner-queue-approved",
    });

    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-queue-approved",
      remotePlan: {
        businessEvents: ["Receipt payment"],
        candidateRecords: [
          {
            amountCents: 5299,
            currency: "USD",
            date: "2026-02-27",
            description: "Apple Store accessories",
            evidenceId: bundle.evidenceId,
            recordKind: "expense",
            sourceLabel: "Business Card",
            targetLabel: "Apple Store",
          },
        ],
        classifiedFacts: [],
        counterpartyResolutions: [],
        duplicateHints: [],
        readTasks: [
          {
            readTaskId: "read-queue-approved-counterparty",
            rationale: "Check local counterparties.",
            status: "pending",
            taskType: "counterparty_lookup",
          },
          {
            readTaskId: "read-queue-approved-1",
            rationale: "Check local matches.",
            status: "pending",
            taskType: "duplicate_lookup",
          },
        ],
        summary: "One expense record from the uploaded receipt.",
        warnings: [],
        writeProposals: [
          {
            proposalType: "persist_candidate_record",
            reviewFields: ["amount", "date", "source", "target"],
            values: { candidateIndex: 0 },
          },
        ],
      },
    });

    let queue = await loadEvidenceQueue(writableDatabase);
    expect(queue.some((item) => item.batchId === bundle.batchId)).toBe(true);

    const persistProposal = (await loadEvidenceById(
      writableDatabase,
      bundle.evidenceId,
    ))!.writeProposals.find((proposal) => proposal.proposalType === "persist_candidate_record");

    await approveWorkflowWriteProposal(writableDatabase, {
      evidenceId: bundle.evidenceId,
      review: {
        amount: "52.99",
        category: "expense",
        date: "2026-02-27",
        description: "Apple Store accessories",
        notes: "approved from queue",
        source: "Business Card",
        target: "Apple Store",
        taxCategory: "office",
      },
      updatedAt: "2026-04-01T09:06:00.000Z",
      writeProposalId: persistProposal!.writeProposalId,
    });

    queue = await loadEvidenceQueue(writableDatabase);
    expect(queue.some((item) => item.batchId === bundle.batchId)).toBe(false);
  });

  it("removes a duplicate review item from the active queue after keep-separate skip", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-duplicate-skip",
      capturedAt: "2026-02-27T11:00:00.000Z",
      evidenceId: "evidence-duplicate-skip",
      fileName: "receipt-feb-27-skip.pdf",
      filePath: "evidence-objects/entity-main/uploads/2026/02/receipt-feb-27-skip.pdf",
    });

    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-source-existing",
      displayName: "Business Card",
      role: "source",
    });
    await seedCounterparty(writableDatabase, {
      counterpartyId: "counterparty-target-existing",
      displayName: "Apple Store",
      role: "target",
    });
    await seedConflictingReceiptEvidence(database, writableDatabase);

    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });

    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: "feat-upload-test",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-skip",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-duplicate-skip",
      plannerRunId: "planner-duplicate-skip",
    });

    const evidenceBeforeSave = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-duplicate-skip",
      remotePlan: createPlannerPayload(bundle.evidenceId),
    });

    let queue = await loadEvidenceQueue(writableDatabase);
    const queueItem = queue.find((item) => item.batchId === bundle.batchId);
    expect(queueItem?.displayState).toBe("ready_for_review");
    expect(queueItem?.displayStepLabel).toBe("Review duplicate match");

    const duplicateProposal = (await loadEvidenceById(
      writableDatabase,
      bundle.evidenceId,
    ))!.writeProposals.find((proposal) => proposal.proposalType === "resolve_duplicate_receipt");
    expect(duplicateProposal).toBeDefined();

    await rejectWorkflowWriteProposal(writableDatabase, {
      updatedAt: "2026-02-27T11:05:00.000Z",
      writeProposalId: duplicateProposal!.writeProposalId,
    });

    const skippedEvidence = await loadEvidenceById(writableDatabase, bundle.evidenceId);
    expect(skippedEvidence?.batchState).toBe("approved");
    expect(skippedEvidence?.candidateRecords[0]?.state).toBe("approved");

    queue = await loadEvidenceQueue(writableDatabase);
    expect(queue.some((item) => item.batchId === bundle.batchId)).toBe(false);
  });

  it("auto-archives a review batch when no actionable proposals remain", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const bundle = createReceiptBundle({
      batchId: "batch-no-action-left",
      capturedAt: "2026-02-27T12:00:00.000Z",
      evidenceId: "evidence-no-action-left",
      fileName: "receipt-no-action-left.pdf",
      filePath:
        "evidence-objects/entity-main/uploads/2026/02/receipt-no-action-left.pdf",
    });

    await ensureDefaultEntity(writableDatabase, bundle.capturedAt);
    await insertImportedEvidenceBundle(writableDatabase, bundle);
    await updateEvidenceExtraction(writableDatabase, {
      evidenceId: bundle.evidenceId,
      extractedData: buildRemoteExtractedData({
        fileName: bundle.files[0]!.originalFileName,
        parsePayload: {
          candidates: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          fields: {
            amountCents: 5299,
            category: "expense",
            date: "2026-02-27",
            description: "Apple Store accessories",
            notes: null,
            source: "Business Card",
            target: "Apple Store",
            taxCategory: "office",
          },
          model: "gpt-5",
          parser: "openai_gpt",
          rawSummary: "Apple Store receipt",
          rawText: "Apple Store 02/27/2026 $52.99",
          records: [
            {
              candidates: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
              fields: {
                amountCents: 5299,
                category: "expense",
                date: "2026-02-27",
                description: "Apple Store accessories",
                notes: null,
                source: "Business Card",
                target: "Apple Store",
                taxCategory: "office",
              },
            },
          ],
          warnings: [],
        },
        scheme: {},
        sourceLabel: "OpenAI GPT",
      }),
      parseStatus: "pending",
    });
    await createUploadBatch(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      sourceSystem: "feat-upload-test",
      state: "parse_complete",
    });
    await createExtractionRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-no-action-left",
    });
    await createPlannerRun(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidenceId: bundle.evidenceId,
      extractionRunId: "extraction-no-action-left",
      plannerRunId: "planner-no-action-left",
    });

    const evidenceBeforeSave = await loadEvidenceById(
      writableDatabase,
      bundle.evidenceId,
    );
    expect(evidenceBeforeSave).not.toBeNull();

    await savePlannerArtifacts(writableDatabase, {
      batchId: bundle.batchId,
      createdAt: bundle.capturedAt,
      evidence: evidenceBeforeSave!,
      plannerRunId: "planner-no-action-left",
      remotePlan: {
        businessEvents: ["Receipt payment"],
        candidateRecords: [
          {
            amountCents: 5299,
            currency: "USD",
            date: "2026-02-27",
            description: "Apple Store accessories",
            evidenceId: bundle.evidenceId,
            recordKind: "expense",
            sourceLabel: "Business Card",
            targetLabel: "Apple Store",
          },
        ],
        classifiedFacts: [],
        counterpartyResolutions: [],
        duplicateHints: [],
        readTasks: [
          {
            readTaskId: "read-no-action-left-1",
            rationale: "Lookup counterparties.",
            status: "pending",
            taskType: "counterparty_lookup",
          },
          {
            readTaskId: "read-no-action-left-2",
            rationale: "Check duplicate receipts.",
            status: "pending",
            taskType: "duplicate_lookup",
          },
        ],
        summary: "One expense record from the uploaded receipt.",
        warnings: [],
        writeProposals: [
          {
            proposalType: "persist_candidate_record",
            reviewFields: ["amount", "date", "source", "target"],
            values: { candidateIndex: 0 },
          },
        ],
      },
    });

    await writableDatabase.runAsync(
      `UPDATE workflow_write_proposals
       SET state = 'rejected',
           updated_at = ?
       WHERE planner_run_id = ?;`,
      "2026-02-27T12:04:00.000Z",
      "planner-no-action-left",
    );
    await writableDatabase.runAsync(
      `UPDATE candidate_records
       SET state = 'validated',
           updated_at = ?
       WHERE batch_id = ?;`,
      "2026-02-27T12:04:00.000Z",
      bundle.batchId,
    );

    await reconcileInactiveReviewBatch(writableDatabase, {
      batchId: bundle.batchId,
      updatedAt: "2026-02-27T12:05:00.000Z",
    });

    const archivedEvidence = await loadEvidenceById(
      writableDatabase,
      bundle.evidenceId,
    );
    expect(archivedEvidence?.batchState).toBe("approved");
    expect(archivedEvidence?.candidateRecords[0]?.state).toBe("approved");
    expect(
      archivedEvidence?.writeProposals.some(
        (proposal) => proposal.state === "pending_approval",
      ),
    ).toBe(false);

    await reconcileInactiveReviewBatch(writableDatabase, {
      batchId: bundle.batchId,
      updatedAt: "2026-02-27T12:05:00.000Z",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue.some((item) => item.batchId === bundle.batchId)).toBe(false);
  });
});
