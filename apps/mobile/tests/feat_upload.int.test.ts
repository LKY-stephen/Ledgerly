import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

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
  ensureDefaultEntity,
  finalizeEvidenceReview,
  insertImportedEvidenceBundle,
  loadEvidenceQueue,
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
});
