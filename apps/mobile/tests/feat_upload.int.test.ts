import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { ReceiptPlannerPayload } from "@creator-cfo/schemas";

import {
  createWritableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@creator-cfo/storage";
import {
  buildExtractedData,
  buildFailedExtractedData,
  buildRemoteExtractedData,
  type ImportedEvidenceBundle,
} from "../src/features/ledger/ledger-domain";
import {
  approveWorkflowWriteProposal,
  createExtractionRun,
  createPlannerRun,
  createUploadBatch,
  ensureDefaultEntity,
  finalizeEvidenceReview,
  insertImportedEvidenceBundle,
  loadEvidenceById,
  loadEvidenceQueue,
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
});
