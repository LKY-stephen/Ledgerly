import { DatabaseSync } from "node:sqlite";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createReadableStorageDatabase,
  structuredStoreContract,
  loadScheduleCAggregation,
  loadScheduleSEPreview,
  scheduleCSupportedLineDefinitions,
  type StorageSqlValue,
} from "@ledgerly/storage";

import {
  buildLedgerPeriodId,
  loadLedgerSnapshot,
} from "../src/features/ledger/ledger-reporting";
import { initializeLocalDatabase } from "../src/storage/database";
import { validateDatabasePackageOrThrow } from "../src/storage/storage-package-integrity";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/sample-database-packages",
);
const packageARoot = join(fixturesRoot, "package-a-clean", "ledgerly-vault");
const packageBRoot = join(fixturesRoot, "package-b-mixed", "ledgerly-vault");
const packageCRoot = join(fixturesRoot, "package-c-grouped-ledger", "ledgerly-vault");

function createReadableDatabase(database: DatabaseSync) {
  return createReadableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
  });
}

function openDatabase(packageRoot: string) {
  return new DatabaseSync(join(packageRoot, "ledgerly-local.db"));
}

async function loadCounts(database: DatabaseSync) {
  const recordsRow = database.prepare("SELECT COUNT(*) AS count FROM records;").get() as { count: number };
  const evidencesRow = database.prepare("SELECT COUNT(*) AS count FROM evidences;").get() as { count: number };
  const filesRow = database.prepare("SELECT COUNT(*) AS count FROM evidence_files;").get() as { count: number };
  const linksRow = database.prepare("SELECT COUNT(*) AS count FROM record_evidence_links;").get() as { count: number };

  return {
    evidenceFileCount: filesRow.count,
    evidenceLinkCount: linksRow.count,
    evidenceCount: evidencesRow.count,
    recordCount: recordsRow.count,
  };
}

describe("sample database packages", () => {
  it("keeps the portable packages valid as supported legacy inputs", async () => {
    for (const packageRoot of [packageARoot, packageBRoot, packageCRoot]) {
      const database = openDatabase(packageRoot);

      try {
        const validation = await validateDatabasePackageOrThrow({
          database: createReadableDatabase(database),
          packageRoot,
          pathExists: async (absolutePath) => existsSync(absolutePath),
          tableCompatibility: "current_or_legacy",
        });
        const counts = await loadCounts(database);

        expect(validation.checkedPathCount).toBe(counts.evidenceFileCount);
        expect(validation.requiredTableCount).toBe(structuredStoreContract.tables.length);
        expect(validation.tableCompatibility).toBe("legacy");
        expect(counts.evidenceFileCount).toBe(counts.recordCount);
        expect(counts.evidenceCount).toBe(counts.recordCount);
        expect(counts.evidenceLinkCount).toBe(counts.recordCount);
      } finally {
        if (typeof database.close === "function") {
          database.close();
        }
      }
    }
  });

  it("can upgrade a legacy portable package copy to the current schema contract", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "ledgerly-sample-package-"));
    const packageRoot = join(tempRoot, "ledgerly-vault");

    cpSync(packageARoot, packageRoot, { recursive: true });

    const database = openDatabase(packageRoot);

    try {
      await initializeLocalDatabase({
        async execAsync(source: string) {
          database.exec(source);
        },
      });

      const validation = await validateDatabasePackageOrThrow({
        database: createReadableDatabase(database),
        packageRoot,
        pathExists: async (absolutePath) => existsSync(absolutePath),
        tableCompatibility: "current_only",
      });
      const versionRow = database.prepare("PRAGMA user_version;").get() as { user_version: number };

      expect(validation).toEqual({
        checkedPathCount: 24,
        requiredTableCount: structuredStoreContract.tables.length,
        tableCompatibility: "current",
      });
      expect(versionRow.user_version).toBe(structuredStoreContract.version);
    } finally {
      if (typeof database.close === "function") {
        database.close();
      }

      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("gives package A full supported Schedule C coverage and a non-null Schedule SE preview for 2025", async () => {
    const database = openDatabase(packageARoot);

    try {
      const readableDatabase = createReadableDatabase(database);
      const aggregation = await loadScheduleCAggregation(readableDatabase, {
        entityId: "entity-main",
        taxYear: 2025,
      });
      const preview = await loadScheduleSEPreview(readableDatabase, {
        entityId: "entity-main",
        taxYear: 2025,
      });

      expect(Object.keys(aggregation.lineAmounts).sort()).toEqual(
        scheduleCSupportedLineDefinitions.map((definition) => definition.lineCode).sort(),
      );
      expect(Object.keys(aggregation.lineReviewNotes)).toHaveLength(0);
      expect(aggregation.partVReviewNote).toBeNull();
      expect(preview).toMatchObject({
        currency: "USD",
        deductibleExpensesCents: 1_045_600,
        grossReceiptsCents: 1_827_000,
        netProfitCents: 781_400,
      });
      expect([...preview.includedLineCodes].sort()).toEqual(
        scheduleCSupportedLineDefinitions.map((definition) => definition.lineCode).sort(),
      );
    } finally {
      if (typeof database.close === "function") {
        database.close();
      }
    }
  });

  it("keeps package B importable while preserving a real Schedule C review boundary for 2026", async () => {
    const database = openDatabase(packageBRoot);

    try {
      const readableDatabase = createReadableDatabase(database);
      const aggregation = await loadScheduleCAggregation(readableDatabase, {
        entityId: "entity-main",
        taxYear: 2026,
      });
      const preview = await loadScheduleSEPreview(readableDatabase, {
        entityId: "entity-main",
        taxYear: 2026,
      });

      expect(aggregation.lineAmounts.line1?.amountCents).toBe(466_000);
      expect(aggregation.lineAmounts.line20a?.amountCents).toBe(70_800);
      expect(aggregation.lineAmounts.line21?.amountCents).toBe(31_000);
      expect(aggregation.lineAmounts.line27a?.amountCents).toBe(24_000);
      expect(aggregation.lineReviewNotes.line18).toContain("non-USD currency");
      expect(preview.netProfitCents).toBeNull();
      expect(preview.sourceNote).toContain("Current mapped Schedule C lines still need review");
      expect(preview.sourceNote).toContain("Office expense");
    } finally {
      if (typeof database.close === "function") {
        database.close();
      }
    }
  });

  it("ships a grouped-ledger sample package with evidence-linked repeated counterparties", async () => {
    const database = openDatabase(packageCRoot);

    try {
      const snapshot = await loadLedgerSnapshot(createReadableDatabase(database), {
        entityId: "entity-main",
        preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      });
      const evidenceLinks = database.prepare(
        `SELECT COUNT(*) AS count
         FROM record_evidence_links rel
         INNER JOIN evidences ev
           ON ev.evidence_id = rel.evidence_id
         INNER JOIN evidence_files ef
           ON ef.evidence_id = rel.evidence_id;`,
      ).get() as { count: number };

      expect(snapshot.generalLedger.recordCountLabel).toBe("3 entries");
      expect(
        snapshot.generalLedger.entries.slice(0, 3).map((entry) => ({
          amount: entry.amount,
          kind: entry.kind,
          side: entry.side,
          title: entry.title,
        })),
      ).toEqual([
        {
          amount: "$1,880.00",
          kind: "income",
          side: "mixed",
          title: "TechDaily",
        },
        {
          amount: "$1,480.00",
          kind: "income",
          side: "mixed",
          title: "Cash & Bank",
        },
        {
          amount: "-$400.00",
          kind: "expense",
          side: "debit",
          title: "Adobe",
        },
      ]);
      expect(
        snapshot.generalLedger.entries.reduce(
          (total, entry) => total + entry.signedAmountCents,
          0,
        ),
      ).toBe(0);
      expect(
        snapshot.generalLedger.entries[2]?.lines.map((line) => ({
          accountName: line.accountName,
          amount: line.amount,
          detail: line.detail,
          recordId: line.record.recordId,
          side: line.side,
        })),
      ).toEqual([
        {
          accountName: "Adobe",
          amount: "$250.00",
          detail: "Adobe Creative Cloud annual renewal",
          recordId: "pkg-c-record-02",
          side: "debit",
        },
        {
          accountName: "Adobe",
          amount: "$150.00",
          detail: "Adobe Stock add-on seats",
          recordId: "pkg-c-record-04",
          side: "debit",
        },
      ]);
      expect(evidenceLinks.count).toBe(7);
    } finally {
      if (typeof database.close === "function") {
        database.close();
      }
    }
  });
});
