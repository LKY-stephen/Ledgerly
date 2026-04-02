import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { structuredStoreContract, type StorageSqlValue } from "@creator-cfo/storage";
import {
  buildExtractedData,
  buildFailedExtractedData,
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
  return {
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).run(...params);
    },
  };
}

function createLivePhotoBundle(): ImportedEvidenceBundle {
  return {
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
      extractedData: buildExtractedData({
        fallbackDate: "2026-04-01",
        fileName: "receipt.heic",
        parser: "ios_vision_ocr",
        rawLines: ["Apple Store", "04/01/2026", "$52.99"],
        rawText: "Apple Store 04/01/2026 $52.99",
        sourceLabel: "Apple Vision OCR",
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
          captured_description AS capturedDescription
        FROM evidences
        WHERE evidence_id = ?;`,
      )
      .get("evidence-live-photo") as {
      capturedAmountCents: number;
      capturedDescription: string;
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

    expect(storedEvidence).toEqual({
      capturedAmountCents: 5299,
      capturedDescription: "Apple accessories",
      parseStatus: "parsed",
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
        failureReason: "Apple Vision OCR failed.",
        fileName: "receipt.heic",
        parser: "ios_vision_ocr",
        sourceLabel: "Apple Vision OCR",
      }),
      parseStatus: "failed",
    });

    const queue = await loadEvidenceQueue(writableDatabase);
    expect(queue[0]?.parseStatus).toBe("failed");
    expect(queue[0]?.extractedData?.failureReason).toBe("Apple Vision OCR failed.");
  });

  it("allows re-uploading the same file payload into separate evidences", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    const firstBundle = createLivePhotoBundle();
    const secondBundle: ImportedEvidenceBundle = {
      ...createLivePhotoBundle(),
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
});
